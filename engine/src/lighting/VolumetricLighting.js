/**
 * VolumetricLighting - Creates god ray / volumetric light effects
 * Ported from Shadows of the Stabilisation Point
 */

// Volumetric light shaders
const volumetricShaders = {
  vertex: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    varying float vHeightFactor;
    
    uniform float uTime;
    
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      
      float totalHeight = 5.0;
      float normalizedHeight = clamp(-vPosition.y / totalHeight, 0.0, 1.0);
      vHeightFactor = normalizedHeight;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,

  fragment: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    varying float vHeightFactor;
    
    uniform vec3 uColor;
    uniform float uIntensity;
    uniform float uTime;
    
    float fresnel(vec3 viewDirection, vec3 normal) {
      return pow(1.0 + dot(viewDirection, normal), 3.0);
    }
    
    void main() {
      vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
      float fresnelTerm = fresnel(viewDirection, vNormal);
      
      float distanceFromCenter = length(vPosition.xz);
      float radialFalloff = 1.0 - smoothstep(0.0, 1.0, distanceFromCenter);
      
      float verticalFade = 1.0 - vHeightFactor;
      float finalIntensity = fresnelTerm * radialFalloff * verticalFade * uIntensity;
      
      float pulse = sin(uTime * 2.0) * 0.5 + 0.5;
      finalIntensity *= (0.8 + 0.2 * pulse);
      
      vec3 finalColor = uColor * finalIntensity;
      
      float apexAlpha = 0.05;
      float bottomAlpha = 0.3;
      float alphaFactor = mix(apexAlpha, bottomAlpha, vHeightFactor);
      
      gl_FragColor = vec4(finalColor, finalIntensity * alphaFactor);
    }`
}

export class VolumetricLighting {
  constructor(scene) {
    this.scene = scene
    this.lights = new Map() // sceneId -> { spotlight, volumetricCone }
    this.time = 0
  }

  /**
   * Create volumetric light cone
   */
  createVolumetricCone(position, yOffset = 13.5) {
    const geometry = new THREE.CylinderGeometry(0.1, 1.5, 5, 32, 1, true)
    geometry.translate(0, -2.5, 0) // apex at local y=0

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0xFFAA55) }, // warm color
        uIntensity: { value: 0.0 },
        uTime: { value: 0 }
      },
      vertexShader: volumetricShaders.vertex,
      fragmentShader: volumetricShaders.fragment,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    })

    const cone = new THREE.Mesh(geometry, material)
    cone.scale.set(6, 6, 6)
    cone.position.copy(position)
    cone.position.y += yOffset

    return cone
  }

  /**
   * Create spotlight
   */
  createSpotlight(position) {
    const spotlight = new THREE.SpotLight(0xcccccc, 0)
    spotlight.position.copy(position)
    spotlight.position.y += 1.0
    spotlight.angle = Math.PI / 6
    spotlight.penumbra = 0.2
    spotlight.decay = 2
    spotlight.distance = 15
    spotlight.intensity = 0
    spotlight.target.position.copy(position)

    return spotlight
  }

  /**
   * Setup lighting for a scene from config
   */
  setupSceneLighting(sceneId, config, parentObject) {
    if (!config || !config.position) return null

    const position = new THREE.Vector3(config.position.x, config.position.y, config.position.z)
    
    // Create spotlight
    const spotlight = this.createSpotlight(position)
    parentObject.add(spotlight)
    parentObject.add(spotlight.target)

    // Create volumetric light if enabled
    let volumetricCone = null
    if (config.volumetric !== false) {
      const yOffset = config.volumetricOffset || 13.5
      volumetricCone = this.createVolumetricCone(position, yOffset)
      volumetricCone.material.opacity = 0
      volumetricCone.material.uniforms.uIntensity.value = 0
      parentObject.add(volumetricCone)
    }

    const lightData = {
      spotlight,
      volumetricCone,
      config
    }

    this.lights.set(sceneId, lightData)
    return lightData
  }

  /**
   * Fade in lighting for a scene
   */
  fadeIn(sceneId, duration = 1000) {
    const lightData = this.lights.get(sceneId)
    if (!lightData) return

    const { spotlight, volumetricCone } = lightData
    const maxIntensity = 1.0
    const startTime = performance.now()

    const animate = () => {
      const elapsed = performance.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const intensity = progress * maxIntensity

      if (spotlight) {
        spotlight.intensity = intensity
      }

      if (volumetricCone) {
        volumetricCone.material.opacity = intensity * 0.003
        volumetricCone.material.uniforms.uIntensity.value = intensity
      }

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    animate()
  }

  /**
   * Fade out lighting for a scene
   */
  fadeOut(sceneId, duration = 1000) {
    const lightData = this.lights.get(sceneId)
    if (!lightData) return

    const { spotlight, volumetricCone } = lightData
    const startIntensity = spotlight?.intensity || 1.0
    const startTime = performance.now()

    const animate = () => {
      const elapsed = performance.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const intensity = startIntensity * (1 - progress)

      if (spotlight) {
        spotlight.intensity = intensity
      }

      if (volumetricCone) {
        volumetricCone.material.opacity = intensity * 0.003
        volumetricCone.material.uniforms.uIntensity.value = intensity
      }

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    animate()
  }

  /**
   * Update (call in render loop for time-based effects)
   */
  update(delta) {
    this.time += delta

    this.lights.forEach((lightData) => {
      if (lightData.volumetricCone && lightData.volumetricCone.material.uniforms) {
        lightData.volumetricCone.material.uniforms.uTime.value = this.time
      }
    })
  }

  /**
   * Remove lighting for a scene
   */
  remove(sceneId) {
    const lightData = this.lights.get(sceneId)
    if (!lightData) return

    if (lightData.spotlight) {
      lightData.spotlight.parent?.remove(lightData.spotlight)
      lightData.spotlight.target?.parent?.remove(lightData.spotlight.target)
    }

    if (lightData.volumetricCone) {
      lightData.volumetricCone.parent?.remove(lightData.volumetricCone)
      lightData.volumetricCone.geometry.dispose()
      lightData.volumetricCone.material.dispose()
    }

    this.lights.delete(sceneId)
  }

  /**
   * Clean up all lights
   */
  dispose() {
    this.lights.forEach((_, sceneId) => {
      this.remove(sceneId)
    })
    this.lights.clear()
  }
}

export default VolumetricLighting
