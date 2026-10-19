import { renderCinematicEnding } from '../ui/cinematicEnding.js'
import { captionStyles, normalizeCaptionStyle } from '../ui/captionStyle.js'
/**
 * SJEngine - Main Spatial Journalism Engine class
 * Orchestrates all managers and provides the public API
 * Features ported from Shadows of the Stabilisation Point
 */

import { SceneButtonManager } from '../managers/SceneButtonManager.js'
import { sceneButtonTarget } from '../ui/sceneButtons.js'
import { SoundscapeManager } from '../managers/SoundscapeManager.js'
import { showReaderGuide } from '../managers/ReaderGuide.js'
import { loadEighthWall, createEighthWallScene } from '../xr/EighthWall.js'
import storySchema from '../../schema/story.schema.json'
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
    this.container =
      options.container ||
      document.getElementById('sj-container') ||
      document.body

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
      await this.parser.loadSchema(storySchema)

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
        onStart: options => this.handleStart(options)
      })
      this.uiManager.resolveAssetPath = (path) =>
        this.parser.resolvePath(path, this.story.project.assets.basePath)
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
  async handleStart(options = {}) {
    if (['guided','explore'].includes(options.navigation)) this.navigationMode = options.navigation
    if (['3d','ar','vr'].includes(options.mode) && this.story.project.modes?.includes(options.mode)) {
      this.startExperience(options.mode)
      return
    }
    // Check for forced mode from URL params (used by Creator preview)
    const params = new URLSearchParams(window.location.search)
    const forcedMode = params.get('mode')
    if (forcedMode) {
      this.startExperience(forcedMode)
      return
    }

    if (this.story.camera?.navigation === 'immersive') {
      const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1
      this.startExperience(mobile && this.story.project.modes?.includes('ar') ? 'ar' : '3d')
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
    if (this.starting || this.isRunning) return
    this.immersiveNavigation = this.story.camera?.navigation === 'immersive'
    if (!this.navigationMode && (this.immersiveNavigation || this.story.camera?.chooseMode)) {
      this.uiManager.hide('homeScreen')
      if (!this.navigationDialog?.isConnected) this.navigationDialog = showReaderGuide({
        choose: true, language: this.currentLanguage, mode: this.story.camera.defaultMode,
        physical: mode === 'ar' && this.immersiveNavigation,
        onChoose: selected => { this.navigationMode = selected; this.startExperience(mode) }
      })
      return
    }
    this.guidedEnabled = (this.navigationMode || this.story.camera?.defaultMode || 'guided') === 'guided'
    this.starting = true
    this.mode = mode
    this.uiManager.showLoading('Loading experience...')
    this.uiManager.hide('homeScreen')

    try {
      const arConfig = this.story.project.ar || {}
      const backend =
        new URLSearchParams(window.location.search).get('arBackend') ||
        arConfig.backend ||
        'auto'
      const imageTracking = arConfig.tracking === 'image'
      if ((mode === 'ar' || mode === 'vr') && !window.isSecureContext)
        throw new Error(
          'AR and VR need a secure connection. Open this player over HTTPS on your device.'
        )
      if (
        mode === 'vr' ||
        (mode === 'ar' && backend !== '8thwall' && !imageTracking && !this.immersiveNavigation)
      ) {
        try {
          if (!navigator.xr) {
            const error = new Error('WebXR is unavailable.')
            error.name = 'NotSupportedError'
            throw error
          }
          this.xrSession = await navigator.xr.requestSession(
            mode === 'vr' ? 'immersive-vr' : 'immersive-ar',
            {
              optionalFeatures: [
                'local-floor',
                'dom-overlay',
                ...(mode === 'ar' ? ['hit-test'] : [])
              ],
              domOverlay: { root: document.body }
            }
          )
        } catch (error) {
          if (
            mode !== 'ar' ||
            backend === 'webxr' ||
            error.name !== 'NotSupportedError'
          )
            throw error
          this.eighthWall = await loadEighthWall()
        }
      } else if (mode === 'ar')
        this.eighthWall = await loadEighthWall({ imageTracking })
      await this.initializeThreeScene()

      // Preload and load environment
      await this.loadEnvironment()
      if (this.xrSession) await this.initializeNativeXR()
      if (this.eighthWall) {
        if (this.immersiveNavigation) this.arPlaced = true
        else this.prepareEighthWallPlacement()
      }

      // Initialize subtitle manager
      this.subtitleManager = new SubtitleManager({
        defaultLanguage: this.currentLanguage,
        totalScenes: this.story.scenes.length,
        captionStyle: this.story.ui?.captions,
        captionFont: this.story.ui?.branding?.font
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
      this.sceneButtons = new SceneButtonManager(this)

      this.uiManager.hideLoading()

      // Create control buttons
      this.createUIControls()

      // Start first scene
      this.isRunning = true
      await this.sceneManager.activateScene(this.story.scenes[0].id)
      if (this.mode === 'ar' && !this.arPlaced) this.sceneManager.pause()
    } catch (error) {
      if (error.name === 'NotSupportedError')
        error = new Error(
          mode.toUpperCase() +
            ' is not available on this device or browser. You can explore the same story in Web 3D.'
        )
      else if (error.name === 'NotAllowedError')
        error = new Error(
          'Camera or immersive access was not allowed. Check this site’s permissions in your browser, then reload, or continue in Web 3D.'
        )
      else if (error.name === 'SecurityError')
        error = new Error(
          'The browser did not allow an immersive session. Open the player over HTTPS and allow access, or continue in Web 3D.'
        )
      if (this.eighthWall) this.eighthWall.stop()
      this.arPrompt?.remove()
      console.error('Failed to start experience:', error)
      this.uiManager.hideLoading()
      if (this.xrSession) {
        await this.xrSession.end().catch(() => {})
        this.xrSession = null
      }
      this.showPlayerError(error)
      if (this.onError) {
        this.onError(error)
      }
    } finally {
      this.starting = false
    }
  }

  showPlayerError(error) {
    this.eighthWall?.stop()
    this.sceneManager?.pause()
    this.arPrompt?.remove()
    document.getElementById('sj-player-error')?.remove()
    const panel = document.createElement('div')
    panel.id = 'sj-player-error'
    panel.setAttribute('role', 'alert')
    panel.style.cssText =
      'position:fixed;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:24px;padding:40px;background:#f7f7f5;color:#222222;z-index:20000;font:17px/1.5 Segoe UI,sans-serif;text-align:center'
    const message = document.createElement('p')
    message.textContent = error.message
    panel.appendChild(message)
    const retry = document.createElement('button')
    retry.textContent = 'Continue in Web 3D'
    retry.style.cssText =
      'padding:14px 24px;border:0;border-radius:8px;background:#222222;color:white;font:inherit;cursor:pointer'
    retry.onclick = () => {
      const url = new URL(window.location.href)
      url.searchParams.set('mode', '3d')
      window.location.replace(url.href)
    }
    panel.appendChild(retry)
    this.container.appendChild(panel)
  }

  async initializeNativeXR() {
    const session = this.xrSession
    this.renderer.xr.setReferenceSpaceType('local')
    const rig = new THREE.Group()
    this.scene.add(rig)
    rig.add(this.camera)
    if (this.mode === 'vr') {
      const p = this.story.camera?.initialPosition || [0, 1.6, 0]
      rig.position.set(p[0], p[1], p[2])
      rig.rotation.y = this.story.camera?.initialRotation?.[1] || 0
    }
    this.camera.position.set(0, 0, 0)
    this.camera.rotation.set(0, 0, 0)
    for (let i = 0; i < 2; i++) {
      const controller = this.renderer.xr.getController(i)
      rig.add(controller)
      controller.addEventListener('select', () => {
        if (this.mode !== 'ar' || this.arPlaced) {
          controller.updateMatrixWorld(true)
          const ray = new THREE.Raycaster()
          ray.ray.origin.setFromMatrixPosition(controller.matrixWorld)
          ray.ray.direction.set(0, 0, -1).transformDirection(controller.matrixWorld)
          if (this.sceneButtons?.activateRay(ray)) return
        }
        if (this.mode === 'ar') {
          this.placeARStory()
          return
        }
        if (i === 0) {
          this.sceneManager?.paused ? this.resume() : this.pause()
        } else this.nextScene()
      })
    }
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 256
    const material = new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(canvas),
      depthTest: false,
      depthWrite: false,
      transparent: true
    })
    this.xrCaption = new THREE.Sprite(material)
    this.xrCaption.position.set(0, -0.5, -2)
    this.xrCaption.scale.set(2, 0.5, 1)
    this.xrCaption.renderOrder = 999
    this.camera.add(this.xrCaption)
    this.xrCaptionCanvas = canvas
    session.addEventListener(
      'end',
      () => {
        const wasRunning = this.isRunning
        this.xrSession = null
        this.sceneManager?.pause()
        this.isRunning = false
        this.playbackBar?.remove()
        if (wasRunning)
          this.showPlayerError(
            new Error(
              'Immersive session ended. Continue exploring in your browser.'
            )
          )
      },
      { once: true }
    )
    session.addEventListener('visibilitychange', () => {
      if (session.visibilityState !== 'visible') {
        if (!this._xrHidden)
          this._resumeAfterVisible = !this.sceneManager?.paused
        this._xrHidden = true
        this.sceneManager?.pause()
      } else {
        if (this._resumeAfterVisible && (this.mode !== 'ar' || this.arPlaced))
          this.sceneManager?.resume()
        this._xrHidden = false
        this._resumeAfterVisible = false
      }
    })
    await this.renderer.xr.setSession(session)
    if (this.mode === 'ar') {
      this.roomModel.visible = false
      this.arReticle = new THREE.Mesh(
        new THREE.RingGeometry(0.12, 0.15, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0xffdf4d, side: THREE.DoubleSide })
      )
      this.arReticle.matrixAutoUpdate = false
      this.arReticle.visible = false
      this.scene.add(this.arReticle)
      this.arPrompt = document.createElement('div')
      this.arPrompt.textContent =
        'Move your phone to find a surface. Tap to place the story.'
      this.arPrompt.style.cssText =
        'position:fixed;bottom:24px;left:10%;width:80%;padding:14px;background:white;color:#222222;text-align:center;border-radius:8px;z-index:9999'
      document.body.appendChild(this.arPrompt)
      if (session.requestHitTestSource)
        try {
          const viewer = await session.requestReferenceSpace('viewer')
          this.arHitSource = await session.requestHitTestSource({
            space: viewer
          })
        } catch {
          this.arPrompt.textContent =
            'Tap to place the story two metres in front of you.'
        }
      else
        this.arPrompt.textContent =
          'Tap to place the story two metres in front of you.'
    }
  }

  updateARPlacement(frame) {
    if (!frame || !this.arReticle || this.arPlaced || !this.arHitSource) return
    const hit = frame.getHitTestResults(this.arHitSource)[0]
    this.arReticle.visible = !!hit
    if (hit) {
      const pose = hit.getPose(this.renderer.xr.getReferenceSpace())
      if (pose) this.arReticle.matrix.fromArray(pose.transform.matrix)
    }
  }

  placeARStory() {
    if (this.arPlaced || !this.roomModel) return
    if (this.arHitSource && !this.arReticle?.visible) return
    if (this.arReticle?.visible)
      this.roomModel.position.setFromMatrixPosition(this.arReticle.matrix)
    else {
      const camera = this.renderer.xr.getCamera(this.camera)
      const forward = new THREE.Vector3(0, -0.5, -2)
      forward.applyMatrix4(camera.matrixWorld)
      this.roomModel.position.copy(forward)
    }
    this.roomModel.visible = true
    this.arPlaced = true
    if (this.arReticle) this.arReticle.visible = false
    this.arPrompt?.remove()
    this.sceneManager?.resume()
  }

  updateXRCaption() {
    if (!this.xrSession || !this.xrCaption) return
    const title = this.sceneManager?.currentScene?.name || ''
    const caption = this.subtitleManager?.subtitleElement?.textContent || ''
    const style = normalizeCaptionStyle(this.story.ui?.captions)
    const key = title + caption + JSON.stringify(style) + document.fonts?.status
    if (key === this._captionKey) return
    this._captionKey = key
    const css = captionStyles(style, this.story.ui?.branding?.font)
    const canvas = this.xrCaptionCanvas, ctx = canvas.getContext('2d')
    const fontSize = style.fontSize * 2, padding = Math.max(20, style.padding * 2), lineHeight = fontSize * style.lineHeight
    const font = style.fontWeight + ' ' + fontSize + 'px ' + css.text.fontFamily
    ctx.font = font
    const lines = []; let line = ''
    for (const word of caption.split(/\s+/)) {
      if (line && ctx.measureText(line + ' ' + word).width > 1024 - padding * 2) { lines.push(line); line = '' }
      line += (line ? ' ' : '') + word
    }
    if (line) lines.push(line)
    canvas.height = Math.max(180, Math.ceil(100 + padding * 2 + lines.length * lineHeight))
    ctx.clearRect(0, 0, 1024, canvas.height)
    ctx.fillStyle = css.text.background
    ctx.beginPath(); ctx.roundRect(0, 0, 1024, canvas.height, style.radius * 2); ctx.fill()
    ctx.fillStyle = style.color; ctx.textAlign = style.align
    const x = style.align === 'left' ? padding : style.align === 'right' ? 1024 - padding : 512
    ctx.font = '24px sans-serif'; ctx.fillText(title, x, 34)
    ctx.font = font
    if (style.textShadow) { ctx.shadowColor = '#000'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 2 }
    lines.forEach((text, i) => ctx.fillText(text, x, 62 + padding + fontSize + i * lineHeight))
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.font = '20px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('Left trigger: pause / resume     Right trigger: next chapter',512,canvas.height-18)
    const width = Math.min(2.2, 2 * style.width / 90)
    this.xrCaption.scale.set(width, Math.min(1.2, width * canvas.height / 1024), 1)
    this.xrCaption.position.y = (style.position === 'top' ? 1 : -1) * (.25 + style.offset / 320)
    this.xrCaption.material.map.needsUpdate = true
  }

  /**
   * Initialize Three.js scene and managers
   */
  async initializeThreeScene() {
    if (this.scene) return // Already initialized

    if (this.eighthWall) {
      const ar = this.story.project.ar || {}
      const targets = ar.tracking === 'image' ? ar.imageTargets || [] : []
      if (ar.tracking === 'image' && !targets.length)
        throw new Error(
          'Add an image target in Appearance before starting image AR.'
        )
      const imageTargets = targets.map((target) => ({
        ...target,
        imagePath: this.parser.resolvePath(
          target.imagePath,
          this.story.project.assets.basePath
        )
      }))
      const result = await createEighthWallScene(this.eighthWall, {
        container: this.container,
        imageTargets,
        disableWorldTracking: this.immersiveNavigation && this.guidedEnabled && this.story.camera.guidedTracking !== 'world',
        onUpdate: () => this.update(),
        onTracking: (detail) => this.onARTracking(detail),
        onImage: (state, detail) => this.onARImage(state, detail),
        onError: (error) => {
          this.sceneManager?.pause()
          this.showPlayerError(error)
        }
      })
      this.scene = result.scene
      this.camera = result.camera
      this.renderer = result.renderer
      this._arCanvas = result.canvas
    } else this.scene = new THREE.Scene()
    this.clock = new THREE.Clock()

    if (!this.eighthWall) {
      // Create camera
      this.camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      )

      // Create renderer
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      this.renderer.setSize(window.innerWidth, window.innerHeight)
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      // Match original project's renderer settings exactly:
      // sRGBEncoding + ACESFilmicToneMapping + exposure 2 creates the cinematic look
      this.renderer.outputEncoding = THREE.sRGBEncoding
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping
      this.renderer.toneMappingExposure = 2
      this.container.appendChild(this.renderer.domElement)
    }

    // Handle window resize
    this._resizeHandler = () => this.onWindowResize()
    window.addEventListener('resize', this._resizeHandler)

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
      getTime: () => this.sceneManager?.elapsed || 0,
      lights: this.lightingManager.lights,
      language: this.currentLanguage
    })

    // Initialize camera controls based on mode and config
    if (this.eighthWall) {
      // Keep the tracker-owned camera local to a navigable story rig.
      if (this.immersiveNavigation) this.initializeCameraControls()
    } else if (this.xrSession) {
      this.renderer.xr.enabled = true
      this.startRenderLoop()
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
      tracked: !!this.eighthWall,
      rotationEnabled: cameraConfig.rotationEnabled !== false,
      onNavigate: () => this.guidedCameraController?.interrupt(),
      moveSpeed: cameraConfig.moveSpeed || 0.005,
      rotateSpeed: cameraConfig.rotateSpeed || 0.003,
      bounds: cameraConfig.bounds || {
        minX: -1.5,
        maxX: 2.5,
        minY: -0.25,
        maxY: 2.5,
        minZ: -2.5,
        maxZ: 2.5
      },
      buffer: cameraConfig.buffer ?? 0.5,
      // initialPosition/Rotation: where the camera starts at the beginning of the experience
      initialPosition: cameraConfig.initialPosition
        ? {
            x: cameraConfig.initialPosition[0],
            y: cameraConfig.initialPosition[1],
            z: cameraConfig.initialPosition[2]
          }
        : null,
      initialRotation: cameraConfig.initialRotation
        ? {
            x: cameraConfig.initialRotation[0],
            y: cameraConfig.initialRotation[1],
            z: cameraConfig.initialRotation[2]
          }
        : null,
      // recenterPosition/Rotation: the "home" position when user presses recenter
      recenterPosition: cameraConfig.recenterPosition
        ? {
            x: cameraConfig.recenterPosition[0],
            y: cameraConfig.recenterPosition[1],
            z: cameraConfig.recenterPosition[2]
          }
        : { x: 2, y: 0, z: -1.5 },
      recenterRotation: cameraConfig.recenterRotation
        ? {
            x: cameraConfig.recenterRotation[0],
            y: cameraConfig.recenterRotation[1],
            z: cameraConfig.recenterRotation[2]
          }
        : { x: 0, y: Math.PI / 2, z: 0 },
      onRecenter: () => this.handleRecenter()
    })
    this.cameraControls.init()
  }

  prepareEighthWallPlacement() {
    this.roomModel.visible = false
    this.arPrompt = document.createElement('div')
    this.arPrompt.style.cssText =
      'position:fixed;bottom:28px;left:5%;width:90%;display:flex;gap:12px;justify-content:center;align-items:center;padding:15px;background:#fff;color:#222;border-radius:10px;z-index:9999;font:14px/1.5 Segoe UI,sans-serif'
    const message = document.createElement('span')
    message.textContent =
      this.story.project.ar?.tracking === 'image'
        ? 'Point your camera at the image target to begin.'
        : 'Move your phone slowly to scan the space. Tap a surface to place your story.'
    this.arPrompt.appendChild(message)
    this.arStatus = message
    if (this.story.project.ar?.tracking !== 'image') {
      this._arPlace = (event) => {
        if (!this.roomModel || this.arPlaced) return
        const rect = this._arCanvas.getBoundingClientRect()
        const hits = this.eighthWall.XrController.hitTest(
          (event.clientX - rect.left) / rect.width,
          (event.clientY - rect.top) / rect.height,
          ['DETECTED_SURFACE', 'ESTIMATED_SURFACE']
        )
        if (!hits.length) {
          this.arStatus.textContent =
            'Keep moving slowly to find a surface, then tap again.'
          return
        }
        this.roomModel.position.copy(hits[0].position)
        this.roomModel.visible = true
        this.arPlaced = true
        this.arPrompt.style.display = 'none'
        this.sceneManager?.resume()
      }
      this._arCanvas.addEventListener('pointerup', this._arPlace)
    }
    document.body.appendChild(this.arPrompt)
    this._arPlacementReady = true
  }

  onARTracking(detail) {
    const status = detail?.status
    if (this.immersiveNavigation) {
      if (status !== this._lastTrackingStatus) this.cameraControls?.preserveTrackingPose()
      this._lastTrackingStatus = status
      return
    }
    if (!this.arPlaced || !this.sceneManager) return
    if (status === 'LIMITED') {
      if (!this._trackingLost)
        this._resumeAfterTracking = !this.sceneManager.paused
      this._trackingLost = true
      this.sceneManager.pause()
      if (this.arPrompt) {
        this.arPrompt.style.display = 'flex'
        this.arStatus.textContent =
          'Tracking interrupted. Move slowly back toward the space.'
      }
    } else if (status === 'NORMAL') {
      if (this._resumeAfterTracking) this.sceneManager.resume()
      this._resumeAfterTracking = false
      this._trackingLost = false
      if (this.arPrompt) this.arPrompt.style.display = 'none'
    }
  }

  onARImage(state, detail) {
    if (!this._arPlacementReady || !this.roomModel || !detail) return
    if (state === 'lost') {
      this.roomModel.visible = false
      if (!this._imageLost) this._resumeAfterImage = !this.sceneManager?.paused
      this._imageLost = true
      this.sceneManager?.pause()
      if (this.arPrompt) this.arPrompt.style.display = 'flex'
      return
    }
    if (!this.imageAnchor) {
      this.imageAnchor = new THREE.Group()
      this.scene.add(this.imageAnchor)
      this.imageAnchor.add(this.roomModel)
    }
    this.imageAnchor.position.copy(detail.position)
    this.imageAnchor.quaternion.copy(detail.rotation)
    this.imageAnchor.scale.setScalar(detail.scale)
    this.roomModel.visible = true
    if (!this.arPlaced || this._resumeAfterImage) this.sceneManager?.resume()
    this.arPlaced = true
    this._resumeAfterImage = false
    this._imageLost = false
    if (this.arPrompt) this.arPrompt.style.display = 'none'
  }

  /**
   * Load environment and assets
   */
  async loadEnvironment() {
    // Preload assets
    const assetsToPreload = [
      this.story.project.assets.environment,
      ...(this.story.project.assets.preload || [])
    ]
      .filter(Boolean)
      .map((path) =>
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
      const envPath = this.parser.resolvePath(
        envAsset,
        this.story.project.assets.basePath
      )
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
        throw new Error(
          'Could not load the space. Check its media file or URL. ' +
            err.message
        )
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
    if (!this.scene.background && (this.mode !== 'ar' || this.immersiveNavigation)) {
      this.scene.background = new THREE.Color(
        this.story.rendering?.background || 0xf0f1eb
      )
    }

    // Set camera initial position from story config
    if (this.mode !== 'ar') this.setupCamera()

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
    this.characterManager = new CharacterManager(
      this.roomModel,
      this.assetLoader
    )

    // Set roomModel on SceneEffects now that it's available
    if (this.sceneEffects) {
      this.sceneEffects.roomModel = this.roomModel
    }

    this.soundscape = new SoundscapeManager(this.audioManager, this.roomModel, path => this.parser.resolvePath(path, this.story.project.assets.basePath))
    await this.soundscape.load(this.story.ambience || [])

    // Initialize interaction manager for interactive objects
    this.interactionManager = new InteractionManager({
      parentObject: this.roomModel,
      camera: this.camera,
      container: this.container,
      language: this.currentLanguage,
      parser: this.parser,
      basePath: this.story.project.assets.basePath,
      fontFamily: this.story.ui?.branding?.font || 'sans-serif',
      onToggle: (id, active) => this.soundscape?.toggleObject(id, active)
    })

    // Load interactive objects from story config
    if (
      this.story.interactableObjects &&
      this.story.interactableObjects.length > 0
    ) {
      await this.interactionManager.loadFromConfig(
        this.story.interactableObjects
      )
      console.log(
        `Loaded ${this.story.interactableObjects.length} interactive objects`
      )
    }

    // Initialize outline postprocessing effect for interactive objects
    if (this.mode !== 'ar')
      this.interactionManager.initOutlineEffect(
        this.scene,
        this.camera,
        this.renderer
      )

    // Initialize guided camera controller if guided keyframes exist in story config
    if (
      (this.mode !== 'ar' || this.immersiveNavigation) &&
      !this.xrSession &&
      this.story.camera?.guided &&
      Object.values(this.story.camera.guided).some((stops) => stops.length > 0)
    ) {
      const cameraRig = this.cameraControls?.cameraRig || null
      this.guidedCameraController = new GuidedCameraController(
        this.camera,
        cameraRig, // null when no CameraRigControls — controller will animate the camera directly
        this.story.camera.guided,
        {
          position: this.story.camera.initialPosition || [0, 1.6, 3],
          rotation: this.story.camera.initialRotation || [0, 0, 0]
        }
      )

      console.log(
        'Guided camera controller initialized with keyframes',
        cameraRig ? '(rig mode)' : '(direct camera mode)'
      )
    }
  }

  /**
   * Setup camera position and rotation from story config
   */
  setupCamera() {
    if (this.xrSession) return
    const cameraConfig = this.story.camera || {}

    // When the camera rig is active, positioning is handled by CameraRigControls
    // (which already reads initialPosition / initialRotation from the config).
    // Directly setting camera.position here would only set a LOCAL offset inside
    // the rig, which is incorrect.
    if (this.cameraControls?.cameraRig) {
      // Re-apply position through the rig in case loadEnvironment is called
      // after initializeCameraControls
      const pos = cameraConfig.initialPosition
        ? {
            x: cameraConfig.initialPosition[0],
            y: cameraConfig.initialPosition[1],
            z: cameraConfig.initialPosition[2]
          }
        : this.cameraControls.settings.recenterPosition
      const rot = cameraConfig.initialRotation
        ? {
            x: cameraConfig.initialRotation[0],
            y: cameraConfig.initialRotation[1],
            z: cameraConfig.initialRotation[2]
          }
        : this.cameraControls.settings.recenterRotation

      this.cameraControls.setPosition(
        new THREE.Vector3(pos.x, pos.y, pos.z),
        new THREE.Quaternion().setFromEuler(
          new THREE.Euler(rot.x, rot.y, rot.z)
        )
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
        none: THREE.NoToneMapping,
        NoToneMapping: THREE.NoToneMapping,
        linear: THREE.LinearToneMapping,
        LinearToneMapping: THREE.LinearToneMapping,
        reinhard: THREE.ReinhardToneMapping,
        ReinhardToneMapping: THREE.ReinhardToneMapping,
        cineon: THREE.CineonToneMapping,
        CineonToneMapping: THREE.CineonToneMapping,
        ACESFilmic: THREE.ACESFilmicToneMapping,
        ACESFilmicToneMapping: THREE.ACESFilmicToneMapping
      }
      this.renderer.toneMapping =
        mappings[renderConfig.toneMapping] ?? THREE.ACESFilmicToneMapping
    }
    if (renderConfig.toneMappingExposure !== undefined) {
      this.renderer.toneMappingExposure = renderConfig.toneMappingExposure
    }

    // Fog
    if (renderConfig.fog) {
      const fogColor = parseInt(
        (renderConfig.fog.color || '0xcccccc').replace(/^#|^0x/, ''),
        16
      )
      if (renderConfig.fog.type === 'exponential') {
        this.scene.fog = new THREE.FogExp2(
          fogColor,
          renderConfig.fog.density || 0.15
        )
      } else if (renderConfig.fog.type === 'linear') {
        this.scene.fog = new THREE.Fog(
          fogColor,
          renderConfig.fog.near || 1,
          renderConfig.fog.far || 100
        )
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
        this.lightingManager.lights.ambient.color.setHex(
          parseInt(ambient.color.replace(/^#|^0x/, ''), 16)
        )
      }
      if (ambient.intensity !== undefined) {
        this.lightingManager.lights.ambient.intensity = ambient.intensity
      }
    }

    // Update directional light
    if (lightingConfig.directional && this.lightingManager.lights.directional) {
      const dir = lightingConfig.directional
      if (dir.color) {
        this.lightingManager.lights.directional.color.setHex(
          parseInt(dir.color.replace(/^#|^0x/, ''), 16)
        )
      }
      if (dir.intensity !== undefined) {
        this.lightingManager.lights.directional.intensity = dir.intensity
      }
      if (dir.position) {
        this.lightingManager.lights.directional.position.set(
          dir.position[0],
          dir.position[1],
          dir.position[2]
        )
      }
    }

    // Update hemisphere light
    if (lightingConfig.hemisphere && this.lightingManager.lights.hemisphere) {
      const hemi = lightingConfig.hemisphere
      if (hemi.skyColor) {
        this.lightingManager.lights.hemisphere.color.setHex(
          parseInt(hemi.skyColor.replace(/^#|^0x/, ''), 16)
        )
      }
      if (hemi.groundColor) {
        this.lightingManager.lights.hemisphere.groundColor.setHex(
          parseInt(hemi.groundColor.replace(/^#|^0x/, ''), 16)
        )
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
    this.playbackBar?.remove()
    this.playerMenuEvents?.abort()
    const menu = document.createElement('details')
    menu.style.cssText = 'position:fixed;top:16px;right:16px;z-index:9999;color:#222;font:14px Segoe UI,sans-serif'
    const toggle = document.createElement('summary')
    toggle.setAttribute('aria-label', 'Story menu')
    toggle.title = 'Story menu'
    toggle.style.cssText = 'display:flex;align-items:center;justify-content:center;margin-left:auto;width:44px;height:44px;list-style:none;cursor:pointer;background:rgba(255,255,255,.96);border:1px solid #ddd;border-radius:4px;box-shadow:0 2px 12px #0002'
    toggle.innerHTML = '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 6h16M4 12h16M4 18h16"/></svg>'
    menu.appendChild(toggle)
    const bar = document.createElement('nav')
    bar.id = 'sj-story-menu'
    toggle.setAttribute('aria-controls', bar.id)
    menu.addEventListener('toggle', () => toggle.setAttribute('aria-expanded', String(menu.open)))
    toggle.setAttribute('aria-expanded', 'false')
    bar.setAttribute('aria-label', 'Story playback')
    bar.style.cssText =
      'margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:12px;background:rgba(255,255,255,.98);border:1px solid #ddd;border-radius:4px;box-shadow:0 4px 24px #0002;width:min(300px,calc(100vw - 32px));max-height:calc(100dvh - 90px);overflow:auto;box-sizing:border-box'
    const button = (label, action) => {
      const b = document.createElement('button')
      b.textContent = label
      b.style.cssText =
        'padding:10px 12px;border:1px solid #ddd;border-radius:3px;background:white;color:#222;cursor:pointer;font:inherit'
      b.onclick = action
      bar.appendChild(b)
      return b
    }
    button('Previous', () => this.sceneManager.previousScene())
    this.pauseButton = button('Pause', () => {
      if (this.sceneManager.sceneEnded) {
        this.sceneManager.activateScene(this.sceneManager.currentSceneId)
        return
      }
      const paused = this.sceneManager.paused
      paused ? this.resume() : this.pause()
      this.pauseButton.textContent = paused ? 'Pause' : 'Resume'
    })
    const chapters = document.createElement('select')
    chapters.setAttribute('aria-label', 'Current chapter')
    chapters.style.cssText =
      'grid-column:1/-1;width:100%;padding:10px;border:1px solid #ddd;border-radius:3px;background:white;color:#222;font:inherit'
    this.story.scenes.forEach((s, i) => {
      const o = document.createElement('option')
      o.value = s.id
      o.textContent =
        i +
        1 +
        '. ' +
        this.parser.getLocalizedString(
          s.localizedTitle || s.title || s.name || s.id,
          this.currentLanguage
        )
      chapters.appendChild(o)
    })
    chapters.onchange = () => { this.sceneManager.changeScene(chapters.value); menu.open = false }
    bar.appendChild(chapters)
    this.chapterSelect = chapters
    button('Next', () => this.nextScene())
    if (this.guidedCameraController && !this.eighthWall) {
      const mode = document.createElement('select')
      mode.setAttribute('aria-label', 'Camera mode')
      mode.style.cssText = chapters.style.cssText
      for (const [value, label] of [
        ['guided', 'Guided tour'],
        ['explore', 'Explore freely']
      ]) {
        const option = document.createElement('option')
        option.value = value
        option.textContent = label
        mode.appendChild(option)
      }
      mode.value = this.guidedEnabled ? 'guided' : 'explore'
      mode.onchange = () => {
        this.guidedEnabled = mode.value === 'guided'
        this.sceneManager.stopGuidedCamera()
        if (this.guidedEnabled)
          this.sceneManager.startGuidedCamera(this.sceneManager.currentSceneId)
      }
      bar.appendChild(mode)
    }
    if (this.eighthWall) {
      if (!this.immersiveNavigation) button('Place again', () => this.handleRecenter())
      button('Exit AR', () => {
        this.isRunning = false
        this.showPlayerError(
          new Error('Camera stopped. Continue exploring in Web 3D.')
        )
      })
    }
    if (this.cameraControls) {
      if (this.cameraControls.recenterButton) {
        const shortcut=this.cameraControls.recenterButton, settings=this.story.ui.controls||{}
        shortcut.style.display=settings.recenterPlacement==='overlay'?'flex':'none'
        shortcut.setAttribute('aria-label','Recenter view')
        if(settings.recenterIcon){const icon=document.createElement('img');icon.src=this.uiManager.resolveAssetPath(settings.recenterIcon);icon.alt='';icon.style.cssText='width:30px;height:30px;object-fit:contain';shortcut.replaceChildren(icon)}
      }
      button('Recenter view', () => { this.cameraControls.recenter(); menu.open = false })
      const rotation = button('Drag rotation: on', () => {
        this.cameraControls.rotationEnabled = !this.cameraControls.rotationEnabled
        rotation.textContent = 'Drag rotation: ' + (this.cameraControls.rotationEnabled ? 'on' : 'off')
        rotation.setAttribute('aria-pressed', String(this.cameraControls.rotationEnabled))
      })
      rotation.textContent = 'Drag rotation: ' + (this.cameraControls.rotationEnabled ? 'on' : 'off')
      rotation.setAttribute('aria-pressed', String(this.cameraControls.rotationEnabled))
    }
    if (this.story.project.languages.length > 1) {
      const language = document.createElement('select')
      language.setAttribute('aria-label', 'Story language'); language.style.cssText = chapters.style.cssText
      for (const code of this.story.project.languages) {
        const option = document.createElement('option'); option.value = code; option.textContent = code.toUpperCase(); language.appendChild(option)
      }
      language.value = this.currentLanguage
      language.onchange = () => this.handleLanguageChange(language.value)
      bar.appendChild(language)
    }
    button('How to explore', () => {
      const resume = !this.sceneManager.paused
      this.pause()
      showReaderGuide({ language: this.currentLanguage, physical: this.immersiveNavigation && this.mode === 'ar', onClose: () => { if (resume) this.resume(); if (this.pauseButton) this.pauseButton.textContent = this.sceneManager.paused ? 'Resume' : 'Pause' } })
    })
    if (this.xrSession)
      button('Exit ' + this.mode.toUpperCase(), () => this.xrSession?.end())
    menu.appendChild(bar)
    this.container.appendChild(menu)
    this.playbackBar = menu
    this.playerMenuEvents = new AbortController()
    const signal = this.playerMenuEvents.signal
    document.addEventListener('pointerdown', event => { if (!menu.contains(event.target)) menu.open = false }, { signal })
    menu.addEventListener('keydown', event => { if (event.key === 'Escape') { menu.open = false; toggle.focus(); event.stopPropagation() } }, { signal })
    const controls = {} // Navigation is available in the chapter toolbar.

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
    nextBtn.textContent = 'Next chapter →'
    nextBtn.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 5%;
      padding: 12px 24px;
      background: #222222;
      border: 1px solid #222222;
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
    if (this.chapterSelect)
      this.story.scenes.forEach((scene, i) => {
        this.chapterSelect.options[i].textContent =
          i +
          1 +
          '. ' +
          this.parser.getLocalizedString(
            scene.localizedTitle || scene.title || scene.name || scene.id,
            language
          )
      })

    // Update subtitle manager
    if (this.subtitleManager) {
      this.subtitleManager.setLanguage(language)
    }

    // Update scene effects
    if (this.sceneEffects) {
      this.sceneEffects.setLanguage(language)
    }

    if (this.sceneManager?.currentScene) this.sceneButtons?.load(this.sceneManager.currentScene)

    // Update interaction manager
    if (this.interactionManager) {
      this.interactionManager.setLanguage(language)
    }

    // Emit event
    document.dispatchEvent(
      new CustomEvent('languageChanged', {
        detail: { language }
      })
    )

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
    this.completed = false
    if (this.mode === 'ar' && (!this.arPlaced || !this.roomModel.visible))
      this.sceneManager.pause()
    this.sceneButtons?.load(scene)
    console.log(`Scene started: ${scene.id}`)
    if (this.chapterSelect) this.chapterSelect.value = scene.id
    if (this.pauseButton) this.pauseButton.textContent = 'Pause'
    if (this.nextSceneButton) this.nextSceneButton.style.display = 'none'

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
    this.sceneButtons?.update()
    if (this.pauseButton) this.pauseButton.textContent = 'Replay'
    if (scene.sceneButtons?.some(button => sceneButtonTarget(button, this.story.scenes, scene.id))) return
    console.log(`Scene ended: ${scene.id}`)
    if (this.pauseButton) this.pauseButton.textContent = 'Replay'

    // Check if this was the last scene
    const scenes = this.sceneManager.getAllScenes()
    const currentIndex = scenes.findIndex((s) => s.id === scene.id)

    if (scene.id === (this.story.ending?.triggerSceneId || scenes.at(-1)?.id) || currentIndex === scenes.length - 1) {
      // Last scene audio ended
      const endingTrigger = this.story.ending?.endingTrigger

      // Only wait when a final video is actually still playing. Missing fades,
      // empty video lists, or exhausted media must not strand the reader.
      if (
        endingTrigger !== 'lastVideo' ||
        !this.sceneManager.activeVideos.has(this.sceneManager.lastVideoId)
      )
        this.handleComplete()
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
    if (this.completed) return
    this.completed = true
    console.log('Experience complete')
    this.isRunning = false
    this.sceneManager?.pause()
    this.xrSession?.end().catch(() => {})
    this.eighthWall?.stop()
    this.arPrompt?.remove()
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
    if (this.guidedEnabled && this.guidedCameraController?.destination && this.cameraControls) {
      const cue = this.guidedCameraController.destination
      this.guidedCameraController.interrupt()
      this.cameraControls.animateTo(new THREE.Vector3().fromArray(cue.position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...cue.rotation)), 1000)
      return true
    }
    if (this.eighthWall && !this.immersiveNavigation) {
      this.eighthWall.XrController.recenter()
      this.arPlaced = false
      this.roomModel.visible = false
      this.sceneManager?.pause()
      if (this.arPrompt) this.arPrompt.style.display = 'flex'
    }
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

    this.soundscape?.update(!!this.sceneManager?.paused || this._showingEnding)
    this.guidedCameraController?.update()

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

    this.sceneButtons?.update()
    this.updateXRCaption()
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
    const animate = (time, frame) => {
      this.updateARPlacement(frame)
      // Update controls (fallback OrbitControls)
      if (this.controls) {
        this.controls.update()
      }

      // Update logic
      this.update()

      // Render (use composer if outline effect is available, otherwise direct render)
      if (this.renderer && this.scene && this.camera) {
        const composerRendered =
          !this.renderer.xr.isPresenting &&
          this.interactionManager &&
          this.interactionManager.renderWithComposer()
        if (!composerRendered) {
          this.renderer.render(this.scene, this.camera)
        }
      }
    }
    this.renderer.setAnimationLoop(animate)
  }

  /**
   * Show ending sequence - Ported from original EndingSequence.js
   * Full sequence: fade to black → main text → video + quotes → buttons
   */
  async showEnding() {
    this.guidedCameraController?.interrupt()
    this._showingEnding = true
    this.soundscape?.update(true)
    const config = this.story.ending || {}
    this.disposeEnding?.()
    document.getElementById('sj-ending')?.remove()
    const overlay = document.createElement('section')
    overlay.id = 'sj-ending'
    overlay.setAttribute('role', 'dialog')
    overlay.setAttribute('aria-modal', 'true')
    overlay.setAttribute('aria-label', 'Story complete')
    overlay.style.cssText =
      'position:fixed;inset:0;background:rgba(248,248,246,.97);z-index:10000;overflow:auto;display:flex;flex-direction:column;align-items:center;padding:clamp(28px,8vh,90px) 24px;color:#222222;font:16px/1.7 Segoe UI,sans-serif'
    const content = document.createElement('div')
    content.style.cssText = 'width:100%;max-width:660px;text-align:center'
    overlay.appendChild(content)
    const label = document.createElement('p')
    label.textContent = 'STORY COMPLETE'
    label.style.cssText =
      'font-size:11px;letter-spacing:2px;color:#666666;margin-bottom:24px'
    content.appendChild(label)
    const text = document.createElement('h1')
    text.textContent =
      this.parser.getLocalizedString(config.text, this.currentLanguage) ||
      'Thank you for exploring.'
    text.style.cssText =
      'font-size:clamp(24px,4vw,38px);font-weight:400;line-height:1.4;white-space:pre-line;margin-bottom:24px'
    content.appendChild(text)
    if (config.video) {
      const video = document.createElement('video')
      video.src = this.parser.resolvePath(
        config.video,
        this.story.project.assets.basePath
      )
      video.controls = true
      video.playsInline = true
      video.style.cssText =
        'width:100%;max-height:45vh;border-radius:12px;margin:12px 0'
      content.appendChild(video)
    }
    for (const quote of config.quotes || []) {
      const p = document.createElement('blockquote')
      p.textContent = this.parser.getLocalizedString(
        quote,
        this.currentLanguage
      )
      p.style.cssText =
        'font-size:18px;border-left:2px solid #edc93b;padding:8px 20px;margin:20px 0;text-align:left'
      content.appendChild(p)
    }
    const actions = document.createElement('div')
    actions.style.cssText =
      'display:flex;flex-wrap:wrap;justify-content:center;gap:12px;margin-top:32px'
    content.appendChild(actions)
    const style =
      'display:inline-block;padding:12px 24px;border:1px solid #222222;border-radius:8px;background:#222222;color:white;text-decoration:none;font:15px Segoe UI,sans-serif;cursor:pointer'
    const more = config.buttons?.learnMore
    if (more?.url) {
      try {
        const url = new URL(more.url, window.location.href)
        if (['https:', 'http:'].includes(url.protocol)) {
          const link = document.createElement('a')
          link.href = url.href
          link.rel = 'noopener noreferrer'
          link.target = '_blank'
          link.textContent =
            this.parser.getLocalizedString(more, this.currentLanguage) ||
            'Learn more'
          link.style.cssText = style
          actions.appendChild(link)
        }
      } catch {}
    }
    const replay = document.createElement('button')
    replay.textContent =
      this.parser.getLocalizedString(
        config.buttons?.returnHome,
        this.currentLanguage
      ) || 'Return to story'
    replay.style.cssText = style + ';background:transparent;color:#222222'
    replay.onclick = async () => {
      if (this.mode !== '3d' || config.returnToTitle) { window.location.reload(); return }
      this.disposeEnding?.()
      for (const video of overlay.querySelectorAll('video')) video.pause()
      overlay.remove()
      this.completed = false
      this._showingEnding = false
      this.setupCamera()
      try {
        await this.sceneManager.activateScene(this.story.scenes[0].id)
        this.clock.getDelta()
        this.isRunning = true
      } catch(error) { this.showPlayerError(error) }
    }
    actions.appendChild(replay)
    document.body.appendChild(overlay)
    if(config.presentation==='cinematic') {
      overlay.replaceChildren();overlay.style.cssText='position:fixed;inset:0;z-index:10000'
      const stage=document.createElement('div');overlay.appendChild(stage)
      this.disposeEnding=renderCinematicEnding(stage,config,{language:this.currentLanguage,font:this.story.ui.branding?.font,mobile:matchMedia('(max-width:767px)').matches,resolveAsset:p=>this.parser.resolvePath(p,this.story.project.assets.basePath),onReplay:()=>replay.onclick()})
    } else replay.focus()
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
    if (this.pauseButton) this.pauseButton.textContent = 'Resume'
    if (this.sceneManager) {
      this.sceneManager.pause()
    }
  }

  resume() {
    if (
      this.mode === 'ar' &&
      (!this.arPlaced || !this.roomModel?.visible || this._trackingLost)
    )
      return
    if (this.pauseButton) this.pauseButton.textContent = 'Pause'
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
    this.eighthWall?.stop()
    this._arCanvas?.removeEventListener('pointerup', this._arPlace)
    this.renderer?.setAnimationLoop(null)
    this.xrSession?.end().catch(() => {})
    window.removeEventListener('resize', this._resizeHandler)
    this.playbackBar?.remove()
    this.arHitSource?.cancel()
    this.arPrompt?.remove()
    this.arReticle?.geometry.dispose()
    this.arReticle?.material.dispose()
    this.xrCaption?.material.map.dispose()
    this.xrCaption?.material.dispose()
    this.isRunning = false

    if (this.sceneManager) this.sceneManager.dispose()
    this.soundscape?.dispose()
    if (this.audioManager) this.audioManager.dispose()
    if (this.videoProjector) this.videoProjector.dispose()
    if (this.characterManager) this.characterManager.dispose()
    if (this.lightingManager) this.lightingManager.dispose()
    if (this.uiManager) this.uiManager.dispose()
    if (this.subtitleManager) this.subtitleManager.dispose()
    if (this.cameraControls) this.cameraControls.dispose()
    this.guidedCameraController?.destroy()
    if (this.volumetricLighting) this.volumetricLighting.dispose()
    if (this.sceneEffects) this.sceneEffects.dispose()
    this.playerMenuEvents?.abort()
    this.disposeEnding?.()
    this.sceneButtons?.dispose()
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
