/**
 * LightingManager - Handles scene lighting configuration and transitions
 * Extracted and refactored from Shadows of the Stabilisation Point
 */

export class LightingManager {
  /**
   * Create LightingManager
   * @param {THREE.Scene} scene - Three.js scene
   */
  constructor(scene) {
    this.scene = scene
    this.transitionDuration = 2000 // 2 seconds default
    this.lightTransition = null
    
    this.lights = {
      ambient: null,
      directional: null,
      hemisphere: null,
      point: [],
      spot: []
    }
    
    this.originalIntensities = {
      ambient: 0,
      directional: 0,
      hemisphere: 0
    }
  }

  /**
   * Initialize default lighting
   * @param {object} config - Lighting configuration from JSON ui.lighting
   */
  initDefaultLighting(config = {}) {
    const {
      ambientColor = 0xffffff,
      ambientIntensity = 0.5,
      directionalColor = 0xffffff,
      directionalIntensity = 0.8,
      directionalPosition = { x: 5, y: 10, z: 5 },
      hemisphereGroundColor = 0x444444,
      hemisphereSkyColor = 0xffffff,
      hemisphereIntensity = 0.4
    } = config

    // Ambient light
    const ambient = new THREE.AmbientLight(ambientColor, ambientIntensity)
    this.scene.add(ambient)
    this.lights.ambient = ambient
    this.originalIntensities.ambient = ambientIntensity

    // Directional light
    const directional = new THREE.DirectionalLight(directionalColor, directionalIntensity)
    directional.position.set(directionalPosition.x, directionalPosition.y, directionalPosition.z)
    directional.castShadow = true
    this.scene.add(directional)
    this.lights.directional = directional
    this.originalIntensities.directional = directionalIntensity

    // Hemisphere light
    const hemisphere = new THREE.HemisphereLight(hemisphereSkyColor, hemisphereGroundColor, hemisphereIntensity)
    this.scene.add(hemisphere)
    this.lights.hemisphere = hemisphere
    this.originalIntensities.hemisphere = hemisphereIntensity
  }

  /**
   * Set lights from external references (for 8th Wall integration)
   * @param {object} lightsRef - Object containing light references
   */
  setLights(lightsRef) {
    if (lightsRef.ambient) {
      this.lights.ambient = lightsRef.ambient
      this.originalIntensities.ambient = lightsRef.ambient.intensity
    }
    if (lightsRef.directional) {
      this.lights.directional = lightsRef.directional
      this.originalIntensities.directional = lightsRef.directional.intensity
    }
    if (lightsRef.hemisphere) {
      this.lights.hemisphere = lightsRef.hemisphere
      this.originalIntensities.hemisphere = lightsRef.hemisphere.intensity
    }
  }

  /**
   * Apply lighting configuration from scene
   * @param {object} lightingConfig - Lighting config from scene JSON
   */
  applySceneLighting(lightingConfig) {
    if (!lightingConfig) return

    const multipliers = {
      ambient: lightingConfig.ambient ?? 1,
      directional: lightingConfig.directional ?? 1,
      hemisphere: lightingConfig.hemisphere ?? 1
    }

    this.transitionLightIntensities(multipliers)
  }

  /**
   * Transition light intensities smoothly
   * @param {object} targetMultipliers - Target intensity multipliers
   * @param {number} duration - Transition duration in ms
   */
  transitionLightIntensities(targetMultipliers, duration = this.transitionDuration) {
    const startTime = performance.now()

    // Get current intensities
    const startIntensities = {
      ambient: this.lights.ambient?.intensity || 0,
      directional: this.lights.directional?.intensity || 0,
      hemisphere: this.lights.hemisphere?.intensity || 0
    }

    // Calculate target intensities
    const targetIntensities = {
      ambient: this.originalIntensities.ambient * (targetMultipliers.ambient ?? 1),
      directional: this.originalIntensities.directional * (targetMultipliers.directional ?? 1),
      hemisphere: this.originalIntensities.hemisphere * (targetMultipliers.hemisphere ?? 1)
    }

    const animate = () => {
      const elapsed = performance.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Ease in-out
      const easeProgress = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2

      // Update each light
      if (this.lights.ambient) {
        this.lights.ambient.intensity = startIntensities.ambient + 
          (targetIntensities.ambient - startIntensities.ambient) * easeProgress
      }
      if (this.lights.directional) {
        this.lights.directional.intensity = startIntensities.directional + 
          (targetIntensities.directional - startIntensities.directional) * easeProgress
      }
      if (this.lights.hemisphere) {
        this.lights.hemisphere.intensity = startIntensities.hemisphere + 
          (targetIntensities.hemisphere - startIntensities.hemisphere) * easeProgress
      }

      if (progress < 1) {
        this.lightTransition = requestAnimationFrame(animate)
      } else {
        this.lightTransition = null
      }
    }

    // Cancel existing transition
    if (this.lightTransition) {
      cancelAnimationFrame(this.lightTransition)
    }

    this.lightTransition = requestAnimationFrame(animate)
  }

