/**
 * ParticleManager - Handles particle effects (dust, atmosphere, etc.)
 * Ported from Shadows of the Stabilisation Point setupParticles.js
 * Reads configuration from story.json particles section
 */

export class ParticleManager {
  constructor() {
    this.particles = null
    this.config = null
    this.scene = null
  }

  /**
   * Initialize particles from story config
   * @param {THREE.Scene} scene - Three.js scene to add particles to
   * @param {object} config - Particle configuration from story.json
   */
  init(scene, config = {}) {
    this.scene = scene
    this.config = config

    const count = config.count ?? 2000
    const color = parseInt(
      (config.color || 'cccccc').replace('#', '').replace('0x', ''),
      16
    )
    const size = config.size ?? 0.005
    const opacity = config.opacity ?? 0.3

    // Area defines the spawn volume
    const area = config.area || {}
    const width = area.width || 4
    const height = area.height || 1.5
    const depth = area.depth || 4
    const offsetX = area.offsetX || 0
    const offsetY = area.offsetY || 0
    const offsetZ = area.offsetZ || 0

    const minX = area.minX ?? -width / 2 + offsetX,
      maxX = area.maxX ?? width / 2 + offsetX
    const minY = area.minY ?? -height + offsetY,
      maxY = area.maxY ?? offsetY
    const minZ = area.minZ ?? offsetZ,
      maxZ = area.maxZ ?? depth + offsetZ
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)

    for (let i = 0; i < count * 3; i += 3) {
      positions[i] = Math.random() * (maxX - minX) + minX
      positions[i + 1] = Math.random() * (maxY - minY) + minY
      positions[i + 2] = Math.random() * (maxZ - minZ) + minZ
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    // Blending mode
    const blendingModes = {
      additive: THREE.AdditiveBlending,
      normal: THREE.NormalBlending,
      subtractive: THREE.SubtractiveBlending,
      multiply: THREE.MultiplyBlending
    }
    const blending =
      blendingModes[config.blending || 'additive'] || THREE.AdditiveBlending

    const material = new THREE.PointsMaterial({
      color: color,
      size: size,
      transparent: true,
      opacity: opacity,
      blending: blending,
      depthWrite: false
    })

    this.particles = new THREE.Points(geometry, material)
    scene.add(this.particles)

    console.log(`ParticleManager: Initialized ${count} particles`)
  }

  /**
   * Update particle positions each frame
   * Particles slowly rotate and drift upward, resetting when they exceed the max height
   */
  update() {
    if (!this.particles) return

    const anim = this.config?.animation || {}
    const rotationSpeed = anim.rotateY ?? anim.rotationSpeed ?? 0.0001
    const driftSpeed = anim.driftY?.speed ?? anim.driftSpeed ?? 0.0005
    const resetHeight = anim.driftY?.resetThreshold ?? anim.resetHeight ?? 3
    const resetToHeight = anim.driftY?.resetPosition ?? anim.resetToHeight ?? 1

    // Slow rotation
    this.particles.rotation.y += rotationSpeed

    // Upward drift with reset
    const positions = this.particles.geometry.attributes.position.array
    for (let i = 1; i < positions.length; i += 3) {
      positions[i] += driftSpeed
      if (positions[i] > resetHeight) {
        positions[i] = resetToHeight
      }
    }
    this.particles.geometry.attributes.position.needsUpdate = true
  }

  /**
   * Clean up particles
   */
  dispose() {
    if (this.particles) {
      if (this.scene) {
        this.scene.remove(this.particles)
      }
      this.particles.geometry.dispose()
      this.particles.material.dispose()
      this.particles = null
    }
    this.scene = null
    this.config = null
  }
}

export default ParticleManager
