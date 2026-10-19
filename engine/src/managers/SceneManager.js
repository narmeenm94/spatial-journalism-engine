import { characterEndingTime } from '../ui/cinematicEnding.js'
/**
 * SceneManager - Manages scene transitions, activation, and state
 * Ported from Shadows of the Stabilisation Point with full feature support
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

    // Dynamic lights created per-scene (cleaned up on deactivation)
    this._activeSceneLights = []

    // Required managers
    this.engine = options.engine
    this.audioManager = options.audioManager
    this.videoProjector = options.videoProjector
    this.characterManager = options.characterManager
    this.lightingManager = options.lightingManager
    this.subtitleManager = options.subtitleManager
    this.volumetricLighting = options.volumetricLighting
    this.sceneEffects = options.sceneEffects
    this.interactionManager = options.interactionManager
    this.parser = options.parser

    // Callbacks
    this.onSceneChange = options.onSceneChange
    this.onSceneStart = options.onSceneStart
    this.onSceneEnd = options.onSceneEnd

    // Video trigger tracking
    this.videoTriggers = new Map()
    this.activeVideos = new Set()

    // Positional audio tracking
    this.positionalAudioPosition = null
    this.audioWaypoints = null
    this.audioWaypointIndex = 0

    // Ending condition tracking
    this.endingPlayed = false
    this.characterFadeInComplete = false
    this.endingCheckInterval = null

    // Delayed character/effect timeouts (must be cleaned up on scene deactivation)
    this.pendingTimeouts = []

    // Track last video in final scene for ending trigger
    this.lastVideoEndedCallback = null
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
   */
  getScene(sceneId) {
    return this.scenes.get(sceneId)
  }

  /**
   * Get all scenes as array
   */
  getAllScenes() {
    return Array.from(this.scenes.values())
  }

  /**
   * Get current scene
   */
  getCurrentScene() {
    return this.currentScene
  }

  /**
   * Activate a scene
   * @param {string} sceneId - Scene identifier
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
    this.engine?.sceneButtons?.clear()

    try {
      // Deactivate current scene if exists
      if (this.currentSceneId) {
        await this.deactivateScene(this.currentSceneId)
      }

      // Mark scene as active
      scene.isActive = true
      this.currentScene = scene
      this.currentSceneId = sceneId
      this._lastLogTime = -1
      this.elapsed = 0
      this.paused = false
      this.sceneEnded = false
      this.audioSchedule = []
      this.characterSchedule = []
      this.activationVersion = (this.activationVersion || 0) + 1

      // Set current scene on character manager for tracking
      if (this.characterManager) {
        this.characterManager.setCurrentScene(sceneId)
      }

      // Apply lighting
      await this.setupSceneLighting(scene)

      // Load characters
      await this.loadSceneCharacters(scene)

      // Load objects
      await this.loadSceneObjects(scene)

      // Load videos
      await this.loadSceneVideos(scene)

      // Load and play audio
      await this.loadSceneAudio(scene)

      // Setup scene effects (walking tour, flicker)
      this.setupSceneEffects(scene)

      // Start guided camera tracking if the controller exists and this scene has keyframes
      this.startGuidedCamera(sceneId)

      // Toggle outline effect on interactive objects based on scene config
      if (this.interactionManager) {
        if (scene.activateInteractionOutlines) {
          this.interactionManager.enableOutline()
        } else {
          this.interactionManager.disableOutline()
        }
      }

      // Setup ending condition check for the trigger scene (scene4 in original)
      this.setupEndingCondition(scene)

      // Callback
      if (this.onSceneStart) {
        this.onSceneStart(scene)
      }
    } catch (error) {
      console.error(`Failed to activate scene ${sceneId}:`, error)
      await this.deactivateScene(sceneId)
      this.engine?.showPlayerError?.(error)
      this.engine?.onError?.(error)
    } finally {
      this.isTransitioning = false
    }
  }

  /**
   * Setup scene lighting
   */
  async setupSceneLighting(scene) {
    if (!scene.lighting) return

    // Apply base lighting modifiers (from modifiers object or directly)
    // Note: some scenes (like scene3/walking tour) don't have modifiers;
    // their lighting is entirely managed by SceneEffects
    if (this.lightingManager && scene.lighting.modifiers) {
      this.lightingManager.applySceneLighting(scene.lighting.modifiers)
    } else if (
      this.lightingManager &&
      (scene.lighting.ambient !== undefined ||
        scene.lighting.directional !== undefined ||
        scene.lighting.hemisphere !== undefined)
    ) {
      // Fallback: direct lighting values (less common)
      this.lightingManager.applySceneLighting({
        ambient: scene.lighting.ambient,
        directional: scene.lighting.directional,
        hemisphere: scene.lighting.hemisphere
      })
    }

    // Setup volumetric light if configured
    if (this.volumetricLighting && scene.lighting.spotlight) {
      const spotlight = scene.lighting.spotlight
      const position = Array.isArray(spotlight.position)
        ? {
            x: spotlight.position[0],
            y: spotlight.position[1],
            z: spotlight.position[2]
          }
        : spotlight.position

      if (spotlight.volumetric !== false) {
        console.log(
          `Setting up volumetric lighting for ${scene.id} at`,
          position
        )
        this.volumetricLighting.setupSceneLighting(
          scene.id,
          {
            position: new THREE.Vector3(position.x, position.y, position.z),
            volumetric: true,
            volumetricOffset: spotlight.volumetricOffset || 13.5
          },
          this.engine.roomModel || this.engine.scene
        )

        // Fade in after a brief delay
        this.pendingTimeouts.push(
          setTimeout(() => {
            this.volumetricLighting.fadeIn(scene.id, 2000)
          }, 500)
        )
      }
    }

    // Create dynamic Three.js lights from the spotlights array (creator format)
    if (
      scene.lighting.dynamicLights &&
      scene.lighting.dynamicLights.length > 0
    ) {
      this.setupDynamicLights(scene.lighting.dynamicLights)
    }
  }

  /**
   * Create real Three.js lights from the dynamicLights array.
   * These are cleaned up when the scene is deactivated.
   */
  setupDynamicLights(lights) {
    const parentObject = this.engine.roomModel || this.engine.scene
    if (!parentObject) return

    lights.forEach((cfg) => {
      const color = new THREE.Color(cfg.color || '#ffffff')
      const pos = cfg.position || [0, 2, 0]
      let light

      if (cfg.type === 'spot') {
        light = new THREE.SpotLight(
          color,
          cfg.intensity ?? 1,
          cfg.distance ?? 30,
          cfg.angle ?? 0.6,
          cfg.penumbra ?? 0.5,
          cfg.decay ?? 2
        )
        light.position.set(pos[0], pos[1], pos[2])
        if (cfg.target) {
          light.target.position.set(cfg.target[0], cfg.target[1], cfg.target[2])
          parentObject.add(light.target)
        }
        if (cfg.castShadow) {
          light.castShadow = true
          light.shadow.mapSize.width = 512
          light.shadow.mapSize.height = 512
        }
      } else if (cfg.type === 'directional') {
        light = new THREE.DirectionalLight(color, cfg.intensity ?? 1)
        light.position.set(pos[0], pos[1], pos[2])
        if (cfg.target) {
          light.target.position.set(cfg.target[0], cfg.target[1], cfg.target[2])
          parentObject.add(light.target)
        }
      } else {
        // Default: PointLight
        light = new THREE.PointLight(
          color,
          cfg.intensity ?? 1,
          cfg.distance ?? 30,
          cfg.decay ?? 2
        )
        light.position.set(pos[0], pos[1], pos[2])
      }

      light.name = `scene-light-${cfg.id || Math.random().toString(36).slice(2, 6)}`
      parentObject.add(light)
      this._activeSceneLights.push(light)

      console.log(
        `Created dynamic ${cfg.type || 'point'} light "${light.name}" at [${pos}] intensity=${cfg.intensity}`
      )
    })
  }

  /**
   * Remove all dynamic scene lights created by setupDynamicLights
   */
  removeDynamicLights() {
    if (!this._activeSceneLights || this._activeSceneLights.length === 0) return
    const parentObject = this.engine.roomModel || this.engine.scene
    this._activeSceneLights.forEach((light) => {
      if (light.target && light.target.parent) {
        light.target.parent.remove(light.target)
      }
      if (parentObject) parentObject.remove(light)
      if (light.dispose) light.dispose()
    })
    this._activeSceneLights = []
  }

  /**
   * Load scene characters
   */
  async loadSceneCharacters(scene) {
    if (!this.characterManager) return
    for (const config of scene.characters || []) {
      if (!config.model) continue
      const model = await this.characterManager.loadCharacter(config.id, {
        ...config,
        delay: 0,
        model:
          this.parser?.resolvePath(
            config.model,
            this.engine.story.project.assets.basePath
          ) || config.model
      })
      if (!model) throw new Error('Could not load model: ' + config.model)
      this.characterSchedule.push({ config, model })
    }
  }

  /**
   * Load scene objects
   */
  async loadSceneObjects(scene) {
    if (!this.characterManager || !scene.objects) return

    for (const objConfig of scene.objects) {
      const objId =
        objConfig.id ||
        `${scene.id}-obj-${Math.random().toString(36).substr(2, 9)}`

      // Convert array positions to objects
      const position = Array.isArray(objConfig.position)
        ? {
            x: objConfig.position[0],
            y: objConfig.position[1],
            z: objConfig.position[2]
          }
        : objConfig.position

      const rotation = Array.isArray(objConfig.rotation)
        ? {
            x: objConfig.rotation[0],
            y: objConfig.rotation[1],
            z: objConfig.rotation[2]
          }
        : objConfig.rotation

      const modelUrl =
        this.parser?.resolvePath(
          objConfig.model,
          this.engine.story.project.assets.basePath
        ) || objConfig.model
      if (!modelUrl) {
        console.warn(`  Skipping object ${objId} — no model path set`)
        continue
      }

      const resolvedConfig = {
        ...objConfig,
        position,
        rotation,
        model: modelUrl
      }

      await this.characterManager.loadObject(objId, resolvedConfig)
    }
  }

  /**
   * Load scene videos
   */
  async loadSceneVideos(scene) {
    if (!this.videoProjector) {
      console.warn('VideoProjector not available, skipping video loading')
      return
    }
    if (!scene.videos || scene.videos.length === 0) return

    console.log(`Loading ${scene.videos.length} videos for ${scene.id}`)

    for (const videoConfig of scene.videos) {
      try {
        const videoUrl =
          this.parser?.resolvePath(
            videoConfig.url,
            this.engine.story.project.assets.basePath
          ) || videoConfig.url
        if (!videoUrl) {
          console.warn(`  Skipping video ${videoConfig.id} — no URL set`)
          continue
        }
        console.log(
          `  Setting up video ${videoConfig.id}: ${videoUrl}, triggerAt: ${videoConfig.triggerAt}s`
        )

        const resolvedConfig = {
          ...videoConfig,
          url: videoUrl,
          position: videoConfig.position
            ? Array.isArray(videoConfig.position)
              ? {
                  x: videoConfig.position[0],
                  y: videoConfig.position[1],
                  z: videoConfig.position[2]
                }
              : videoConfig.position
            : { x: 0, y: 0, z: 0 },
          rotation: videoConfig.rotation
            ? Array.isArray(videoConfig.rotation)
              ? {
                  x: videoConfig.rotation[0],
                  y: videoConfig.rotation[1],
                  z: videoConfig.rotation[2]
                }
              : videoConfig.rotation
            : { x: 0, y: 0, z: 0 },
          walls: videoConfig.walls?.map((wall) => ({
            position: Array.isArray(wall.position)
              ? {
                  x: wall.position[0],
                  y: wall.position[1],
                  z: wall.position[2]
                }
              : wall.position,
            rotation: Array.isArray(wall.rotation)
              ? {
                  x: wall.rotation[0],
                  y: wall.rotation[1],
                  z: wall.rotation[2]
                }
              : wall.rotation
          }))
        }
        await this.videoProjector.createVideoProjection(
          videoConfig.id,
          resolvedConfig
        )
      } catch (error) {
        console.error(`Failed to load video ${videoConfig.id}:`, error)
        // Continue loading other videos
      }
    }

    this.setupVideoTriggers(scene.videos)
  }

  /**
   * Load scene audio
   */
  async loadSceneAudio(scene) {
    if (!this.audioManager) return
    for (const [index, config] of (scene.audio || []).entries()) {
      if (!config.url) continue
      const id = config.id || scene.id + '_audio_' + index
      const item = { id, config, duration: 0, started: false, ended: false }
      const version = this.activationVersion
      const sound = await this.audioManager.loadAudio(id, {
        ...config,
        onEnded: () => {
          if (version === this.activationVersion && this.currentSceneId === scene.id) item.ended = true
        },
        url:
          this.parser?.resolvePath(
            config.url,
            this.engine.story.project.assets.basePath
          ) || config.url,
        volume: config.volume ?? 0.5
      })
      if (config.positional)
        (this.engine.roomModel || this.engine.scene)?.add(sound)
      item.duration =
          config.duration > 0
            ? Math.min(
                config.duration / 1000,
                sound.buffer?.duration || Infinity
              )
            : sound.buffer?.duration || 0
      this.audioSchedule.push(item)
    }
  }

  /**
   * Setup scene effects (walking tour, flicker)
   */
  setupSceneEffects(scene) {
    if (!scene.lighting?.effects || !this.sceneEffects) return

    scene.lighting.effects.forEach((effect) => {
      if (effect.type === 'walkingTour') {
        this.sceneEffects.initWalkingTour({
          waypoints: effect.waypoints?.map((wp) => ({
            ...wp,
            time: wp.time,
            position: Array.isArray(wp.position)
              ? { x: wp.position[0], y: wp.position[1], z: wp.position[2] }
              : wp.position
          })),
          dimLights: effect.dimLights,
          endLights: effect.endLights,
          guidanceText: effect.guidanceText
        })
        // Walking tour will be started when audio starts
      }

      if (effect.type === 'flicker') {
        this.sceneEffects.initFlicker({
          triggerTime: effect.triggerTime,
          duration: effect.duration,
          patterns: effect.patterns
        })
        // Store trigger time for audio time update
        this.flickerTriggerTime = effect.triggerTime
        this.flickerTriggered = false
      }
    })
  }

  /**
   * Setup ending condition check
   * This manages the VISUAL effect of the character slowly fading out.
   * The actual ending sequence is triggered by the last video ending
   * (when endingTrigger is "lastVideo"), not by character opacity.
   */
  setupEndingCondition() {
    this.endingPlayed = false
    this.endingReadyAt = null
  }

  /**
   * Set up video triggers based on audio timestamp
   */
  setupVideoTriggers(videos) {
    this.videoTriggers.clear()
    this.lastVideoId = null
    this.finishedVideos = new Set()

    // Find the video with the highest triggerAt (the last video to play)
    let maxTriggerAt = -1

    videos.forEach((video) => {
      if (video.triggerAt !== undefined) {
        this.videoTriggers.set(video.id, {
          triggerAt: video.triggerAt,
          triggered: false
        })
        if (video.triggerAt > maxTriggerAt) {
          maxTriggerAt = video.triggerAt
          this.lastVideoId = video.id
        }
      }
    })

    if (this.lastVideoId) {
      console.log(
        `Last video in scene: ${this.lastVideoId} (triggerAt ${maxTriggerAt}s)`
      )
    }
  }

  /**
   * Handle audio time updates
   */
  handleAudioTimeUpdate(sceneId, currentTime) {
    // Log time every 5 seconds for debugging
    if (
      Math.floor(currentTime) % 5 === 0 &&
      Math.floor(currentTime) !== this._lastLogTime
    ) {
      this._lastLogTime = Math.floor(currentTime)
      console.log(`[${sceneId}] Audio time: ${currentTime.toFixed(1)}s`)
    }

    // Update subtitles
    if (this.subtitleManager) {
      this.subtitleManager.onAudioTimeUpdate(sceneId, currentTime)
    }

    // Update video triggers
    this.videoTriggers.forEach((trigger, videoId) => {
      if (!trigger.triggered && currentTime >= trigger.triggerAt) {
        trigger.triggered = true
        console.log(
          `[${sceneId}] Triggering video: ${videoId} at ${currentTime.toFixed(1)}s`
        )
        this.triggerVideo(videoId)
      }
    })

    // Check for flicker effect trigger
    if (this.flickerTriggerTime !== undefined && !this.flickerTriggered) {
      if (currentTime >= this.flickerTriggerTime) {
        this.flickerTriggered = true
        this.sceneEffects?.startFlicker()
      }
    }

    // Check for walking tour start (starts at first waypoint time)
    const scene = this.scenes.get(sceneId)
    if (scene?.lighting?.effects) {
      const walkingTour = scene.lighting.effects.find(
        (e) => e.type === 'walkingTour'
      )
      if (walkingTour && !this.walkingTourStarted && currentTime >= 1) {
        this.walkingTourStarted = true
        this.sceneEffects?.startWalkingTour()
      }
    }
  }

  /**
   * Update positional audio position based on waypoints
   */
  updatePositionalAudio(sceneId, currentTime) {
    if (
      !this.audioWaypoints ||
      this.audioWaypointIndex >= this.audioWaypoints.length
    )
      return

    const currentWaypoint = this.audioWaypoints[this.audioWaypointIndex]
    if (currentTime >= currentWaypoint.time) {
      // Move to next waypoint
      const audioId = `${sceneId}_audio`
      this.audioManager.setPosition(audioId, currentWaypoint.position)
      this.audioWaypointIndex++
    }
  }

  /**
   * Trigger a video to play
   * Videos automatically fade out when done (matching original behavior)
   */
  async triggerVideo(videoId) {
    if (!this.videoProjector) return

    // Multiple projections may play together.
    // Play new video with fade in
    const originScene = this.currentSceneId
    const version = this.activationVersion
    const played = await this.videoProjector.playVideo(
      videoId,
      this.currentScene?.videos?.find((v) => v.id === videoId)?.fadeIn ?? 1000
    )
    if (this.currentSceneId !== originScene || version !== this.activationVersion) return
    if (!played) { this.finishedVideos.add(videoId); return }
    if (this.paused) this.videoProjector.pause(videoId)
    this.activeVideos.add(videoId)

    // Listen for video end to automatically fade out and remove
    // This matches the original project's behavior where videos fade out on 'ended'
    const videoData = this.videoProjector.videos.get(videoId)
    if (videoData && videoData.element) {
      videoData.element.addEventListener(
        'ended',
        () => {
          if (this.currentSceneId !== originScene || version !== this.activationVersion) return
          this.finishedVideos.add(videoId)
          console.log(`Video ${videoId} ended, fading out`)
          this.videoProjector.fadeOutVideo(videoId, 500).then(() => {
            if (this.currentSceneId !== originScene || version !== this.activationVersion) return
            this.videoProjector.removeVideo(videoId)
            this.activeVideos.delete(videoId)
            console.log(`Video ${videoId} removed after fade out`)
          })

          // Check if this is the last video in the final scene and endingTrigger is "lastVideo"
          const endingConfig = this.engine?.story?.ending
          if (
            (endingConfig?.triggerMode || endingConfig?.endingTrigger) === 'lastVideo' &&
            videoId === this.lastVideoId &&
            (endingConfig.triggerSceneId || this.getAllScenes().at(-1)?.id) ===
              this.currentSceneId
          ) {
            console.log(
              `Last video ${videoId} ended in final scene - triggering ending sequence (3s delay)`
            )
            this.endingReadyAt = this.elapsed + 3
          }
        },
        { once: true }
      )
    }
  }

  /**
   * Start guided camera animation for the given scene.
   * Uses audio time if audio is playing; otherwise falls back to a wall-clock timer
   * so keyframes still work in scenes without audio.
   */
  startGuidedCamera(sceneId) {
    const controller = this.engine?.guidedCameraController
    if (
      this.engine?.guidedEnabled !== false &&
      controller?.sceneCameraPositions[sceneId]?.length
    ) {
      controller.startSceneTracking(sceneId, () => this.elapsed || 0)
    }
  }

  /**
   * Stop guided camera animation
   */
  stopGuidedCamera() {
    if (this.engine?.cameraControls) {
      this.engine.cameraControls.enabled = true
      if (this.engine.cameraControls.recenterButton && !this.engine.playbackBar)
        this.engine.cameraControls.recenterButton.style.display = 'flex'
    }
    const controller = this.engine?.guidedCameraController
    if (controller) {
      controller.stopSceneTracking()
    }
  }

  /**
   * Helper: return the audioId used for the first audio track of a scene
   */
  _getFirstAudioIdForScene(sceneId) {
    const scene = this.scenes.get(sceneId)
    if (!scene) return null
    const audioTracks = Array.isArray(scene.audio)
      ? scene.audio
      : scene.audio
        ? [scene.audio]
        : []
    if (audioTracks.length === 0) return null
    return audioTracks[0].id || `${sceneId}_audio_0`
  }

  /**
   * Deactivate a scene
   */
  async deactivateScene(sceneId) {
    const scene = this.scenes.get(sceneId)
    if (!scene) return
    scene.isActive = false
    this.pendingTimeouts.forEach(clearTimeout)
    this.pendingTimeouts = []
    for (const item of this.audioSchedule || [])
      this.audioManager?.removeAudio(item.id)
    for (const video of scene.videos || [])
      this.videoProjector?.removeVideo(video.id)
    this.characterManager?.removeSceneCharacters(sceneId)
    this.volumetricLighting?.fadeOut(sceneId, 500)
    this.removeDynamicLights()
    this.stopGuidedCamera()
    this.sceneEffects?.stopWalkingTour()
    this.sceneEffects?.stopFlicker()
    this.subtitleManager?.onAudioEnd()
    this.videoTriggers.clear()
    this.activeVideos.clear()
    this.audioSchedule = []
    this.characterSchedule = []
    this.flickerTriggerTime = undefined
    this.flickerTriggered = false
    this.walkingTourStarted = false
  }

  /**
   * Handle scene end (audio finished)
   */
  handleSceneEnd(sceneId) {
    if (this.sceneEnded || sceneId !== this.currentSceneId) return
    this.sceneEnded = true
    this.pause()
    const scene = this.scenes.get(sceneId)
    console.log(`Scene ended: ${sceneId}, nextScene: ${scene?.nextScene}`)

    // Notify subtitle manager
    if (this.subtitleManager) {
      this.subtitleManager.onAudioEnd()
    }

    // Restore original lighting when audio ends (matching original behavior)
    // EXCEPT for scenes with walking tour (scene3) - those handle their own lighting
    const hasWalkingTour = scene?.lighting?.effects?.some(
      (e) => e.type === 'walkingTour'
    )
    if (!hasWalkingTour && this.lightingManager) {
      this.lightingManager.restoreOriginalLighting()
    }

    if (this.onSceneEnd) {
      this.onSceneEnd(scene)
    }

    // Note: Scene navigation is now handled by the Engine's "Next" button
    // The Engine will call nextScene() or changeScene() when the user clicks
  }

  /**
   * Change to a different scene
   */
  async changeScene(targetSceneId) {
    if (this.onSceneChange) {
      this.onSceneChange(this.currentSceneId, targetSceneId)
    }

    await this.activateScene(targetSceneId)
  }

  /**
   * Navigation methods
   */
  async nextScene() {
    const scenes = this.getAllScenes()
    const currentIndex = scenes.findIndex((s) => s.id === this.currentSceneId)

    if (currentIndex < scenes.length - 1) {
      await this.changeScene(scenes[currentIndex + 1].id)
    }
  }

  async previousScene() {
    const scenes = this.getAllScenes()
    const currentIndex = scenes.findIndex((s) => s.id === this.currentSceneId)

    if (currentIndex > 0) {
      await this.changeScene(scenes[currentIndex - 1].id)
    }
  }

  skipCurrentScene() {
    for (const item of this.audioSchedule || [])
      this.audioManager?.stop(item.id)
    this.handleSceneEnd(this.currentSceneId)
  }

  pause() {
    this.paused = true
    for (const item of this.audioSchedule || [])
      if (item.started) this.audioManager?.pause(item.id)
    this.activeVideos.forEach((id) => this.videoProjector?.pause(id))
  }

  resume() {
    this.paused = false
    for (const item of this.audioSchedule || []) {
      if (
        item.started &&
        !item.stopped &&
        (item.config.loop ||
          this.elapsed < (item.config.delay || 0) / 1000 + item.duration)
      )
        this.audioManager?.play(item.id)
    }
    this.activeVideos.forEach((id) => this.videoProjector?.play(id))
  }

  /**
   * Update (called each frame)
   */
  update(delta) {
    if (this.paused || this.isTransitioning || !this.currentScene?.isActive)
      return
    let nextTime = (this.elapsed || 0) + Math.max(0, delta)
    // The first scheduled non-looping narration owns the chapter clock.
    // Before it starts and after it finishes, silent portions use frame time.
    const master = (this.audioSchedule || []).filter(a => a.config.autoplay !== false && !a.config.loop)
      .sort((a, b) => (a.config.delay || 0) - (b.config.delay || 0))[0]
    if (master && this.audioManager?.getCurrentTime) {
      const start = (master.config.delay || 0) / 1000
      if (!master.started && nextTime >= start) {
        master.started = true
        this.audioManager.play(master.id)
      }
      if (master.started && !master.ended && !master.stopped)
        nextTime = start + this.audioManager.getCurrentTime(master.id)
      else if (master.ended || master.stopped) nextTime = Math.max(nextTime, start + master.duration)
    }
    this.elapsed = nextTime
    const time = this.elapsed
    this.characterManager?.update(delta)
    for (const item of this.audioSchedule || []) {
      if (
        !item.started &&
        item.config.autoplay !== false &&
        time >= (item.config.delay || 0) / 1000
      ) {
        item.started = true
        this.audioManager.play(item.id)
      }
    }
    for (const item of this.audioSchedule || []) {
      if (
        item.started &&
        !item.stopped &&
        item.config.duration > 0 &&
        time >= (item.config.delay || 0) / 1000 + item.config.duration / 1000
      ) {
        this.audioManager.stop(item.id)
        item.stopped = true
      }
    }
    for (const { config, model } of this.characterSchedule || []) {
      const t = time * 1000 - (config.delay || 0)
      const fadeIn = config.fadeIn ?? config.fadeInDuration ?? 1000
      const fadeOut = config.fadeOut ?? config.fadeOutDuration ?? 1000
      const duration = config.duration > 0 ? config.duration : Infinity
      const factor =
        t < 0
          ? 0
          : Math.min(
              fadeIn > 0 ? t / fadeIn : 1,
              t < duration - fadeOut
                ? 1
                : fadeOut > 0
                  ? (duration - t) / fadeOut
                  : t < duration
                    ? 1
                    : 0
            )
      const opacity = Math.max(0, factor) * (config.opacity ?? 0.7)
      model.visible = opacity > 0
      model.traverse((child) => {
        if (!child.isMesh || !child.material) return
        for (const material of Array.isArray(child.material)
          ? child.material
          : [child.material])
          material.opacity = opacity
      })
      const ending = this.engine?.story?.ending
      if (
        !this.endingPlayed &&
        ending?.triggerMode === 'characterFade' &&
        ending.triggerCharacterId === config.id &&
        time >= characterEndingTime(config,ending) &&
        (!ending.triggerSceneId ||
          ending.triggerSceneId === this.currentSceneId)
      ) {
        this.endingReadyAt ??= time
      }
    }
    this.handleAudioTimeUpdate(this.currentSceneId, time)
    for (const video of this.currentScene.videos || []) {
      if (
        video.duration > 0 &&
        time >= (video.triggerAt || 0) + video.duration &&
        this.activeVideos.has(video.id)
      ) {
        this.videoProjector.removeVideo(video.id)
        this.activeVideos.delete(video.id)
        this.finishedVideos.add(video.id)
      }
    }
    const scene = this.currentScene
    // A visual trigger can become ready before narration or a buffering video
    // finishes. It must not stop those media by completing the experience.
    const pendingMedia = this.hasPendingMedia()
    const continueMedia = this.engine?.story?.ending?.mediaBehavior === 'continue'
    if (!this.endingPlayed && this.endingReadyAt !== null && time >= this.endingReadyAt && (!pendingMedia || continueMedia)) {
      this.endingPlayed = true
      if (pendingMedia && continueMedia) this.engine.showEnding()
      else this.engine.handleComplete()
      return
    }
    const audioEnd = Math.max(
      0,
      ...(this.audioSchedule || [])
        .filter((a) => a.config.autoplay !== false && !a.config.loop)
        .map((a) => (a.config.delay || 0) / 1000 + a.duration)
    )
    const captions = Array.isArray(scene.subtitles)
      ? scene.subtitles
      : Object.values(scene.subtitles || {}).flat()
    const videoEnd = Math.max(
      0,
      ...(scene.videos || [])
        .filter((v) => !v.loop)
        .map(
          (v) =>
            (v.triggerAt || 0) +
            (v.duration ||
              this.videoProjector?.videos.get(v.id)?.element?.duration ||
              0)
        )
    )
    const characterEnd = Math.max(
      0,
      ...(scene.characters || [])
        .filter((c) => c.duration > 0)
        .map((c) => ((c.delay || 0) + c.duration) / 1000)
    )
    const cameraEnd = Math.max(
      0,
      ...(this.engine?.story?.camera?.guided?.[scene.id] || []).map(
        (k) => k.time + (k.duration || 0) / 1000
      )
    )
    const end =
      scene.duration > 0
        ? scene.duration
        : Math.max(
            audioEnd,
            videoEnd,
            characterEnd,
            cameraEnd,
            ...captions.map((c) => c.end || 0),
            10
          )
    const ending=this.engine?.story?.ending
    const endingCharacter=ending?.triggerMode==='characterFade'&&(!ending.triggerSceneId||ending.triggerSceneId===scene.id)?scene.characters?.find(c=>c.id===ending.triggerCharacterId):null
    const triggerEnd=endingCharacter?characterEndingTime(endingCharacter,ending):0
    if (!pendingMedia && time >= Math.max(end,Number.isFinite(triggerEnd)?triggerEnd:0,this.endingReadyAt || 0)) this.handleSceneEnd(scene.id)
  }

  hasPendingMedia() {
    const audioPending = (this.audioSchedule || []).some(item => {
      if (item.config.autoplay === false || item.config.loop || item.stopped || item.ended) return false
      // Real audio reports completion through its source's ended event.
      if (this.audioManager?.getCurrentTime) return true
      return this.elapsed < (item.config.delay || 0) / 1000 + item.duration
    })
    const videoPending = (this.currentScene?.videos || []).some(video =>
      !video.loop && !this.finishedVideos?.has(video.id) && this.videoProjector?.videos.has(video.id))
    return audioPending || videoPending
  }

  /**
   * Clean up
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