  /**
   * Restore original lighting intensities
   */
  restoreOriginalLighting() {
    this.transitionLightIntensities({
      ambient: 1,
      directional: 1,
      hemisphere: 1
    })
  }

  /**
   * Add point light
   * @param {object} config - Point light configuration
   * @returns {THREE.PointLight} Point light
   */
  addPointLight(config = {}) {
    const {
      color = 0xffffff,
      intensity = 1,
      distance = 0,
      decay = 2,
      position = { x: 0, y: 0, z: 0 }
    } = config

    const light = new THREE.PointLight(color, intensity, distance, decay)
    light.position.set(position.x, position.y, position.z)
    this.scene.add(light)
    this.lights.point.push(light)
    
    return light
  }

  /**
   * Add spot light
   * @param {object} config - Spot light configuration
   * @returns {THREE.SpotLight} Spot light
   */
  addSpotLight(config = {}) {
    const {
      color = 0xffffff,
      intensity = 1,
      distance = 0,
      angle = Math.PI / 3,
      penumbra = 0,
      decay = 2,
      position = { x: 0, y: 0, z: 0 },
      target = { x: 0, y: 0, z: 0 }
    } = config

    const light = new THREE.SpotLight(color, intensity, distance, angle, penumbra, decay)
    light.position.set(position.x, position.y, position.z)
    light.target.position.set(target.x, target.y, target.z)
    this.scene.add(light)
    this.scene.add(light.target)
    this.lights.spot.push(light)
    
    return light
  }

  /**
   * Enable flicker effect on a light
   * @param {THREE.Light} light - Light to flicker
   * @param {object} options - Flicker options
   */
  enableFlicker(light, options = {}) {
    const {
      minIntensity = 0.3,
      maxIntensity = 1.0,
      speed = 0.1
    } = options

    const originalIntensity = light.intensity
    let time = 0

    const flicker = () => {
      time += speed
      const noise = (Math.sin(time * 10) + Math.sin(time * 7.3) + Math.sin(time * 13.7)) / 3
      const normalized = (noise + 1) / 2
      light.intensity = minIntensity + normalized * (maxIntensity - minIntensity) * originalIntensity
      
      light.userData.flickerAnimation = requestAnimationFrame(flicker)
    }

    light.userData.flickerAnimation = requestAnimationFrame(flicker)
  }

  /**
   * Disable flicker effect
   * @param {THREE.Light} light - Light to stop flickering
   */
  disableFlicker(light) {
    if (light.userData.flickerAnimation) {
      cancelAnimationFrame(light.userData.flickerAnimation)
      delete light.userData.flickerAnimation
    }
  }

  /**
   * Remove a point light
   * @param {THREE.PointLight} light - Light to remove
   */
  removePointLight(light) {
    const index = this.lights.point.indexOf(light)
    if (index > -1) {
      this.scene.remove(light)
      this.disableFlicker(light)
      this.lights.point.splice(index, 1)
    }
  }

  /**
   * Remove a spot light
   * @param {THREE.SpotLight} light - Light to remove
   */
  removeSpotLight(light) {
    const index = this.lights.spot.indexOf(light)
    if (index > -1) {
      this.scene.remove(light)
      this.scene.remove(light.target)
      this.disableFlicker(light)
      this.lights.spot.splice(index, 1)
    }
  }

  /**
   * Clean up all lights
   */
  dispose() {
    if (this.lightTransition) {
      cancelAnimationFrame(this.lightTransition)
    }

    // Remove additional lights
    this.lights.point.forEach(light => {
      this.disableFlicker(light)
      this.scene.remove(light)
    })
    this.lights.spot.forEach(light => {
      this.disableFlicker(light)
      this.scene.remove(light)
      this.scene.remove(light.target)
    })

    this.lights.point = []
    this.lights.spot = []
  }
}

export default LightingManager
