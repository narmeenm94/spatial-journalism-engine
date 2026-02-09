/**
 * SceneManager - Manages scene transitions, activation, and state
 * Extracted and refactored from Shadows of the Stabilisation Point
 */

export class SceneManager {
  /**
   * Create SceneManager
   * @param {object} options - Manager options
   */
  constructor(options = {}) {
    this.scenes = new Map()
    this.currentScene = null
    this.currentSceneId = null
    this.isTransitioning = false
    
    this.audioManager = options.audioManager
    this.videoManager = options.videoManager
    this.characterManager = options.characterManager
    this.lightingManager = options.lightingManager
    
    this.onSceneChange = options.onSceneChange
    this.onSceneStart = options.onSceneStart
    this.onSceneEnd = options.onSceneEnd
    
    // Video trigger tracking
    this.videoTriggers = new Map()
    this.activeVideos = new Set()
  }

  /**
   * Load scenes from normalized configuration
   * @param {array} sceneConfigs - Array of scene configurations
   */
  loadScenes(sceneConfigs) {
    sceneConfigs.forEach((scene, index) => {
      this.scenes.set(scene.id, {
        ...scene,
        index,
        isActive: false
      })
    })
  }

  /**
   * Get scene by ID
   * @param {string} sceneId - Scene identifier
   * @returns {object} Scene configuration
   */
  getScene(sceneId) {
    return this.scenes.get(sceneId)
  }

  /**
   * Get all scenes as array
   * @returns {array} Array of scenes
   */
  getAllScenes() {
    return Array.from(this.scenes.values())
  }

  /**
   * Get current scene
   * @returns {object} Current scene configuration
   */
  getCurrentScene() {
    return this.currentScene
  }

  /**
   * Activate a scene
   * @param {string} sceneId - Scene identifier
   * @returns {Promise} Resolves when scene is activated
   */
  async activateScene(sceneId) {
    const scene = this.scenes.get(sceneId)
    if (!scene) {
      console.error(`Scene ${sceneId} not found`)
      return
    }

    if (this.isTransitioning) {
      console.warn('Scene transition already in progress')
      return
    }

    this.isTransitioning = true

    try {
      // Deactivate current scene if exists
      if (this.currentSceneId) {
        await this.deactivateScene(this.currentSceneId)
      }

      // Mark scene as active
      scene.isActive = true
      this.currentScene = scene
      this.currentSceneId = sceneId

      // Apply lighting
      if (this.lightingManager && scene.lighting) {
        this.lightingManager.applySceneLighting(scene.lighting)
      }

      // Load characters
      if (this.characterManager && scene.characters) {
        await this.characterManager.loadCharactersFromConfig(scene.characters)
      }

      // Load objects
      if (this.characterManager && scene.objects) {
        await this.characterManager.loadObjectsFromConfig(scene.objects)
      }

      // Load videos
      if (this.videoManager && scene.videos) {
        await this.videoManager.loadFromConfig(scene.videos)
        this.setupVideoTriggers(scene.videos)
      }

      // Load and play audio
      if (this.audioManager && scene.audio) {
        const audioId = `${sceneId}_audio`
        await this.audioManager.loadAudio(audioId, {
          ...scene.audio,
          id: audioId,
          onTimeUpdate: (time) => this.handleAudioTimeUpdate(sceneId, time),
          onEnded: () => this.handleSceneEnd(sceneId)
        })
        
        if (scene.audio.autoplay) {
          this.audioManager.play(audioId)
        }
      }

      // Callback
      if (this.onSceneStart) {
        this.onSceneStart(scene)
      }

    } catch (error) {
      console.error(`Failed to activate scene ${sceneId}:`, error)
    } finally {
      this.isTransitioning = false
    }
  }

  /**
   * Deactivate a scene
   * @param {string} sceneId - Scene identifier
   * @returns {Promise} Resolves when scene is deactivated
   */
  async deactivateScene(sceneId) {
    const scene = this.scenes.get(sceneId)
    if (!scene) return

    // Stop audio
    if (this.audioManager) {
      const audioId = `${sceneId}_audio`
      await this.audioManager.fadeOut(audioId, 500)
      this.audioManager.removeAudio(audioId)
    }

    // Remove videos
    if (this.videoManager && scene.videos) {
      for (const video of scene.videos) {
        await this.videoManager.fadeOut(video.id, 300)
        this.videoManager.removeVideo(video.id)
      }
    }

    // Remove characters
    if (this.characterManager) {
      this.characterManager.removeSceneCharacters(sceneId)
    }

    // Remove objects
    if (this.characterManager) {
      this.characterManager.removeSceneObjects(sceneId)
    }

    // Clear video triggers
    this.videoTriggers.clear()
    this.activeVideos.clear()

    // Mark as inactive
    scene.isActive = false
  }

