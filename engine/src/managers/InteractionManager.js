/**
 * InteractionManager - Handles interactive 3D objects with raycasting
 * Ported from Shadows of the Stabilisation Point's interaction system
 * 
 * Features:
 * - Load interactive GLB models and place them in the room
 * - Raycasting for click/touch detection
 * - Toggle between original and transformed states (scale, position, rotation)
 * - Show info box with localized title and description
 * - Optional rotation animation on clicked objects
 * - Outline/highlight effect on interactive objects
 */

export class InteractionManager {
  /**
   * Create InteractionManager
   * @param {object} options
   * @param {THREE.Object3D} options.parentObject - Parent (room model) to add objects to
   * @param {THREE.Camera} options.camera - Camera for raycasting
   * @param {HTMLElement} options.container - DOM container for UI elements
   * @param {string} options.language - Current language code
   * @param {object} options.assetLoader - Asset loader for models
   * @param {object} options.parser - JSON parser for path resolution
   */
  constructor(options = {}) {
    this.parentObject = options.parentObject
    this.camera = options.camera
    this.container = options.container || document.body
    this.language = options.language || 'en'
    this.assetLoader = options.assetLoader
    this.parser = options.parser
    this.basePath = options.basePath || ''
    this.fontFamily = `'${options.fontFamily || 'sans-serif'}', Arial, sans-serif`

    // Raycasting
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()

    // Interactive objects
    this.objects = new Map() // id -> { model, config, isClicked, infoBoxVisible }
    this.outlinedModels = [] // Models that should be highlighted

    // Info box
    this.infoBox = null
    this.activeObject = null

    // Bound handlers
    this._onPointerDown = this._handlePointerDown.bind(this)

    // Postprocessing for outline effect
    this.composer = null
    this.outlinePass = null
    this.outlineEnabled = false

    // Create GLTFLoader for loading interactive models
    if (typeof THREE !== 'undefined' && THREE.GLTFLoader) {
      this.gltfLoader = new THREE.GLTFLoader()
    }
  }

  /**
   * Load interactive objects from story configuration
   * @param {Array} objectConfigs - Array of interactive object configurations
   */
  async loadFromConfig(objectConfigs) {
    if (!objectConfigs || !Array.isArray(objectConfigs) || objectConfigs.length === 0) return

    console.log(`InteractionManager: Loading ${objectConfigs.length} interactive objects`)

    for (const config of objectConfigs) {
      try {
        await this.loadInteractiveObject(config)
      } catch (error) {
        console.warn(`InteractionManager: Failed to load ${config.id}:`, error)
      }
    }

    // Set up interaction handlers after all objects are loaded
    this._setupInteractionHandlers()
  }

