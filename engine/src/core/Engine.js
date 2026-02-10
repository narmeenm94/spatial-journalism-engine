/**
 * SJEngine - Main Spatial Journalism Engine class
 * Orchestrates all managers and provides the public API
 * Features ported from Shadows of the Stabilisation Point
 */

import { JSONParser } from './JSONParser.js'
import { AssetLoader } from './AssetLoader.js'
import { AudioManager } from '../managers/AudioManager.js'
import { VideoProjector } from '../managers/VideoProjector.js'
import { CharacterManager } from '../managers/CharacterManager.js'
import { LightingManager } from '../managers/LightingManager.js'
import { SceneManager } from '../managers/SceneManager.js'
import { UIManager } from '../managers/UIManager.js'
import { SubtitleManager } from '../managers/SubtitleManager.js'
import { CameraRigControls } from '../controls/CameraRigControls.js'
import { GuidedCameraController } from '../controls/GuidedCameraController.js'
import { VolumetricLighting } from '../lighting/VolumetricLighting.js'
import { SceneEffects } from '../lighting/SceneEffects.js'
import { InteractionManager } from '../managers/InteractionManager.js'
import { ParticleManager } from '../visual-effects/ParticleManager.js'

export class Engine {
  /**
   * Create SJEngine instance
   * @param {object} options - Engine options
   */
  constructor(options = {}) {
    this.options = options
    this.container = options.container || document.getElementById('sj-container') || document.body
    
    // Core components
    this.parser = new JSONParser()
    this.assetLoader = new AssetLoader()
    
    // Managers (initialized after story load)
    this.audioManager = null
    this.videoProjector = null
    this.characterManager = null
    this.lightingManager = null
    this.sceneManager = null
    this.uiManager = null
    this.subtitleManager = null
    this.cameraControls = null
    this.volumetricLighting = null
    this.sceneEffects = null
    this.interactionManager = null
    this.particleManager = null
    
    // Three.js references
    this.scene = null
    this.camera = null
    this.renderer = null
    this.roomModel = null
    this.controls = null
    
    // State
    this.story = null
    this.isInitialized = false
    this.isRunning = false
    this.mode = 'ar'
    this.clock = null
    this.currentLanguage = 'en'
    
    // Callbacks
    this.onReady = options.onReady
    this.onSceneChange = options.onSceneChange
    this.onComplete = options.onComplete
    this.onError = options.onError
  }

  /**
   * Initialize the engine with a story configuration
   * @param {string|object} storySource - Story JSON URL or object
   * @returns {Promise} Resolves when initialized
   */
  async init(storySource) {
    try {
      // Load and validate schema
      await this.parser.loadSchema('/schema/story.schema.json').catch(() => {
        console.warn('Schema not found, validation disabled')
      })

      // Parse story
      this.story = await this.parser.parse(storySource)
      console.log('Story loaded:', this.story.project.title)
      this.currentLanguage = this.story.project.defaultLanguage || 'en'

      // Initialize UI Manager first
      this.uiManager = new UIManager({
        container: this.container,
        defaultLanguage: this.currentLanguage,
        storyBaseUrl: this.parser.storyBaseUrl,
        onLanguageChange: (lang) => this.handleLanguageChange(lang),
        onModeSelect: (mode) => this.handleModeSelect(mode),
        onStart: () => this.handleStart()
      })
      this.uiManager.init(this.story.ui, this.story.project)

      // Show home screen
      this.uiManager.createHomeScreen()

      this.isInitialized = true

      if (this.onReady) {
        this.onReady(this)
      }

      return this

    } catch (error) {
      console.error('Engine initialization failed:', error)
      if (this.onError) {
        this.onError(error)
      }
      throw error
    }
  }

  /**
   * Handle start button
   */
  async handleStart() {
    // Check for forced mode from URL params (used by Creator preview)
    const params = new URLSearchParams(window.location.search)
    const forcedMode = params.get('mode')
    if (forcedMode) {
      this.startExperience(forcedMode)
      return
    }

    // Show mode selection if multiple modes available
    if (this.story.project.modes?.length > 1) {
      this.uiManager.hide('homeScreen')
      const modeSelection = this.uiManager.createModeSelection()
      this.container.appendChild(modeSelection)
    } else {
      // Start with default mode
      this.startExperience(this.story.project.modes?.[0] || '3d')
    }
  }

  /**
   * Handle mode selection
   * @param {string} mode - Selected mode
   */
  handleModeSelect(mode) {
    this.mode = mode
    this.uiManager.remove('modeSelection')
    this.startExperience(mode)
  }

