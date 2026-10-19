/**
 * CameraRigControls - Advanced camera movement system
 * Ported from Shadows of the Stabilisation Point
 * Supports touch/mouse navigation with boundaries and animations
 */

export class CameraRigControls {
  constructor(options = {}) {
    this.camera = options.camera
    this.container = options.container || document.body
    this.scene = options.scene

    // Camera rig (parent of camera for movement)
    this.cameraRig = null

    // Settings from JSON config
    this.settings = {
      moveSpeed: options.moveSpeed || 0.005,
      rotateSpeed: options.rotateSpeed || 0.003,
      bounds: options.bounds || {
        minX: -1.5,
        maxX: 2.5,
        minY: -0.25,
        maxY: 2.5,
        minZ: -2.5,
        maxZ: 2.5
      },
      buffer: options.buffer || 0.5,
      recenterPosition: options.recenterPosition || { x: 2, y: 0, z: -1.5 },
      recenterRotation: options.recenterRotation || {
        x: 0,
        y: Math.PI / 2,
        z: 0
      },
      // initialPosition/Rotation: where the camera starts (falls back to recenter if not set)
      initialPosition: options.initialPosition || null,
      initialRotation: options.initialRotation || null
    }

    // State
    this.lastCameraWorldPosition = new THREE.Vector3()
    this.lastCameraWorldQuaternion = new THREE.Quaternion()
    this.enabled = true
    this.isAnimating = false
    this.animationData = null

    // Input state
    this.lastX = null
    this.lastY = null
    this.isMouseDown = false

    // Device detection
    this.isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      )
    this.isIOS =
      /iPad|iPhone|iPod/.test(navigator.platform) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

    // Recenter button
    this.recenterButton = null

