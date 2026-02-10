/**
 * GuidedCameraController - Automatic camera positioning for guided mode
 * Reads camera keyframes from story.json and animates the camera along paths
 * synced to audio playback time.
 */

export class GuidedCameraController {
  constructor(camera, cameraRig, guidedConfig = {}) {
    this.camera = camera
    this.cameraRig = cameraRig
    this.animations = []
    this.currentAnimationId = null

    // Default animation settings
    this.defaultDuration = 2000 // ms

    // Easing functions
    this.easings = {
      quadratic: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
      cubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
      sine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    }

    // Camera positions by scene and timestamp
    this.sceneCameraPositions = {}

    // Load guided config from story.json
    this.loadConfig(guidedConfig)
  }

  /**
   * Load guided camera config from story.json
   * @param {Object} guidedConfig - camera.guided section from story.json
   *   e.g. { "scene1": [{ id, time, position, rotation, duration, easing }] }
   */
  loadConfig(guidedConfig) {
    if (!guidedConfig || typeof guidedConfig !== 'object') return

    Object.entries(guidedConfig).forEach(([sceneId, keyframes]) => {
      if (!Array.isArray(keyframes)) return

      this.sceneCameraPositions[sceneId] = []

      keyframes.forEach((kf) => {
        const positionId = kf.id || `${sceneId}-kf-${kf.time}`
        const position = new THREE.Vector3(
          kf.position?.[0] || 0,
          kf.position?.[1] || 0,
          kf.position?.[2] || 0
        )
        const quaternion = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(
            kf.rotation?.[0] || 0,
            kf.rotation?.[1] || 0,
            kf.rotation?.[2] || 0
          )
        )

        this.animations.push({
          id: positionId,
          position,
          quaternion,
          duration: kf.duration || this.defaultDuration,
          easing: kf.easing || 'quadratic',
        })

        this.sceneCameraPositions[sceneId].push({
          time: kf.time,
          positionId,
        })
      })
    })
  }

  /**
   * Start monitoring audio progress for a given scene
   * and auto-animate the camera when timestamps match
   */
  startSceneTracking(sceneId, getAudioTime) {
    this.currentSceneId = sceneId
    this.getAudioTime = getAudioTime
    this.lastTriggeredTimes = new Set()

    // Move to the first keyframe of the scene immediately
    const positions = this.sceneCameraPositions[sceneId]
    if (positions && positions.length > 0) {
      this.lastTriggeredTimes.add(positions[0].time) // Mark as triggered so _trackLoop won't double-fire
      this.playAnimation(positions[0].positionId)
    }

    // Start the check loop for subsequent keyframes
    this._trackingRaf = requestAnimationFrame(() => this._trackLoop())
  }

  _trackLoop() {
    if (!this.currentSceneId || !this.getAudioTime) return

    const currentTime = this.getAudioTime()
    const positions = this.sceneCameraPositions[this.currentSceneId] || []

    positions.forEach((pos) => {
      if (Math.abs(currentTime - pos.time) < 0.3 && !this.lastTriggeredTimes.has(pos.time)) {
        this.lastTriggeredTimes.add(pos.time)
        this.playAnimation(pos.positionId)
      }
    })

    this._trackingRaf = requestAnimationFrame(() => this._trackLoop())
  }

  stopSceneTracking() {
    this.currentSceneId = null
    this.getAudioTime = null
    if (this._trackingRaf) {
      cancelAnimationFrame(this._trackingRaf)
      this._trackingRaf = null
    }
  }

  /**
   * Get an animation definition by its ID
   */
  getAnimationById(id) {
    return this.animations.find((a) => a.id === id)
  }

  /**
   * Play a camera animation to a specific keyframe position.
   * Supports both camera-rig mode (Shadows-style) and direct camera mode (editor stories).
   */
  playAnimation(id) {
    const animation = this.getAnimationById(id)
    if (!animation) {
      console.warn(`GuidedCameraController: Animation ${id} not found`)
      return
    }

    this.currentAnimationId = id
    const duration = animation.duration || this.defaultDuration
    const easing = this.easings[animation.easing] || this.easings.quadratic
    const startTime = performance.now()

    // Determine the target object to animate: camera rig if available, otherwise the camera itself
    const target = this.cameraRig || this.camera
    const startPosition = target.position.clone()
    const startQuaternion = target.quaternion.clone()

    let targetPosition, targetQuaternion

    if (this.cameraRig) {
      // Camera rig mode: compute rig position/quaternion to achieve the desired world camera pose
      // (ported from original camera-rig-controls.js calculateCameraRigValues)
      const errorCameraPosition = new THREE.Vector3(1.5, 0, -1.5)
      const errorCameraQuaternion = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        Math.PI / 2
      )

      targetPosition = errorCameraPosition
        .clone()
        .applyQuaternion(animation.quaternion)
        .add(animation.position)

      targetQuaternion = new THREE.Quaternion()
      targetQuaternion.multiplyQuaternions(animation.quaternion, errorCameraQuaternion)
    } else {
      // Direct camera mode: animate to the keyframe position/rotation directly
      targetPosition = animation.position.clone()
      targetQuaternion = animation.quaternion.clone()
    }

    console.log(`GuidedCamera: Animating to keyframe "${id}" over ${duration}ms`)

    const animate = (currentTime) => {
      if (this.currentAnimationId !== id) return // Animation was cancelled

      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const t = easing(progress)

      // Lerp position
      target.position.lerpVectors(startPosition, targetPosition, t)
      // Slerp quaternion
      target.quaternion.slerpQuaternions(startQuaternion, targetQuaternion, t)

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        // Exact final values
        target.position.copy(targetPosition)
        target.quaternion.copy(targetQuaternion)
        this.currentAnimationId = null
      }
    }

    requestAnimationFrame(animate)
  }

  /**
   * Clean up
   */
  destroy() {
    this.stopSceneTracking()
    this.animations = []
    this.sceneCameraPositions = {}
  }
}