  /**
   * Start the experience
   * @param {string} mode - Experience mode (ar, 3d, etc.)
   */
  async startExperience(mode) {
    this.mode = mode
    this.uiManager.showLoading('Loading experience...')
    this.uiManager.hide('homeScreen')

    try {
      // Initialize Three.js scene
      await this.initializeThreeScene()

      // Preload and load environment
      await this.loadEnvironment()

      // Initialize subtitle manager
      this.subtitleManager = new SubtitleManager({
        defaultLanguage: this.currentLanguage,
        totalScenes: this.story.scenes.length
      })
      this.subtitleManager.loadSubtitles(this.story.scenes)

      // Initialize scene manager with all modules
      this.sceneManager = new SceneManager({
        engine: this,
        audioManager: this.audioManager,
        videoProjector: this.videoProjector,
        characterManager: this.characterManager,
        lightingManager: this.lightingManager,
        subtitleManager: this.subtitleManager,
        volumetricLighting: this.volumetricLighting,
        sceneEffects: this.sceneEffects,
        interactionManager: this.interactionManager,
        parser: this.parser,
        onSceneChange: (from, to) => this.handleSceneChange(from, to),
        onSceneStart: (scene) => this.handleSceneStart(scene),
        onSceneEnd: (scene) => this.handleSceneEnd(scene)
      })
      this.sceneManager.loadScenes(this.story.scenes)

      this.uiManager.hideLoading()

      // Create control buttons
      this.createUIControls()

      // Start first scene
      this.isRunning = true
      await this.sceneManager.activateScene(this.story.scenes[0].id)

    } catch (error) {
      console.error('Failed to start experience:', error)
      this.uiManager.hideLoading()
      if (this.onError) {
        this.onError(error)
      }
    }
  }

  /**
   * Initialize Three.js scene and managers
   */
  async initializeThreeScene() {
    if (this.scene) return // Already initialized

    this.scene = new THREE.Scene()
    this.clock = new THREE.Clock()
    
    // Create camera
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(window.devicePixelRatio)
    // Match original project's renderer settings exactly:
    // sRGBEncoding + ACESFilmicToneMapping + exposure 2 creates the cinematic look
    this.renderer.outputEncoding = THREE.sRGBEncoding
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 2
    this.container.appendChild(this.renderer.domElement)

    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize())
    
    // Initialize asset loader
    this.assetLoader.init()
    if (typeof THREE !== 'undefined' && THREE.GLTFLoader) {
      this.assetLoader.setGLTFLoader(new THREE.GLTFLoader())
    }

    // Initialize audio manager
    this.audioManager = new AudioManager(this.camera)

    // Initialize lighting manager with default lights
    this.lightingManager = new LightingManager(this.scene)
    this.lightingManager.initDefaultLighting()

    // Initialize volumetric lighting system
    this.volumetricLighting = new VolumetricLighting(this.scene)

    // Initialize scene effects (flicker, walking tour)
    // Note: roomModel is set later in loadEnvironment() once it's loaded
    this.sceneEffects = new SceneEffects({
      scene: this.scene,
      roomModel: null, // Will be set after room model loads
      lights: this.lightingManager.lights,
      language: this.currentLanguage
    })