    // Callbacks
    this.onRecenter = options.onRecenter
    this.onNavigate = options.onNavigate
    this.tracked = !!options.tracked
    this.rotationEnabled = options.rotationEnabled !== false
  }

  /**
   * Initialize the camera rig system
   */
  init() {
    if (!this.camera || !this.scene) {
      console.error('CameraRigControls: camera and scene are required')
      return
    }

    // Create camera rig
    this.cameraRig = new THREE.Object3D()
    this.cameraRig.name = 'camera-rig'

    // Parent camera to rig
    this.scene.add(this.cameraRig)
    this.cameraRig.add(this.camera)

    // Reset camera local position
    if (!this.tracked) this.camera.position.set(0, 0, 0)

    // Set initial position — use initialPosition from story config if available,
    // otherwise fall back to recenterPosition (the "home" position)
    const pos = this.settings.initialPosition || this.settings.recenterPosition
    const rot = this.settings.initialRotation || this.settings.recenterRotation
    this.setPosition(
      new THREE.Vector3(pos.x, pos.y, pos.z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rot.x, rot.y, rot.z))
    )

    // Setup controls
    this.setupControls()

    // Create recenter button
    this.createRecenterButton()

    // Store initial position
    this.camera.getWorldPosition(this.lastCameraWorldPosition)
    this.camera.getWorldQuaternion(this.lastCameraWorldQuaternion)
  }

  /**
   * Calculate camera rig values to achieve desired camera world position/rotation
   */
  calculateCameraRigValues(
    desiredWorldPos,
    desiredWorldQuat,
    outPosition,
    outQuaternion
  ) {
    const cameraLocalPosition = this.camera.position.clone()
    const cameraLocalQuaternion = this.camera.quaternion.clone()

    // Compute inverse of camera's local transform
    const cameraLocalMatrix = new THREE.Matrix4()
    cameraLocalMatrix.compose(
      cameraLocalPosition,
      cameraLocalQuaternion,
      new THREE.Vector3(1, 1, 1)
    )

    const cameraLocalMatrixInv = new THREE.Matrix4()
    cameraLocalMatrixInv.copy(cameraLocalMatrix).invert()

    // Compute desired world matrix
    const desiredWorldMatrix = new THREE.Matrix4()
    desiredWorldMatrix.compose(
      desiredWorldPos,
      desiredWorldQuat,
      new THREE.Vector3(1, 1, 1)
    )

    // Compute required rig transform
    const rigWorldMatrix = new THREE.Matrix4()
    rigWorldMatrix.multiplyMatrices(desiredWorldMatrix, cameraLocalMatrixInv)

    // Extract position and quaternion
    const tempScale = new THREE.Vector3()
    rigWorldMatrix.decompose(outPosition, outQuaternion, tempScale)

    outQuaternion.normalize()
  }

  /**
   * Set camera position and rotation
   */
  setPosition(worldPosition, worldQuaternion) {
    this.calculateCameraRigValues(
      worldPosition,
      worldQuaternion,
      this.cameraRig.position,
      this.cameraRig.quaternion
    )
    this.lastCameraWorldPosition.copy(worldPosition)
    this.lastCameraWorldQuaternion.copy(worldQuaternion)
  }

  /**
   * Check and enforce camera boundaries
   */
  checkBounds() {
    let changed = false
    const bounds = this.settings.bounds
    const buffer = this.settings.buffer

    this.camera.getWorldPosition(this.lastCameraWorldPosition)
    this.camera.getWorldQuaternion(this.lastCameraWorldQuaternion)

    // Check Y bounds
    let diff =
      Math.max(0, bounds.minY + buffer - this.lastCameraWorldPosition.y) ||
      Math.min(0, bounds.maxY - buffer - this.lastCameraWorldPosition.y)
    if (diff !== 0) {
      changed = true
      this.lastCameraWorldPosition.y += diff
    }

    // Check X bounds
    diff =
      Math.max(0, bounds.minX + buffer - this.lastCameraWorldPosition.x) ||
      Math.min(0, bounds.maxX - buffer - this.lastCameraWorldPosition.x)
    if (diff !== 0) {
      changed = true
      this.lastCameraWorldPosition.x += diff
    }

    // Check Z bounds
    diff =
      Math.max(0, bounds.minZ + buffer - this.lastCameraWorldPosition.z) ||
      Math.min(0, bounds.maxZ - buffer - this.lastCameraWorldPosition.z)
    if (diff !== 0) {
      changed = true
      this.lastCameraWorldPosition.z += diff
    }

    if (changed) {
      this.calculateCameraRigValues(
        this.lastCameraWorldPosition,
        this.lastCameraWorldQuaternion,
        this.cameraRig.position,
        this.cameraRig.quaternion
      )
    }
  }

  /**
   * Move camera based on input delta
   */
  moveCamera(deltaY, deltaX) {
    if (!this.enabled) return
    this.animationVersion = (this.animationVersion || 0) + 1
    this.isAnimating = false
    this.onNavigate?.()
    const moveDelta = deltaY * -this.settings.moveSpeed
    const rotateDelta = this.rotationEnabled ? deltaX * this.settings.rotateSpeed : 0

    const worldPosition = new THREE.Vector3()
    this.camera.getWorldPosition(worldPosition)

    const worldQuaternion = new THREE.Quaternion()
    this.camera.getWorldQuaternion(worldQuaternion)

    // Apply rotation
    const rotateQuaternion = new THREE.Quaternion()
    rotateQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotateDelta)
    worldQuaternion.premultiply(rotateQuaternion)

    // Calculate forward direction and move
    const forward = new THREE.Vector3(0, 0, -1)
    forward.applyQuaternion(worldQuaternion)
    forward.y = 0
    forward.normalize()
    worldPosition.addScaledVector(forward, moveDelta)

    this.calculateCameraRigValues(
      worldPosition,
      worldQuaternion,
      this.cameraRig.position,
      this.cameraRig.quaternion
    )
  }

  /**
   * Setup touch and mouse controls
   */
  setupControls() {
    const canvas = this.container.querySelector('canvas') || this.container

    // Touch controls
    canvas.addEventListener(
      'touchstart',
      (e) => {
        e.preventDefault()
        if (e.touches.length === 1) {
          this.lastY = e.touches[0].clientY
          this.lastX = e.touches[0].clientX
        }
      },
      { passive: false }
    )

    canvas.addEventListener(
      'touchmove',
      (e) => {
        e.preventDefault()
        if (e.touches.length !== 1) return

        const currentX = e.touches[0].clientX
        const currentY = e.touches[0].clientY
        const deltaY = this.lastY - currentY
        const deltaX = currentX - this.lastX

        this.moveCamera(deltaY, deltaX)

        this.lastX = currentX
        this.lastY = currentY
      },
      { passive: false }
    )

    canvas.addEventListener('touchend', () => {
      this.lastY = null
      this.lastX = null
    })

    // Mouse controls
    canvas.addEventListener('mousedown', (e) => {
      this.isMouseDown = true
      this.lastY = e.clientY
      this.lastX = e.clientX
    })

    canvas.addEventListener('mousemove', (e) => {
      if (!this.isMouseDown) return

      const deltaY = this.lastY - e.clientY
      const deltaX = e.clientX - this.lastX

      this.moveCamera(deltaY, deltaX)

      this.lastX = e.clientX
      this.lastY = e.clientY
    })

    canvas.addEventListener('mouseup', () => {
      this.isMouseDown = false
      this.lastY = null
      this.lastX = null
    })

    canvas.addEventListener('mouseleave', () => {
      this.isMouseDown = false
      this.lastY = null
      this.lastX = null
    })
  }

  /**
   * Create recenter button
   */
  createRecenterButton() {
    const button = document.createElement('button')
    button.id = 'sj-recenter-btn'
    button.innerHTML = '⟲'
    button.title = 'Recenter View'
    button.style.cssText = `
      position: fixed;
      bottom: 28px;
      left: 5%;
      width: 48px;
      height: 48px;
      background: rgba(0, 0, 0, 0.5);
      border: none;
      border-radius: 50%;
      cursor: pointer;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      color: white;
    `

    button.addEventListener('click', () => this.recenter())
    document.body.appendChild(button)
    this.recenterButton = button
  }

  /**
   * Animate camera to target position
   */
  animateTo(targetPosition, targetQuaternion, duration = 1000) {
    const version = this.animationVersion = (this.animationVersion || 0) + 1
    this.isAnimating = true

    const startPosition = this.camera.getWorldPosition(new THREE.Vector3())
    const startQuaternion = this.camera.getWorldQuaternion(new THREE.Quaternion())
    const startTime = performance.now()

    const animate = (currentTime) => {
      if (!this.enabled || version !== this.animationVersion) {
        this.isAnimating = false
        return
      }
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Ease in-out
      const easeProgress =
        progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2

      // Interpolate position
      const currentPosition = new THREE.Vector3().lerpVectors(
        startPosition,
        targetPosition,
        easeProgress
      )

      // Interpolate rotation
      const currentQuaternion = new THREE.Quaternion()
      currentQuaternion.slerpQuaternions(
        startQuaternion,
        targetQuaternion,
        easeProgress
      )

      this.calculateCameraRigValues(
        currentPosition,
        currentQuaternion,
        this.cameraRig.position,
        this.cameraRig.quaternion
      )

      this.lastCameraWorldPosition.copy(currentPosition)
      this.lastCameraWorldQuaternion.copy(currentQuaternion)

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        this.isAnimating = false
      }
    }

    requestAnimationFrame(animate)
  }

  /**
   * Recenter camera to initial position
   */
  recenter() {
    if (!this.enabled) return
    if (this.onRecenter?.() === true) return
    this.onNavigate?.()
    // Web 3D has no tracked eye-height offset. Reset to its authored starting
    // viewpoint; legacy AR recenter values may deliberately be at floor level.
    const pos = (!this.tracked && this.settings.initialPosition) || this.settings.recenterPosition
    const rot = (!this.tracked && this.settings.initialRotation) || this.settings.recenterRotation

    this.animateTo(
      new THREE.Vector3(pos.x, pos.y, pos.z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rot.x, rot.y, rot.z)),
      1000
    )

  }

  /**
   * Update (call each frame)
   */
  preserveTrackingPose() {
    this.pendingTrackingPose = {
      position: this.lastCameraWorldPosition.clone(),
      quaternion: this.lastCameraWorldQuaternion.clone()
    }
    this.onNavigate?.()
  }

  update() {
    if (!this.enabled) return
    if (this.pendingTrackingPose) {
      this.setPosition(this.pendingTrackingPose.position, this.pendingTrackingPose.quaternion)
      this.pendingTrackingPose = null
    }
    // Preserve authored height and tilt; only constrain manual exploration.
    // Check boundaries
    this.checkBounds()
  }

  /**
   * Update settings from JSON config
   */
  updateSettings(config) {
    if (config.moveSpeed !== undefined)
      this.settings.moveSpeed = config.moveSpeed
    if (config.rotateSpeed !== undefined)
      this.settings.rotateSpeed = config.rotateSpeed
    if (config.bounds)
      this.settings.bounds = { ...this.settings.bounds, ...config.bounds }
    if (config.buffer !== undefined) this.settings.buffer = config.buffer
    if (config.recenterPosition)
      this.settings.recenterPosition = config.recenterPosition
    if (config.recenterRotation)
      this.settings.recenterRotation = config.recenterRotation
  }

  /**
   * Clean up
   */
  dispose() {
    this.enabled = false
    this.isAnimating = false
    if (this.recenterButton && this.recenterButton.parentNode) {
      this.recenterButton.parentNode.removeChild(this.recenterButton)
    }

    if (this.cameraRig) {
      this.cameraRig.remove(this.camera)
      this.scene.remove(this.cameraRig)
    }
  }
}

export default CameraRigControls
