/**
 * SJEngine - Main Spatial Journalism Engine class
 * Orchestrates all managers and provides the public API
 */

import { JSONParser } from './JSONParser.js'
import { AssetLoader } from './AssetLoader.js'
import { AudioManager } from '../managers/AudioManager.js'
import { VideoManager } from '../managers/VideoManager.js'
import { CharacterManager } from '../managers/CharacterManager.js'
import { LightingManager } from '../managers/LightingManager.js'
import { SceneManager } from '../managers/SceneManager.js'
import { UIManager } from '../managers/UIManager.js'

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
    this.videoManager = null
    this.characterManager = null
    this.lightingManager = null
    this.sceneManager = null
    this.uiManager = null
    
    // Three.js references
    this.scene = null
    this.camera = null
    this.renderer = null
    this.roomModel = null
    
    // State
    this.story = null
    this.isInitialized = false
    this.isRunning = false
    this.mode = 'ar'
    this.clock = null
    
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

      // Initialize UI Manager first
      this.uiManager = new UIManager({
        container: this.container,
        defaultLanguage: this.story.project.defaultLanguage,
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
   * Initialize Three.js scene (called after mode selection)
   * @param {object} threeRefs - Three.js references (scene, camera, renderer)
   */
  initThree(threeRefs = {}) {
    this.scene = threeRefs.scene || new THREE.Scene()
    this.camera = threeRefs.camera
    this.renderer = threeRefs.renderer
    this.roomModel = threeRefs.roomModel || this.scene

    // Initialize clock for animations
    this.clock = new THREE.Clock()

    // Initialize asset loader
    this.assetLoader.init()
    if (threeRefs.gltfLoader) {
      this.assetLoader.setGLTFLoader(threeRefs.gltfLoader)
    }

    // Initialize managers
    this.audioManager = new AudioManager(this.camera)
    this.videoManager = new VideoManager(this.roomModel)
    this.characterManager = new CharacterManager(this.roomModel, this.assetLoader)
    this.lightingManager = new LightingManager(this.scene)

    // Set lights if provided
    if (threeRefs.lights) {
      this.lightingManager.setLights(threeRefs.lights)
    } else {
      this.lightingManager.initDefaultLighting()
    }

    // Initialize scene manager
    this.sceneManager = new SceneManager({
      audioManager: this.audioManager,
      videoManager: this.videoManager,
      characterManager: this.characterManager,
      lightingManager: this.lightingManager,
      onSceneChange: (from, to) => this.handleSceneChange(from, to),
      onSceneStart: (scene) => this.handleSceneStart(scene),
      onSceneEnd: (scene) => this.handleSceneEnd(scene)
    })

    // Load scenes
    this.sceneManager.loadScenes(this.story.scenes)
  }

  /**
   * Handle start button
   */
  async handleStart() {
    // Show mode selection if multiple modes available
    if (this.story.project.modes?.length > 1) {
      this.uiManager.hide('homeScreen')
      const modeSelection = this.uiManager.createModeSelection()
      this.container.appendChild(modeSelection)
    } else {
      // Start with default mode
      this.startExperience(this.story.project.modes?.[0] || 'ar')
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
      // Preload assets
      const assetsToPreload = [
        this.story.project.assets.environment,
        ...(this.story.project.assets.preload || [])
      ].filter(Boolean).map(path => 
        this.parser.resolvePath(path, this.story.project.assets.basePath)
      )

      await this.assetLoader.preload(assetsToPreload, (progress) => {
        this.uiManager.updateLoadingProgress(progress)
      })

      // Load environment
      const envPath = this.parser.resolvePath(
        this.story.project.assets.environment,
        this.story.project.assets.basePath
      )
      const envGltf = await this.assetLoader.load(envPath)
      
      if (envGltf?.scene) {
        this.roomModel = envGltf.scene
        this.scene.add(this.roomModel)
        
        // Update managers with room model
        this.videoManager.scene = this.roomModel
        this.characterManager.scene = this.roomModel
      }

      this.uiManager.hideLoading()

      // Create control buttons
      const controls = this.uiManager.createControls()
      if (controls.recenter) {
        controls.recenter.onclick = () => this.recenter()
        this.container.appendChild(controls.recenter)
      }
      if (controls.skip) {
        controls.skip.onclick = () => this.skipScene()
        this.container.appendChild(controls.skip)
      }

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
   * Handle language change
   * @param {string} language - Language code
   */
  handleLanguageChange(language) {
    // Update parser's language context
    this.parser.currentLanguage = language
    
    // Emit event for external handlers
    if (this.options.onLanguageChange) {
      this.options.onLanguageChange(language)
    }
  }

  /**
   * Handle scene change
   * @param {string} fromId - Previous scene ID
   * @param {string} toId - New scene ID
   */
  handleSceneChange(fromId, toId) {
    console.log(`Scene change: ${fromId} -> ${toId}`)
    
    if (this.onSceneChange) {
      this.onSceneChange(fromId, toId)
    }
  }

  /**
   * Handle scene start
   * @param {object} scene - Scene configuration
   */
  handleSceneStart(scene) {
    console.log(`Scene started: ${scene.id}`)
  }

  /**
   * Handle scene end
   * @param {object} scene - Scene configuration
   */
  handleSceneEnd(scene) {
    console.log(`Scene ended: ${scene.id}`)
    
    // Check if this was the last scene
    const scenes = this.sceneManager.getAllScenes()
    const currentIndex = scenes.findIndex(s => s.id === scene.id)
    
    if (currentIndex === scenes.length - 1) {
      this.handleComplete()
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
   * Show ending sequence
   */
  showEnding() {
    // TODO: Implement ending sequence based on story.ending configuration
  }

  /**
   * Update loop (call in animation frame)
   */
  update() {
    if (!this.isRunning || !this.clock) return

    const delta = this.clock.getDelta()
    
    // Update scene manager (handles character animations)
    if (this.sceneManager) {
      this.sceneManager.update(delta)
    }
  }

  /**
   * Go to next scene
   */
  nextScene() {
    if (this.sceneManager) {
      this.sceneManager.nextScene()
    }
  }

  /**
   * Go to previous scene
   */
  previousScene() {
    if (this.sceneManager) {
      this.sceneManager.previousScene()
    }
  }

  /**
   * Skip current scene
   */
  skipScene() {
    if (this.sceneManager) {
      this.sceneManager.skipCurrentScene()
    }
  }

  /**
   * Go to specific scene
   * @param {string} sceneId - Scene identifier
   */
  goToScene(sceneId) {
    if (this.sceneManager) {
      this.sceneManager.changeScene(sceneId)
    }
  }

  /**
   * Pause the experience
   */
  pause() {
    if (this.sceneManager) {
      this.sceneManager.pause()
    }
  }

  /**
   * Resume the experience
   */
  resume() {
    if (this.sceneManager) {
      this.sceneManager.resume()
    }
  }

  /**
   * Recenter the camera (for AR mode)
   */
  recenter() {
    // Emit recenter event for external handlers
    document.dispatchEvent(new CustomEvent('sjRecenter'))
    
    if (this.options.onRecenter) {
      this.options.onRecenter()
    }
  }

  /**
   * Set language
   * @param {string} language - Language code
   */
  setLanguage(language) {
    if (this.uiManager) {
      this.uiManager.setLanguage(language)
    }
  }

  /**
   * Get current scene
   * @returns {object} Current scene configuration
   */
  getCurrentScene() {
    return this.sceneManager?.getCurrentScene()
  }

  /**
   * Get all scenes
   * @returns {array} All scene configurations
   */
  getScenes() {
    return this.sceneManager?.getAllScenes() || []
  }

  /**
   * Get story configuration
   * @returns {object} Story configuration
   */
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
    if (this.videoManager) this.videoManager.dispose()
    if (this.characterManager) this.characterManager.dispose()
    if (this.lightingManager) this.lightingManager.dispose()
    if (this.uiManager) this.uiManager.dispose()
    if (this.assetLoader) this.assetLoader.clearAll()
    
    this.story = null
    this.isInitialized = false
  }
}

export default Engine