    // Initialize camera controls based on mode and config
    if (this.mode === 'ar') {
      // In AR mode, XR8 handles rendering - defer render loop start
      await this.initializeARMode()
    } else {
      // 3D mode uses custom camera rig
      this.initializeCameraControls()
      // Start render loop
      this.startRenderLoop()
    }
  }

  /**
   * Initialize camera controls (custom camera rig or orbit controls)
   */
  initializeCameraControls() {
    const cameraConfig = this.story.camera || {}
    
    // Use custom camera rig controls (like in original project)
    this.cameraControls = new CameraRigControls({
      camera: this.camera,
      container: this.container,
      scene: this.scene,
      moveSpeed: cameraConfig.moveSpeed || 0.005,
      rotateSpeed: cameraConfig.rotateSpeed || 0.003,
      bounds: cameraConfig.bounds || {
        minX: -1.5, maxX: 2.5,
        minY: -0.25, maxY: 2.5,
        minZ: -2.5, maxZ: 2.5
      },
      buffer: cameraConfig.buffer || 0.5,
      // initialPosition/Rotation: where the camera starts at the beginning of the experience
      initialPosition: cameraConfig.initialPosition
        ? { x: cameraConfig.initialPosition[0], y: cameraConfig.initialPosition[1], z: cameraConfig.initialPosition[2] }
        : null,
      initialRotation: cameraConfig.initialRotation
        ? { x: cameraConfig.initialRotation[0], y: cameraConfig.initialRotation[1], z: cameraConfig.initialRotation[2] }
        : null,
      // recenterPosition/Rotation: the "home" position when user presses recenter
      recenterPosition: cameraConfig.recenterPosition 
        ? { x: cameraConfig.recenterPosition[0], y: cameraConfig.recenterPosition[1], z: cameraConfig.recenterPosition[2] }
        : { x: 2, y: 0, z: -1.5 },
      recenterRotation: cameraConfig.recenterRotation
        ? { x: cameraConfig.recenterRotation[0], y: cameraConfig.recenterRotation[1], z: cameraConfig.recenterRotation[2] }
        : { x: 0, y: Math.PI / 2, z: 0 },
      onRecenter: () => this.handleRecenter()
    })
    this.cameraControls.init()
  }

  /**
   * Initialize AR mode using 8th Wall open-source SLAM libraries
   * Sets up XR8 camera pipeline modules matching the original project's AR experience
   */
  async initializeARMode() {
    if (typeof XR8 === 'undefined') {
      console.warn('XR8 not available, falling back to 3D mode')
      this.mode = '3d'
      this.initializeCameraControls()
      this.startRenderLoop()
      return
    }

    // Create a camera feed canvas for AR
    const canvas = document.createElement('canvas')
    canvas.id = 'camerafeed'
    canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;'
    this.container.prepend(canvas)

    // Configure XR8 with absolute scale for SLAM
    XR8.XrController.configure({ scale: 'absolute' })

    // Store references for the pipeline module
    const engine = this

    // Custom pipeline module — integrates our engine with XR8's Three.js scene
    const enginePipelineModule = {
      name: 'sj-engine-ar',
      onStart: ({ canvas: _canvas }) => {
        // Get the scene, camera, and renderer created by XR8.Threejs
        const xrScene = XR8.Threejs.xrScene()
        engine.scene = xrScene.scene
        engine.camera = xrScene.camera
        engine.renderer = xrScene.renderer

        // Set initial camera position (XR8 will update this via SLAM)
        const cameraConfig = engine.story.camera || {}
        if (cameraConfig.initialPosition) {
          const pos = cameraConfig.initialPosition
          engine.camera.position.set(pos[0], pos[1], pos[2])
        }
        if (cameraConfig.initialRotation) {
          const rot = cameraConfig.initialRotation
          const quaternion = new THREE.Quaternion()
          quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot[1] || Math.PI / 2)
          engine.camera.quaternion.copy(quaternion)
        }

        XR8.XrController.updateCameraProjectionMatrix({
          origin: engine.camera.position,
          facing: engine.camera.quaternion,
        })

        // Initialize camera rig controls for SLAM-integrated boundary checking
        engine.initializeCameraControls()
        
        // Prevent default touch scrolling
        canvas.addEventListener('touchmove', (event) => event.preventDefault())
      },
      onUpdate: () => {
        // Animation updates happen here each frame via XR8's render loop
        if (engine.sceneManager) {
          engine.sceneManager.update()
        }
        if (engine.particleManager) {
          engine.particleManager.update()
        }
        // Outline rendering for interactive objects
        if (engine.interactionManager?.renderWithComposer) {
          engine.interactionManager.renderWithComposer(engine.renderer, engine.scene, engine.camera)
        }
      },
    }

    // Add camera pipeline modules exactly as in the original project
    const modules = [
      XR8.GlTextureRenderer.pipelineModule(),     // Draws the camera feed
      XR8.Threejs.pipelineModule(),                // Creates a Three.js AR scene
      XR8.XrController.pipelineModule(),           // Enables SLAM tracking
    ]

    // Add XRExtras modules if available
    if (typeof XRExtras !== 'undefined') {
      modules.push(XRExtras.FullWindowCanvas.pipelineModule())  // Full-window canvas
      modules.push(XRExtras.RuntimeError.pipelineModule())      // Runtime error display
    }

    // Add LandingPage/CoachingOverlay if available
    if (typeof window.LandingPage !== 'undefined') {
      modules.push(window.LandingPage.pipelineModule())
    }
    if (typeof window.CoachingOverlay !== 'undefined') {
      window.CoachingOverlay.configure({
        promptText: 'Move your phone slowly',
      })
      modules.push(window.CoachingOverlay.pipelineModule())
    }

    // Add our custom pipeline module
    modules.push(enginePipelineModule)

    XR8.addCameraPipelineModules(modules)

    // Run XR8 with the canvas
    XR8.run({ canvas, allowedDevices: 'any' })

    console.log('AR mode initialized with XR8 SLAM')
  }

  /**
   * Load environment and assets
   */
  async loadEnvironment() {
    // Preload assets
    const assetsToPreload = [
      this.story.project.assets.environment,
      ...(this.story.project.assets.preload || [])
    ].filter(Boolean).map(path => 
      this.parser.resolvePath(path, this.story.project.assets.basePath)
    )

    if (assetsToPreload.length > 0) {
      await this.assetLoader.preload(assetsToPreload, (progress) => {
        this.uiManager.updateLoadingProgress(progress)
      })
    }

    // Load environment model (if one is specified)
    const envAsset = this.story.project.assets.environment
    if (envAsset) {
      const envPath = this.parser.resolvePath(envAsset, this.story.project.assets.basePath)
      try {
        const envGltf = await this.assetLoader.load(envPath)
        if (envGltf?.scene) {
          this.roomModel = envGltf.scene
          
          // Apply environment configuration (scale and position)
          const envConfig = this.story.environment || {}
          const scale = envConfig.scale || 1
          const position = envConfig.position || [0, 0, 0]
          
          this.roomModel.scale.set(scale, scale, scale)
          this.roomModel.position.set(position[0], position[1], position[2])
          
          this.scene.add(this.roomModel)
        }
      } catch (err) {
        console.warn('Could not load environment model:', err.message)
      }
    }

    // If no room model was loaded, create an empty group as the root for scene objects
    if (!this.roomModel) {
      console.log('No environment model — using empty scene root')
      this.roomModel = new THREE.Group()
      this.roomModel.name = 'scene-root'
      this.scene.add(this.roomModel)
    }

    // Apply rendering settings (tone mapping, fog, etc.) from story config
    this.setupRendering()

    // Set a visible scene background (dark gradient) if none was set by the story
    if (!this.scene.background) {
      this.scene.background = new THREE.Color(0x1a1a2e)
    }
    
    // Set camera initial position from story config
    this.setupCamera()
    
    // Apply global lighting configuration
    this.setupLighting()
    
    // CRITICAL: Update originalIntensities AFTER setupLighting so multipliers use correct base values
    this.lightingManager.updateOriginalIntensities()
    
    // Initialize particles from story config (dust/atmosphere effects)
    if (this.story.particles?.enabled) {
      this.particleManager = new ParticleManager()
      this.particleManager.init(this.scene, this.story.particles)
    }

    // Initialize video projector with room model
    this.videoProjector = new VideoProjector(this.roomModel)
    
    // Initialize character manager with room model
    this.characterManager = new CharacterManager(this.roomModel, this.assetLoader)
    
    // Set roomModel on SceneEffects now that it's available
    if (this.sceneEffects) {
      this.sceneEffects.roomModel = this.roomModel
    }

    // Initialize interaction manager for interactive objects
    this.interactionManager = new InteractionManager({
      parentObject: this.roomModel,
      camera: this.camera,
      container: this.container,
      language: this.currentLanguage,
      parser: this.parser,
      basePath: this.story.project.assets.basePath,
      fontFamily: this.story.ui?.branding?.font || 'sans-serif'
    })

    // Load interactive objects from story config
    if (this.story.interactableObjects && this.story.interactableObjects.length > 0) {
      await this.interactionManager.loadFromConfig(this.story.interactableObjects)
      console.log(`Loaded ${this.story.interactableObjects.length} interactive objects`)
    }

    // Initialize outline postprocessing effect for interactive objects
    this.interactionManager.initOutlineEffect(this.scene, this.camera, this.renderer)

    // Initialize guided camera controller if guided keyframes exist in story config
    if (this.story.camera?.guided && Object.keys(this.story.camera.guided).length > 0) {
      const cameraRig = this.cameraControls?.cameraRig || null
      this.guidedCameraController = new GuidedCameraController(
        this.camera,
        cameraRig, // null when no CameraRigControls — controller will animate the camera directly
        this.story.camera.guided
      )
      console.log('Guided camera controller initialized with keyframes', cameraRig ? '(rig mode)' : '(direct camera mode)')
    }
  }

  /**
   * Setup camera position and rotation from story config
   */
  setupCamera() {
    const cameraConfig = this.story.camera || {}

    // When the camera rig is active, positioning is handled by CameraRigControls
    // (which already reads initialPosition / initialRotation from the config).
    // Directly setting camera.position here would only set a LOCAL offset inside
    // the rig, which is incorrect.
    if (this.cameraControls?.cameraRig) {
      // Re-apply position through the rig in case loadEnvironment is called
      // after initializeCameraControls
      const pos = cameraConfig.initialPosition
        ? { x: cameraConfig.initialPosition[0], y: cameraConfig.initialPosition[1], z: cameraConfig.initialPosition[2] }
        : this.cameraControls.settings.recenterPosition
      const rot = cameraConfig.initialRotation
        ? { x: cameraConfig.initialRotation[0], y: cameraConfig.initialRotation[1], z: cameraConfig.initialRotation[2] }
        : this.cameraControls.settings.recenterRotation

      this.cameraControls.setPosition(
        new THREE.Vector3(pos.x, pos.y, pos.z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(rot.x, rot.y, rot.z))
      )
      return
    }

    // No rig — set camera position/rotation directly (fallback / AR mode)
    if (cameraConfig.initialPosition) {
      const pos = cameraConfig.initialPosition
      this.camera.position.set(pos[0], pos[1], pos[2])
    } else {
      this.camera.position.set(1.5, 1.6, -1.5)
    }
    
    if (cameraConfig.initialRotation) {
      const rot = cameraConfig.initialRotation
      const quaternion = new THREE.Quaternion()
      quaternion.setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2]))
      this.camera.quaternion.copy(quaternion)
    } else {
      const quaternion = new THREE.Quaternion()
      quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2)
      this.camera.quaternion.copy(quaternion)
    }
  }

  /**
   * Setup rendering options from story config (tone mapping, fog, etc.)
   * Falls back to original project defaults: ACESFilmicToneMapping + exposure 2
   */
  setupRendering() {
    const renderConfig = this.story.rendering || {}
    
    // Tone mapping
    if (renderConfig.toneMapping) {
      const mappings = {
        'none': THREE.NoToneMapping,
        'NoToneMapping': THREE.NoToneMapping,
        'linear': THREE.LinearToneMapping,
        'LinearToneMapping': THREE.LinearToneMapping,
        'reinhard': THREE.ReinhardToneMapping,
        'ReinhardToneMapping': THREE.ReinhardToneMapping,
        'cineon': THREE.CineonToneMapping,
        'CineonToneMapping': THREE.CineonToneMapping,
        'ACESFilmic': THREE.ACESFilmicToneMapping,
        'ACESFilmicToneMapping': THREE.ACESFilmicToneMapping
      }
      this.renderer.toneMapping = mappings[renderConfig.toneMapping] ?? THREE.ACESFilmicToneMapping
    }
    if (renderConfig.toneMappingExposure !== undefined) {
      this.renderer.toneMappingExposure = renderConfig.toneMappingExposure
    }
    
    // Fog
    if (renderConfig.fog) {
      const fogColor = parseInt(renderConfig.fog.color || '0xcccccc')
      if (renderConfig.fog.type === 'exponential') {
        this.scene.fog = new THREE.FogExp2(fogColor, renderConfig.fog.density || 0.15)
      } else if (renderConfig.fog.type === 'linear') {
        this.scene.fog = new THREE.Fog(fogColor, renderConfig.fog.near || 1, renderConfig.fog.far || 100)
      }
      console.log('Engine: Fog applied:', renderConfig.fog)
    }
  }

  /**
   * Setup lighting from story config
   */
  setupLighting() {
    const lightingConfig = this.story.lighting || {}
    
    // Update ambient light
    if (lightingConfig.ambient && this.lightingManager.lights.ambient) {
      const ambient = lightingConfig.ambient
      if (ambient.color) {
        this.lightingManager.lights.ambient.color.setHex(parseInt(ambient.color))
      }
      if (ambient.intensity !== undefined) {
        this.lightingManager.lights.ambient.intensity = ambient.intensity
      }
    }
    
    // Update directional light
    if (lightingConfig.directional && this.lightingManager.lights.directional) {
      const dir = lightingConfig.directional
      if (dir.color) {
        this.lightingManager.lights.directional.color.setHex(parseInt(dir.color))
      }
      if (dir.intensity !== undefined) {
        this.lightingManager.lights.directional.intensity = dir.intensity
      }
      if (dir.position) {
        this.lightingManager.lights.directional.position.set(dir.position[0], dir.position[1], dir.position[2])
      }
    }
    
    // Update hemisphere light
    if (lightingConfig.hemisphere && this.lightingManager.lights.hemisphere) {
      const hemi = lightingConfig.hemisphere
      if (hemi.skyColor) {
        this.lightingManager.lights.hemisphere.color.setHex(parseInt(hemi.skyColor))
      }
      if (hemi.groundColor) {
        this.lightingManager.lights.hemisphere.groundColor.setHex(parseInt(hemi.groundColor))
      }
      if (hemi.intensity !== undefined) {
        this.lightingManager.lights.hemisphere.intensity = hemi.intensity
      }
    }
  }

  /**
   * Create UI control buttons
   */
  createUIControls() {
    const controls = this.uiManager.createControls()
    
    // Don't add recenter button here - CameraRigControls creates its own
    // Only add skip button
    if (controls.skip && this.story.ui?.controls?.showSkip !== false) {
      controls.skip.onclick = () => this.skipScene()
      this.container.appendChild(controls.skip)
    }

    // Create a "Next Scene" button (hidden initially, shown when scene ends)
    this.createNextSceneButton()
  }

  /**
   * Create next scene navigation button
   */
  createNextSceneButton() {
    const nextBtn = document.createElement('button')
    nextBtn.id = 'sj-next-scene-btn'
    nextBtn.innerHTML = 'Next ▶'
    nextBtn.style.cssText = `
      position: fixed;
      bottom: 28px;
      right: 5%;
      padding: 12px 24px;
      background: rgba(255, 255, 255, 0.2);
      border: 2px solid rgba(255, 255, 255, 0.6);
      color: white;
      font-size: 16px;
      font-weight: 600;
      border-radius: 30px;
      cursor: pointer;
      z-index: 9999;
      display: none;
      transition: all 0.3s ease;
    `
    nextBtn.addEventListener('mouseenter', () => {
      nextBtn.style.background = 'rgba(255, 255, 255, 0.4)'
    })
    nextBtn.addEventListener('mouseleave', () => {
      nextBtn.style.background = 'rgba(255, 255, 255, 0.2)'
    })
    nextBtn.onclick = () => {
      nextBtn.style.display = 'none'
      this.nextScene()
    }
    document.body.appendChild(nextBtn)
    this.nextSceneButton = nextBtn
  }

  /**
   * Handle window resize
   */
  onWindowResize() {
    if (this.camera && this.renderer) {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(window.innerWidth, window.innerHeight)
      // Resize composer for outline effect
      if (this.interactionManager) {
        this.interactionManager.onResize(window.innerWidth, window.innerHeight)
      }
    }
  }

  /**
   * Handle language change
   * @param {string} language - Language code
   */
  handleLanguageChange(language) {
    this.currentLanguage = language
    this.parser.currentLanguage = language
    
    // Update subtitle manager
    if (this.subtitleManager) {
      this.subtitleManager.setLanguage(language)
    }
    
    // Update scene effects
    if (this.sceneEffects) {
      this.sceneEffects.setLanguage(language)
    }
    
    // Update interaction manager
    if (this.interactionManager) {
      this.interactionManager.setLanguage(language)
    }
    
    // Emit event
    document.dispatchEvent(new CustomEvent('languageChanged', { 
      detail: { language } 
    }))
    
    if (this.options.onLanguageChange) {
      this.options.onLanguageChange(language)
    }
  }

  /**
   * Handle scene change
   */
  handleSceneChange(fromId, toId) {
    console.log(`Scene change: ${fromId} -> ${toId}`)
    
    if (this.onSceneChange) {
      this.onSceneChange(fromId, toId)
    }
  }

  /**
   * Handle scene start
   */
  handleSceneStart(scene) {
    console.log(`Scene started: ${scene.id}`)
    
    // Notify subtitle manager
    if (this.subtitleManager) {
      this.subtitleManager.onAudioStart(scene.id)
    }
  }

  /**
   * Handle scene end (audio finished)
   * The ending trigger depends on the story's ending.triggerMode:
   *  - "characterFade": ending is triggered when the character fades out (handled by SceneManager.setupEndingCondition)
   *  - "lastVideo": ending is triggered when the last video ends (handled by SceneManager.triggerVideo)
   *  - default: ending is triggered when the last scene's audio ends (here)
   */
  handleSceneEnd(scene) {
    console.log(`Scene ended: ${scene.id}`)
    
    // Check if this was the last scene
    const scenes = this.sceneManager.getAllScenes()
    const currentIndex = scenes.findIndex(s => s.id === scene.id)
    
    if (currentIndex === scenes.length - 1) {
      // Last scene audio ended
      const endingTrigger = this.story.ending?.endingTrigger
      
      if (endingTrigger === 'lastVideo') {
        // Don't trigger ending from audio - wait for the last video to end
        console.log('Last scene audio ended - waiting for last video to trigger ending')
      } else {
        // Default: trigger ending when audio ends
        console.log('Last scene audio ended - triggering ending sequence')
        this.handleComplete()
      }
    } else {
      // Show next scene button
      if (this.nextSceneButton) {
        this.nextSceneButton.style.display = 'block'
      }
    }
  }

  /**
   * Handle experience completion
   */
  handleComplete() {
    console.log('Experience complete')
    this.isRunning = false
    
    if (this.onComplete) {
      this.onComplete()
    }
    
    // Show ending if configured
    if (this.story.ending) {
      this.showEnding()
    }
  }

  /**
   * Handle recenter
   */
  handleRecenter() {
    if (this.options.onRecenter) {
      this.options.onRecenter()
    }
  }

  /**
   * Update loop
   */
  update() {
    if (!this.isRunning || !this.clock) return

    const delta = this.clock.getDelta()
    
    // Update camera controls
    if (this.cameraControls) {
      this.cameraControls.update()
    }
    
    // Update volumetric lighting
    if (this.volumetricLighting) {
      this.volumetricLighting.update(delta)
    }
    
    // Update video projector
    if (this.videoProjector) {
      this.videoProjector.update()
    }
    
    // Update scene manager (handles character animations)
    if (this.sceneManager) {
      this.sceneManager.update(delta)
    }
    
    // Update interaction manager (rotation animations)
    if (this.interactionManager) {
      this.interactionManager.update()
    }
    
    // Update particles (dust drift, rotation)
    if (this.particleManager) {
      this.particleManager.update()
    }
  }

  /**
   * Start the render loop
   */
  startRenderLoop() {
    const animate = () => {
      requestAnimationFrame(animate)
      
      // Update controls (fallback OrbitControls)
      if (this.controls) {
        this.controls.update()
      }
      
      // Update logic
      this.update()
      
      // Render (use composer if outline effect is available, otherwise direct render)
      if (this.renderer && this.scene && this.camera) {
        const composerRendered = this.interactionManager && this.interactionManager.renderWithComposer()
        if (!composerRendered) {
          this.renderer.render(this.scene, this.camera)
        }
      }
    }
    animate()
  }

  /**
   * Show ending sequence - Ported from original EndingSequence.js
   * Full sequence: fade to black → main text → video + quotes → buttons
   */
  async showEnding() {
    const endingConfig = this.story.ending
    if (!endingConfig) return

    const lang = this.currentLanguage || 'en'
    const fontFamily = `'${this.story.ui?.branding?.font || 'sans-serif'}', Arial, sans-serif`

    // Create ending overlay
    const overlay = document.createElement('div')
    overlay.id = 'sj-ending'
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: black;
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      opacity: 0;
    `

    // Create main text element
    const textElement = document.createElement('p')
    textElement.style.cssText = `
      color: white;
      font-size: 20px;
      max-width: 80%;
      text-align: center;
      font-family: ${fontFamily};
      line-height: 1.6;
      opacity: 0;
      transition: opacity 3s ease;
      padding: 20px;
      white-space: pre-line;
    `
    const mainText = typeof endingConfig.text === 'string'
      ? endingConfig.text
      : (endingConfig.text?.[lang] || endingConfig.text?.en || '')
    textElement.textContent = mainText
    overlay.appendChild(textElement)
    document.body.appendChild(overlay)

    // Step 1: Fade in black overlay (4 seconds)
    await new Promise((resolve) => {
      const startTime = performance.now()
      const duration = 4000
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)
        overlay.style.opacity = progress.toString()
        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          resolve()
        }
      }
      requestAnimationFrame(animate)
    })

    // Step 2: Fade in main text after 2s delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    textElement.style.opacity = '1'

    // Step 3: Keep main text visible for 13 seconds
    await new Promise(resolve => setTimeout(resolve, 13000))

    // Step 4: Fade out main text
    textElement.style.opacity = '0'
    await new Promise(resolve => setTimeout(resolve, 3000))
    textElement.remove()

    // Step 5: Create and append ending video (muted, background)
    let video = null
    if (endingConfig.video) {
      video = document.createElement('video')
      video.src = this.parser.resolvePath(endingConfig.video, this.story.project.assets.basePath)
      video.preload = 'auto'
      video.muted = true
      video.playsInline = true
      video.setAttribute('playsinline', '')
      video.setAttribute('webkit-playsinline', '')
      video.style.cssText = `
        position: absolute;
        width: 100%;
        height: 100%;
        object-fit: cover;
        opacity: 0;
        transition: opacity 2s ease;
      `
      // Hide on desktop (matching original behavior)
      const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
      if (!isMobile) {
        video.style.display = 'none'
      }
      overlay.appendChild(video)

      // Start video asynchronously after 1s delay
      setTimeout(() => {
        video.play().then(() => {
          video.style.opacity = '1'
        }).catch(err => {
          console.error('Error playing ending video:', err)
        })
      }, 1000)
    }

    // Step 6: Display quotes sequence (independent of video)
    const quotes = endingConfig.quotes || []
    if (quotes.length > 0) {
      const quoteElement = document.createElement('p')
      quoteElement.style.cssText = `
        color: white;
        font-size: 20px;
        max-width: 100%;
        text-align: center;
        font-family: ${fontFamily};
        line-height: 1.6;
        opacity: 0;
        transition: opacity 2s ease;
        padding: 20px;
        position: absolute;
        top: 20%;
        left: 50%;
        transform: translate(-50%, -50%);
        white-space: pre-line;
      `
      overlay.appendChild(quoteElement)

      for (let i = 0; i < quotes.length; i++) {
        const quoteText = typeof quotes[i] === 'string'
          ? quotes[i]
          : (quotes[i][lang] || quotes[i].en || '')
        quoteElement.textContent = quoteText
        quoteElement.style.opacity = '1'

        if (i === 0) {
          await new Promise(resolve => setTimeout(resolve, 3000))
          quoteElement.style.opacity = '0'
          await new Promise(resolve => setTimeout(resolve, 4000))
        } else if (i === 1) {
          await new Promise(resolve => setTimeout(resolve, 4000))
          quoteElement.style.opacity = '0'
          await new Promise(resolve => setTimeout(resolve, 2000))
        } else if (i === 2) {
          await new Promise(resolve => setTimeout(resolve, 2000))
          quoteElement.style.opacity = '0'
          await new Promise(resolve => setTimeout(resolve, 1000))
        } else {
          await new Promise(resolve => setTimeout(resolve, 2000))
          quoteElement.style.opacity = '0'
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      quoteElement.remove()
    }

    // Step 7: Show buttons
    const buttonContainer = document.createElement('div')
    buttonContainer.style.cssText = `
      position: absolute;
      bottom: 20%;
      left: 50%;
      transform: translate(-50%, 0);
      width: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 16px;
      opacity: 0;
      transition: opacity 2s ease;
    `

    const buttons = endingConfig.buttons || {}

    if (buttons.learnMore) {
      const learnMoreBtn = document.createElement('button')
      learnMoreBtn.style.cssText = `
        padding: 12px 32px;
        font-size: 16px;
        background: rgba(255,255,255,0.15);
        border: 2px solid rgba(255,255,255,0.6);
        color: white;
        border-radius: 30px;
        cursor: pointer;
        font-family: ${fontFamily};
      `
      learnMoreBtn.textContent = typeof buttons.learnMore === 'string'
        ? buttons.learnMore
        : (buttons.learnMore[lang] || buttons.learnMore.en || 'Learn More')
      learnMoreBtn.onclick = () => {
        const url = buttons.learnMore.url || '#'
        window.open(url, '_blank')
      }
      buttonContainer.appendChild(learnMoreBtn)
    }

    if (buttons.returnHome) {
      const returnBtn = document.createElement('button')
      returnBtn.style.cssText = `
        padding: 12px 32px;
        font-size: 16px;
        background: rgba(255,255,255,0.15);
        border: 2px solid rgba(255,255,255,0.6);
        color: white;
        border-radius: 30px;
        cursor: pointer;
        font-family: ${fontFamily};
      `
      returnBtn.textContent = typeof buttons.returnHome === 'string'
        ? buttons.returnHome
        : (buttons.returnHome[lang] || buttons.returnHome.en || 'Return to Title Screen')
      returnBtn.onclick = () => {
        window.location.reload()
      }
      buttonContainer.appendChild(returnBtn)
    }

    overlay.appendChild(buttonContainer)

    // Fade in buttons after 1 second
    await new Promise(resolve => setTimeout(resolve, 1000))
    buttonContainer.style.opacity = '1'

    // Clean up video and quote elements
    if (video) video.remove()
  }

  /**
   * Navigation methods
   */
  nextScene() {
    if (this.nextSceneButton) {
      this.nextSceneButton.style.display = 'none'
    }
    if (this.sceneManager) {
      this.sceneManager.nextScene()
    }
  }

  previousScene() {
    if (this.sceneManager) {
      this.sceneManager.previousScene()
    }
  }

  skipScene() {
    if (this.nextSceneButton) {
      this.nextSceneButton.style.display = 'none'
    }
    if (this.sceneManager) {
      this.sceneManager.skipCurrentScene()
    }
  }

  goToScene(sceneId) {
    if (this.sceneManager) {
      this.sceneManager.changeScene(sceneId)
    }
  }

  pause() {
    if (this.sceneManager) {
      this.sceneManager.pause()
    }
  }

  resume() {
    if (this.sceneManager) {
      this.sceneManager.resume()
    }
  }

  recenter() {
    if (this.cameraControls) {
      this.cameraControls.recenter()
    }
    document.dispatchEvent(new CustomEvent('sjRecenter'))
    
    if (this.options.onRecenter) {
      this.options.onRecenter()
    }
  }

  setLanguage(language) {
    this.handleLanguageChange(language)
  }

  getCurrentScene() {
    return this.sceneManager?.getCurrentScene()
  }

  getScenes() {
    return this.sceneManager?.getAllScenes() || []
  }

  getStory() {
    return this.story
  }

  /**
   * Clean up and dispose
   */
  dispose() {
    this.isRunning = false
    
    if (this.sceneManager) this.sceneManager.dispose()
    if (this.audioManager) this.audioManager.dispose()
    if (this.videoProjector) this.videoProjector.dispose()
    if (this.characterManager) this.characterManager.dispose()
    if (this.lightingManager) this.lightingManager.dispose()
    if (this.uiManager) this.uiManager.dispose()
    if (this.subtitleManager) this.subtitleManager.dispose()
    if (this.cameraControls) this.cameraControls.dispose()
    if (this.volumetricLighting) this.volumetricLighting.dispose()
    if (this.sceneEffects) this.sceneEffects.dispose()
    if (this.interactionManager) this.interactionManager.dispose()
    if (this.particleManager) this.particleManager.dispose()
    if (this.assetLoader) this.assetLoader.clearAll()
    
    // Remove next scene button
    if (this.nextSceneButton && this.nextSceneButton.parentNode) {
      this.nextSceneButton.remove()
    }
    
    // Remove renderer
    if (this.renderer && this.renderer.domElement) {
      this.renderer.domElement.remove()
      this.renderer.dispose()
    }
    
    this.story = null
    this.isInitialized = false
  }
}

export default Engine