  /**
   * Set up video triggers based on audio timestamp
   * @param {array} videos - Video configurations
   */
  setupVideoTriggers(videos) {
    this.videoTriggers.clear()
    
    videos.forEach((video) => {
      if (video.triggerAt !== undefined) {
        this.videoTriggers.set(video.id, {
          triggerAt: video.triggerAt,
          triggered: false
        })
      }
    })
  }

  /**
   * Handle audio time updates for video triggers
   * @param {string} sceneId - Scene identifier
   * @param {number} currentTime - Current audio time in seconds
   */
  handleAudioTimeUpdate(sceneId, currentTime) {
    this.videoTriggers.forEach((trigger, videoId) => {
      if (!trigger.triggered && currentTime >= trigger.triggerAt) {
        trigger.triggered = true
        this.triggerVideo(videoId)
      }
    })
  }

  /**
   * Trigger a video to play
   * @param {string} videoId - Video identifier
   */
  triggerVideo(videoId) {
    if (!this.videoManager) return

    // Hide currently active video (if single display)
    this.activeVideos.forEach((activeId) => {
      if (activeId !== videoId) {
        this.videoManager.fadeOut(activeId, 200)
      }
    })

    // Show and play new video
    this.videoManager.fadeIn(videoId, 200)
    this.videoManager.play(videoId)
    this.activeVideos.add(videoId)
  }

  /**
   * Handle scene end (audio finished)
   * @param {string} sceneId - Scene identifier
   */
  handleSceneEnd(sceneId) {
    const scene = this.scenes.get(sceneId)
    
    if (this.onSceneEnd) {
      this.onSceneEnd(scene)
    }

    // Auto-advance to next scene if configured
    if (scene.nextScene) {
      this.changeScene(scene.nextScene)
    }
  }

  /**
   * Change to a different scene
   * @param {string} targetSceneId - Target scene identifier
   */
  async changeScene(targetSceneId) {
    if (this.onSceneChange) {
      this.onSceneChange(this.currentSceneId, targetSceneId)
    }

    await this.activateScene(targetSceneId)
  }

  /**
   * Go to next scene
   */
  async nextScene() {
    const scenes = this.getAllScenes()
    const currentIndex = scenes.findIndex(s => s.id === this.currentSceneId)
    
    if (currentIndex < scenes.length - 1) {
      await this.changeScene(scenes[currentIndex + 1].id)
    }
  }

  /**
   * Go to previous scene
   */
  async previousScene() {
    const scenes = this.getAllScenes()
    const currentIndex = scenes.findIndex(s => s.id === this.currentSceneId)
    
    if (currentIndex > 0) {
      await this.changeScene(scenes[currentIndex - 1].id)
    }
  }

  /**
   * Skip to scene end
   */
  skipCurrentScene() {
    if (this.audioManager && this.currentSceneId) {
      const audioId = `${this.currentSceneId}_audio`
      this.audioManager.stop(audioId)
      this.handleSceneEnd(this.currentSceneId)
    }
  }

  /**
   * Pause current scene
   */
  pause() {
    if (this.audioManager && this.currentSceneId) {
      const audioId = `${this.currentSceneId}_audio`
      this.audioManager.pause(audioId)
    }

    // Pause all active videos
    this.activeVideos.forEach((videoId) => {
      this.videoManager?.pause(videoId)
    })
  }

  /**
   * Resume current scene
   */
  resume() {
    if (this.audioManager && this.currentSceneId) {
      const audioId = `${this.currentSceneId}_audio`
      this.audioManager.play(audioId)
    }

    // Resume active videos
    this.activeVideos.forEach((videoId) => {
      this.videoManager?.play(videoId)
    })
  }

  /**
   * Update (called each frame)
   * @param {number} delta - Time delta
   */
  update(delta) {
    // Update character animations
    if (this.characterManager) {
      this.characterManager.update(delta)
    }
  }

  /**
   * Clean up all scenes
   */
  dispose() {
    if (this.currentSceneId) {
      this.deactivateScene(this.currentSceneId)
    }
    
    this.scenes.clear()
    this.videoTriggers.clear()
    this.activeVideos.clear()
    this.currentScene = null
    this.currentSceneId = null
  }
}

export default SceneManager