  /**
   * Load a single interactive object
   * @param {object} config - Object configuration
   */
  async loadInteractiveObject(config) {
    const modelUrl = this.parser?.resolvePath(config.model, this.basePath) || config.model

    return new Promise((resolve, reject) => {
      if (!this.gltfLoader) {
        reject(new Error('GLTFLoader not available'))
        return
      }

      this.gltfLoader.load(
        modelUrl,
        (gltf) => {
          const model = gltf.scene

          // Apply original state transforms
          const original = config.original || {}
          const pos = this._toVec3(original.position, { x: 0, y: 0, z: 0 })
          const rot = this._toVec3(original.rotation, { x: 0, y: 0, z: 0 })
          const scl = this._toVec3(original.scale, { x: 1, y: 1, z: 1 })

          model.position.set(pos.x, pos.y, pos.z)
          model.rotation.set(rot.x, rot.y, rot.z)
          model.scale.set(scl.x, scl.y, scl.z)

          // Apply unlit MeshBasicMaterial for interactive objects (matching original)
          // This ensures objects are fully visible regardless of scene lighting
          model.traverse((child) => {
            if (child.isMesh && child.material) {
              const texture = child.material.map || null
              child.material = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: false,
                side: child.material.side || THREE.FrontSide
              })
            }
          })

          // Store metadata
          model.name = config.id
          model.userData.id = config.id
          model.userData.interactive = true
          model.userData.state = 'original'

          // Add to parent
          this.parentObject.add(model)
          this.outlinedModels.push(model)

          // Store in map
          this.objects.set(config.id, {
            model,
            config,
            isClicked: false,
            infoBoxVisible: false
          })

          console.log(`  Interactive object loaded: ${config.id}`)
          resolve(model)
        },
        undefined,
        (error) => reject(error)
      )
    })
  }

  /**
   * Setup interaction handlers (click/touch)
   */
  _setupInteractionHandlers() {
    // Use pointer events for both touch and mouse
    const canvas = this.container.querySelector('canvas')
    if (canvas) {
      canvas.addEventListener('pointerdown', this._onPointerDown)
    } else {
      // Fallback to container
      this.container.addEventListener('pointerdown', this._onPointerDown)
    }
  }

  /**
   * Handle pointer down event
   */
  _handlePointerDown(event) {
    if (this.objects.size === 0) return

    let clientX, clientY
    if (event.touches) {
      clientX = event.touches[0].clientX
      clientY = event.touches[0].clientY
    } else {
      clientX = event.clientX
      clientY = event.clientY
    }

    // Convert to normalized device coordinates
    const rect = (this.container.querySelector('canvas') || this.container).getBoundingClientRect()
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)

    // Get all interactive models
    const interactiveModels = Array.from(this.objects.values()).map(o => o.model)

    // Intersect with all children of interactive models
    const intersects = this.raycaster.intersectObjects(interactiveModels, true)

    if (intersects.length > 0) {
      // Find which interactive object was hit
      const hitObject = intersects[0].object
      let interactiveParent = hitObject

      // Walk up to find the interactive root
      while (interactiveParent && !interactiveParent.userData.interactive) {
        interactiveParent = interactiveParent.parent
      }

      if (interactiveParent && interactiveParent.userData.id) {
        this._toggleObject(interactiveParent.userData.id)
      }
    } else {
      // Clicked outside - close any open info box and reset clicked objects
      this._closeActiveInfoBox()
    }
  }

  /**
   * Toggle an interactive object between original and transformed states
   */
  _toggleObject(objectId) {
    const objData = this.objects.get(objectId)
    if (!objData) return

    const { model, config } = objData

    if (!objData.isClicked) {
      // Transform to "clicked" state
      const transformed = config.transformed || {}
      const pos = this._toVec3(transformed.position, model.position)
      const rot = this._toVec3(transformed.rotation, { x: model.rotation.x, y: model.rotation.y, z: model.rotation.z })
      const scl = this._toVec3(transformed.scale, { x: model.scale.x, y: model.scale.y, z: model.scale.z })

      this._animateTransform(model, pos, rot, scl, 500)
      objData.isClicked = true

      // Show info box if configured
      if (config.hasInfoBox) {
        objData.infoBoxVisible = true
        const title = config.name?.[this.language] || config.name?.en || config.id
        const message = config.infoBoxMessage?.[this.language] || config.infoBoxMessage?.en || ''
        this._showInfoBox(title, message)
        this.activeObject = objData
      }

      // Start rotation if enabled
      if (config.enableRotation) {
        objData._rotationActive = true
      }
    } else {
      // Return to original state
      const original = config.original || {}
      const pos = this._toVec3(original.position, { x: 0, y: 0, z: 0 })
      const rot = this._toVec3(original.rotation, { x: 0, y: 0, z: 0 })
      const scl = this._toVec3(original.scale, { x: 1, y: 1, z: 1 })

      this._animateTransform(model, pos, rot, scl, 500)
      objData.isClicked = false
      objData._rotationActive = false

      // Hide info box
      if (objData.infoBoxVisible) {
        objData.infoBoxVisible = false
        this._removeInfoBox()
        this.activeObject = null
      }
    }
  }

  /**
   * Animate transform (position, rotation, scale) with easing
   */
  _animateTransform(model, targetPos, targetRot, targetScl, duration) {
    const startPos = { x: model.position.x, y: model.position.y, z: model.position.z }
    const startRot = { x: model.rotation.x, y: model.rotation.y, z: model.rotation.z }
    const startScl = { x: model.scale.x, y: model.scale.y, z: model.scale.z }
    const startTime = performance.now()

    const animate = () => {
      const elapsed = performance.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const ease = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2

      model.position.set(
        startPos.x + (targetPos.x - startPos.x) * ease,
        startPos.y + (targetPos.y - startPos.y) * ease,
        startPos.z + (targetPos.z - startPos.z) * ease
      )
      model.rotation.set(
        startRot.x + (targetRot.x - startRot.x) * ease,
        startRot.y + (targetRot.y - startRot.y) * ease,
        startRot.z + (targetRot.z - startRot.z) * ease
      )
      model.scale.set(
        startScl.x + (targetScl.x - startScl.x) * ease,
        startScl.y + (targetScl.y - startScl.y) * ease,
        startScl.z + (targetScl.z - startScl.z) * ease
      )

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }

  /**
   * Show info box UI
   */
  _showInfoBox(title, content) {
    this._removeInfoBox()

    this.infoBox = document.createElement('div')
    this.infoBox.className = 'sj-info-card'
    this.infoBox.style.cssText = `
      position: fixed;
      top: 10%;
      left: 20px;
      background: linear-gradient(to bottom, rgba(0, 0, 0, 0.9) 50%, rgba(0, 0, 0, 0.7) 70%, rgba(0, 0, 0, 0.5) 100%);
      border-radius: 12px;
      padding: 16px 24px;
      color: white;
      font-family: ${this.fontFamily};
      z-index: 9999;
      max-width: 320px;
      text-align: left;
      opacity: 0;
      transition: opacity 0.3s ease;
      backdrop-filter: blur(10px);
    `

    this.infoBox.innerHTML = `
      <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">${title}</h3>
      ${content ? `<p style="margin: 0; font-size: 14px; opacity: 0.85; line-height: 1.4;">${content}</p>` : ''}
    `

    document.body.appendChild(this.infoBox)

    // Fade in
    requestAnimationFrame(() => {
      this.infoBox.style.opacity = '1'
    })
  }

  /**
   * Remove info box UI
   */
  _removeInfoBox() {
    if (this.infoBox) {
      this.infoBox.style.opacity = '0'
      const box = this.infoBox
      setTimeout(() => box.remove(), 300)
      this.infoBox = null
    }
  }

  /**
   * Close active info box and reset any clicked objects
   */
  _closeActiveInfoBox() {
    if (this.activeObject) {
      const objData = this.activeObject
      if (objData.isClicked) {
        this._toggleObject(objData.config.id)
      }
      this.activeObject = null
    }
    this._removeInfoBox()
  }

  /**
   * Update info box content (e.g. on language change)
   */
  updateInfoBoxLanguage(language) {
    if (this.activeObject && this.infoBox) {
      const config = this.activeObject.config
      const title = config.name?.[language] || config.name?.en || config.id
      const message = config.infoBoxMessage?.[language] || config.infoBoxMessage?.en || ''

      const h3 = this.infoBox.querySelector('h3')
      const p = this.infoBox.querySelector('p')
      if (h3) h3.textContent = title
      if (p) p.textContent = message
    }
  }

  /**
   * Convert array or object to { x, y, z } format
   */
  _toVec3(value, defaultVal = { x: 0, y: 0, z: 0 }) {
    if (!value) return defaultVal
    if (Array.isArray(value)) return { x: value[0] || 0, y: value[1] || 0, z: value[2] || 0 }
    return { x: value.x || 0, y: value.y || 0, z: value.z || 0 }
  }

  /**
   * Initialize postprocessing outline effect
   * Must be called after renderer and scene are available
   * @param {THREE.Scene} scene - The Three.js scene
   * @param {THREE.Camera} camera - The camera
   * @param {THREE.WebGLRenderer} renderer - The renderer
   */
  initOutlineEffect(scene, camera, renderer) {
    try {
      if (!THREE.EffectComposer || !THREE.RenderPass || !THREE.OutlinePass) {
        console.warn('InteractionManager: Postprocessing classes not available, outline disabled')
        return
      }

      this.composer = new THREE.EffectComposer(renderer)
      const renderPass = new THREE.RenderPass(scene, camera)
      this.composer.addPass(renderPass)

      this.outlinePass = new THREE.OutlinePass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        scene,
        camera
      )

      // Match original project's outline settings
      this.outlinePass.edgeStrength = 10
      this.outlinePass.edgeGlow = 0.5
      this.outlinePass.edgeThickness = 0 // Start hidden, enabled per-scene
      this.outlinePass.pulsePeriod = 1
      this.outlinePass.visibleEdgeColor.set('#190a05')
      this.outlinePass.hiddenEdgeColor.set('#190a05')

      // Set the interactive objects as targets
      this.outlinePass.selectedObjects = this.outlinedModels

      this.composer.addPass(this.outlinePass)

      console.log('InteractionManager: Outline effect initialized with', this.outlinedModels.length, 'objects')
    } catch (e) {
      console.warn('InteractionManager: Failed to create outline effect:', e)
      this.composer = null
      this.outlinePass = null
    }
  }

  /**
   * Enable outline glow on interactive objects (e.g. when a scene starts)
   */
  enableOutline() {
    if (this.outlinePass) {
      this.outlinePass.edgeThickness = 2
      this.outlinePass.selectedObjects = this.outlinedModels
      this.outlineEnabled = true
      console.log('InteractionManager: Outline enabled')
    }
  }

  /**
   * Disable outline glow on interactive objects
   */
  disableOutline() {
    if (this.outlinePass) {
      this.outlinePass.edgeThickness = 0
      this.outlineEnabled = false
    }
  }

  /**
   * Render using the composer (with outline) or return false if no composer
   * Only renders through composer when outlines are actually enabled,
   * to avoid darkening caused by EffectComposer bypassing sRGB output encoding.
   * @returns {boolean} true if composer rendered, false if caller should render normally
   */
  renderWithComposer() {
    if (this.composer && this.outlineEnabled) {
      this.composer.render()
      return true
    }
    return false
  }

  /**
   * Handle window resize for the composer
   */
  onResize(width, height) {
    if (this.composer) {
      this.composer.setSize(width, height)
    }
  }

  /**
   * Update rotation for clicked objects (call in render loop)
   */
  update() {
    this.objects.forEach((objData) => {
      if (objData.isClicked && objData._rotationActive && objData.config.enableRotation) {
        objData.model.rotation.y += 0.005
      }
    })
  }

  /**
   * Set language
   */
  setLanguage(language) {
    this.language = language
    this.updateInfoBoxLanguage(language)
  }

  /**
   * Get outlined models (for potential outline/glow effects)
   */
  getOutlinedModels() {
    return this.outlinedModels
  }

  /**
   * Dispose and clean up
   */
  dispose() {
    // Remove event listeners
    const canvas = this.container.querySelector('canvas')
    if (canvas) {
      canvas.removeEventListener('pointerdown', this._onPointerDown)
    } else {
      this.container.removeEventListener('pointerdown', this._onPointerDown)
    }

    // Remove info box
    this._removeInfoBox()

    // Remove all models
    this.objects.forEach((objData) => {
      if (objData.model && this.parentObject) {
        this.parentObject.remove(objData.model)
        objData.model.traverse((child) => {
          if (child.isMesh) {
            if (child.geometry) child.geometry.dispose()
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(m => m.dispose())
              } else {
                child.material.dispose()
              }
            }
          }
        })
      }
    })

    this.objects.clear()
    this.outlinedModels = []
    this.activeObject = null
  }
}

export default InteractionManager
