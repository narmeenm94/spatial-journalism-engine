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
    } else if (this.lightingManager && (scene.lighting.ambient !== undefined || 
               scene.lighting.directional !== undefined || scene.lighting.hemisphere !== undefined)) {
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
        ? { x: spotlight.position[0], y: spotlight.position[1], z: spotlight.position[2] }
        : spotlight.position
      
      if (spotlight.volumetric !== false) {
        console.log(`Setting up volumetric lighting for ${scene.id} at`, position)
        this.volumetricLighting.setupSceneLighting(scene.id, {
          position: new THREE.Vector3(position.x, position.y, position.z),
          volumetric: true,
          volumetricOffset: spotlight.volumetricOffset || 13.5
        }, this.engine.roomModel || this.engine.scene)
        
        // Fade in after a brief delay
        setTimeout(() => {
          this.volumetricLighting.fadeIn(scene.id, 2000)
        }, 500)
      }
    }

    // Create dynamic Three.js lights from the spotlights array (creator format)
    if (scene.lighting.dynamicLights && scene.lighting.dynamicLights.length > 0) {
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

    lights.forEach(cfg => {
      const color = new THREE.Color(cfg.color || '#ffffff')
      const pos = cfg.position || [0, 2, 0]
      let light

      if (cfg.type === 'spot') {
        light = new THREE.SpotLight(color, cfg.intensity ?? 1, cfg.distance ?? 30, cfg.angle ?? 0.6, cfg.penumbra ?? 0.5, cfg.decay ?? 2)
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
        light = new THREE.PointLight(color, cfg.intensity ?? 1, cfg.distance ?? 30, cfg.decay ?? 2)
        light.position.set(pos[0], pos[1], pos[2])
      }

      light.name = `scene-light-${cfg.id || Math.random().toString(36).slice(2, 6)}`
      parentObject.add(light)
      this._activeSceneLights.push(light)

      console.log(`Created dynamic ${cfg.type || 'point'} light "${light.name}" at [${pos}] intensity=${cfg.intensity}`)
    })
  }

  /**
   * Remove all dynamic scene lights created by setupDynamicLights
   */
  removeDynamicLights() {
    if (!this._activeSceneLights || this._activeSceneLights.length === 0) return
    const parentObject = this.engine.roomModel || this.engine.scene
    this._activeSceneLights.forEach(light => {
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
    if (!this.characterManager) {
      console.warn('CharacterManager not available, skipping character loading')
      return
    }
    if (!scene.characters || scene.characters.length === 0) return

    console.log(`Loading ${scene.characters.length} characters for ${scene.id}`)

    for (const charConfig of scene.characters) {
      try {
        const charId = charConfig.id || `${scene.id}-char-${Math.random().toString(36).substr(2, 9)}`
        
        // Convert array positions to objects
        const position = Array.isArray(charConfig.position)
          ? { x: charConfig.position[0], y: charConfig.position[1], z: charConfig.position[2] }
          : charConfig.position || { x: 0, y: 0, z: 0 }
        
        const rotation = charConfig.rotation
          ? (Array.isArray(charConfig.rotation)
            ? { x: charConfig.rotation[0], y: charConfig.rotation[1], z: charConfig.rotation[2] }
            : charConfig.rotation)
          : { x: 0, y: 0, z: 0 }

        const modelUrl = this.parser?.resolvePath(charConfig.model, this.engine.story.project.assets.basePath) || charConfig.model
        if (!modelUrl) {
          console.warn(`  Skipping character ${charId} — no model path set`)
          continue
        }
        console.log(`  Loading character ${charId}: ${modelUrl}`)

        const resolvedConfig = {
          ...charConfig,
          position,
          rotation,
          model: modelUrl
        }
        
        // Handle delay - don't await, load in background after delay
        const targetOpacity = charConfig.opacity || 0.7
        if (charConfig.delay && charConfig.delay > 0) {
          const timeoutId = setTimeout(async () => {
            // Check if this scene is still active before loading
            if (this.currentSceneId !== scene.id) {
              console.log(`  Skipping delayed character ${charId} - scene ${scene.id} no longer active`)
              return
            }
            try {
              await this.characterManager.loadCharacter(charId, { ...resolvedConfig, delay: 0 })
              // Fade in character (matches original's fadeInCharacter call)
              this.characterManager.fadeInCharacter(charId, 3000, targetOpacity)
              console.log(`  Character ${charId} loaded after delay, fading in to opacity ${targetOpacity}`)
            } catch (err) {
              console.error(`  Failed to load delayed character ${charId}:`, err)
            }
          }, charConfig.delay)
          this.pendingTimeouts.push(timeoutId)
        } else {
          await this.characterManager.loadCharacter(charId, resolvedConfig)
          // Fade in character (matches original's fadeInCharacter call)
          this.characterManager.fadeInCharacter(charId, 3000, targetOpacity)
          console.log(`  Character ${charId} loaded, fading in to opacity ${targetOpacity}`)
        }
      } catch (error) {
        console.error(`Failed to load character:`, error)
        // Continue loading other characters
      }
    }
  }

  /**
   * Load scene objects
   */
  async loadSceneObjects(scene) {
    if (!this.characterManager || !scene.objects) return

    for (const objConfig of scene.objects) {
      const objId = objConfig.id || `${scene.id}-obj-${Math.random().toString(36).substr(2, 9)}`
      
      // Convert array positions to objects
      const position = Array.isArray(objConfig.position)
        ? { x: objConfig.position[0], y: objConfig.position[1], z: objConfig.position[2] }
        : objConfig.position
      
      const rotation = Array.isArray(objConfig.rotation)
        ? { x: objConfig.rotation[0], y: objConfig.rotation[1], z: objConfig.rotation[2] }
        : objConfig.rotation

      const modelUrl = this.parser?.resolvePath(objConfig.model, this.engine.story.project.assets.basePath) || objConfig.model
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
        const videoUrl = this.parser?.resolvePath(videoConfig.url, this.engine.story.project.assets.basePath) || videoConfig.url
        if (!videoUrl) {
          console.warn(`  Skipping video ${videoConfig.id} — no URL set`)
          continue
        }
        console.log(`  Setting up video ${videoConfig.id}: ${videoUrl}, triggerAt: ${videoConfig.triggerAt}s`)

        const resolvedConfig = {
          ...videoConfig,
          url: videoUrl,
          position: videoConfig.position
            ? (Array.isArray(videoConfig.position)
              ? { x: videoConfig.position[0], y: videoConfig.position[1], z: videoConfig.position[2] }
              : videoConfig.position)
            : { x: 0, y: 0, z: 0 },
          rotation: videoConfig.rotation
            ? (Array.isArray(videoConfig.rotation)
              ? { x: videoConfig.rotation[0], y: videoConfig.rotation[1], z: videoConfig.rotation[2] }
              : videoConfig.rotation)
            : { x: 0, y: 0, z: 0 },
          walls: videoConfig.walls?.map(wall => ({
            position: Array.isArray(wall.position)
              ? { x: wall.position[0], y: wall.position[1], z: wall.position[2] }
              : wall.position,
            rotation: Array.isArray(wall.rotation)
              ? { x: wall.rotation[0], y: wall.rotation[1], z: wall.rotation[2] }
              : wall.rotation
          }))
        }
        await this.videoProjector.createVideoProjection(videoConfig.id, resolvedConfig)
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

    // scene.audio is always an array after normalization
    const audioTracks = Array.isArray(scene.audio) ? scene.audio : (scene.audio ? [scene.audio] : [])
    if (audioTracks.length === 0) return

    for (let i = 0; i < audioTracks.length; i++) {
      const audioConf = audioTracks[i]
      if (!audioConf.url) {
        console.log(`No audio file set for ${scene.id} track ${i}, skipping`)
        continue
      }

      const audioId = audioConf.id || `${scene.id}_audio_${i}`
      const audioUrl = this.parser?.resolvePath(audioConf.url, this.engine.story.project.assets.basePath) || audioConf.url

      console.log(`Loading audio for ${scene.id} [${audioId}]: ${audioUrl}`)

      // Setup positional audio if configured (use first track with position data)
      if (audioConf.positional && audioConf.position) {
        this.positionalAudioPosition = Array.isArray(audioConf.position)
          ? new THREE.Vector3(audioConf.position[0], audioConf.position[1], audioConf.position[2])
          : new THREE.Vector3(audioConf.position.x, audioConf.position.y, audioConf.position.z)
        
        this.audioWaypoints = audioConf.waypoints?.map(wp => ({
          time: wp.time,
          position: Array.isArray(wp.position)
            ? new THREE.Vector3(wp.position[0], wp.position[1], wp.position[2])
            : new THREE.Vector3(wp.position.x, wp.position.y, wp.position.z)
        }))
        this.audioWaypointIndex = 0
      }

      // Use the first track for time-update and scene-end callbacks
      const isFirstTrack = (i === 0)

      await this.audioManager.loadAudio(audioId, {
        url: audioUrl,
        volume: audioConf.volume || 0.5,
        loop: audioConf.loop || false,
        positional: audioConf.positional || false,
        position: audioConf.position,
        refDistance: audioConf.refDistance,
        maxDistance: audioConf.maxDistance,
        waypoints: audioConf.waypoints,
        onTimeUpdate: isFirstTrack ? (time) => this.handleAudioTimeUpdate(scene.id, time) : undefined,
        onEnded: isFirstTrack ? () => this.handleSceneEnd(scene.id) : undefined,
      })
      
      // Start playback with optional delay
      const delay = audioConf.delay || 0
      if (audioConf.autoplay !== false) {
        if (delay > 0) {
          const audioDelayId = setTimeout(() => {
            this.audioManager.play(audioId)
            if (isFirstTrack && this.subtitleManager) {
              this.subtitleManager.onAudioStart(scene.id)
            }
          }, delay)
          this.pendingTimeouts.push(audioDelayId)
        } else {
          this.audioManager.play(audioId)
          if (isFirstTrack && this.subtitleManager) {
            this.subtitleManager.onAudioStart(scene.id)
          }
        }
      }
    }
  }

  /**
   * Setup scene effects (walking tour, flicker)
   */
  setupSceneEffects(scene) {
    if (!scene.lighting?.effects || !this.sceneEffects) return

    scene.lighting.effects.forEach(effect => {
      if (effect.type === 'walkingTour') {
        this.sceneEffects.initWalkingTour({
          waypoints: effect.waypoints?.map(wp => ({
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
  setupEndingCondition(scene) {
    const endingConfig = this.engine?.story?.ending
    if (!endingConfig || !endingConfig.triggerMode) return

    // Only set up for the configured trigger scene
    if (endingConfig.triggerSceneId && endingConfig.triggerSceneId !== scene.id) return

    if (endingConfig.triggerMode === 'characterFade') {
      const charId = endingConfig.triggerCharacterId
      if (!charId) return

      console.log(`Setting up character fade effect for ${charId} in ${scene.id} (visual only, ending triggered by last video)`)
      this.characterFadeInComplete = false

      // Start periodic check for the character opacity (visual effect only)
      this.endingCheckInterval = setInterval(() => {
        if (!scene.isActive) {
          clearInterval(this.endingCheckInterval)
          this.endingCheckInterval = null
          return
        }

        if (!this.characterManager) return

        const opacity = this.characterManager.getCharacterOpacity(charId)
        
        // Check if initial fade-in is complete (opacity near target value of 0.7)
        if (!this.characterFadeInComplete && opacity >= 0.65) {
          this.characterFadeInComplete = true
          console.log(`Character fade effect: ${charId} fade-in complete (opacity: ${opacity.toFixed(2)})`)
          
          // Start slow fade out (66 seconds, matching original visual effect)
          this.characterManager.slowFadeOutCharacter(charId, 66000, 0.7)
        }
      }, 1000) // Check every second
    }
  }

  /**
   * Set up video triggers based on audio timestamp
   */
  setupVideoTriggers(videos) {
    this.videoTriggers.clear()
    this.lastVideoId = null
    
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
      console.log(`Last video in scene: ${this.lastVideoId} (triggerAt ${maxTriggerAt}s)`)
    }
  }

  /**
   * Handle audio time updates
   */
  handleAudioTimeUpdate(sceneId, currentTime) {
    // Log time every 5 seconds for debugging
    if (Math.floor(currentTime) % 5 === 0 && Math.floor(currentTime) !== this._lastLogTime) {
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
        console.log(`[${sceneId}] Triggering video: ${videoId} at ${currentTime.toFixed(1)}s`)
        this.triggerVideo(videoId)
      }
    })

    // Update positional audio position based on waypoints
    if (this.audioWaypoints && this.audioManager) {
      this.updatePositionalAudio(sceneId, currentTime)
    }

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
      const walkingTour = scene.lighting.effects.find(e => e.type === 'walkingTour')
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
    if (!this.audioWaypoints || this.audioWaypointIndex >= this.audioWaypoints.length) return

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

    // Fade out currently active videos before playing new one
    for (const activeId of this.activeVideos) {
      if (activeId !== videoId) {
        await this.videoProjector.fadeOutVideo(activeId, 500)
        this.videoProjector.removeVideo(activeId)
      }
    }
    this.activeVideos.clear()

    // Play new video with fade in
    await this.videoProjector.playVideo(videoId, 2000)
    this.activeVideos.add(videoId)

    // Listen for video end to automatically fade out and remove
    // This matches the original project's behavior where videos fade out on 'ended'
    const videoData = this.videoProjector.videos.get(videoId)
    if (videoData && videoData.element) {
      videoData.element.addEventListener('ended', () => {
        console.log(`Video ${videoId} ended, fading out`)
        this.videoProjector.fadeOutVideo(videoId, 500).then(() => {
          this.videoProjector.removeVideo(videoId)
          this.activeVideos.delete(videoId)
          console.log(`Video ${videoId} removed after fade out`)
        })
        
        // Check if this is the last video in the final scene and endingTrigger is "lastVideo"
        const endingConfig = this.engine?.story?.ending
        if (endingConfig?.endingTrigger === 'lastVideo' && 
            videoId === this.lastVideoId &&
            endingConfig.triggerSceneId === this.currentSceneId) {
          console.log(`Last video ${videoId} ended in final scene - triggering ending sequence (3s delay)`)
          const endingTimeout = setTimeout(() => {
            this.engine.handleComplete()
          }, 3000)
          this.pendingTimeouts.push(endingTimeout)
        }
      }, { once: true })
    }
  }

  /**
   * Start guided camera animation for the given scene.
   * Uses audio time if audio is playing; otherwise falls back to a wall-clock timer
   * so keyframes still work in scenes without audio.
   */
  startGuidedCamera(sceneId) {
    const controller = this.engine?.guidedCameraController
    if (!controller) return

    // Check if this scene has any keyframes
    const positions = controller.sceneCameraPositions[sceneId]
    if (!positions || positions.length === 0) return

    // Build a getAudioTime callback — prefer the first audio track for this scene;
    // fall back to a wall-clock timer so keyframes work even without audio.
    const firstAudioId = this._getFirstAudioIdForScene(sceneId)
    let getTime

    if (firstAudioId && this.audioManager) {
      getTime = () => this.audioManager.getCurrentTime(firstAudioId)
    } else {
      // No audio — use a wall-clock timer starting now
      const start = performance.now()
      getTime = () => (performance.now() - start) / 1000
    }

    controller.startSceneTracking(sceneId, getTime)
    console.log(`Guided camera tracking started for ${sceneId} (${positions.length} keyframes)`)
  }

  /**
   * Stop guided camera animation
   */
  stopGuidedCamera() {
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
    const audioTracks = Array.isArray(scene.audio) ? scene.audio : (scene.audio ? [scene.audio] : [])
    if (audioTracks.length === 0) return null
    return audioTracks[0].id || `${sceneId}_audio_0`
  }

  /**
   * Deactivate a scene
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

    // Fade out and remove videos
    if (this.videoProjector && scene.videos) {
      for (const video of scene.videos) {
        await this.videoProjector.fadeOutVideo(video.id, 500)
        this.videoProjector.removeVideo(video.id)
      }
    }

    // Fade out characters before removing (matching original behavior)
    if (this.characterManager) {
      const charIds = this.characterManager.sceneCharacterMap.get(sceneId)
      if (charIds && charIds.size > 0) {
        // Fade out all characters in this scene
        const fadePromises = []
        charIds.forEach(charId => {
          fadePromises.push(new Promise(resolve => {
            this.characterManager.fadeOutCharacter(charId, 1000)
            setTimeout(resolve, 1000) // Wait for fade to complete
          }))
        })
        await Promise.all(fadePromises)
      }
      this.characterManager.removeSceneCharacters(sceneId)
    }

    // Remove volumetric lighting
    if (this.volumetricLighting) {
      this.volumetricLighting.fadeOut(sceneId, 500)
    }

    // Remove dynamic scene lights
    this.removeDynamicLights()

    // Stop guided camera tracking
    this.stopGuidedCamera()

    // Stop scene effects
    if (this.sceneEffects) {
      this.sceneEffects.stopWalkingTour()
      this.sceneEffects.stopFlicker()
    }

    // Clear ending check interval
    if (this.endingCheckInterval) {
      clearInterval(this.endingCheckInterval)
      this.endingCheckInterval = null
    }
    this.characterFadeInComplete = false

    // Clear all pending delayed timeouts (prevents characters loading into wrong scenes)
    this.pendingTimeouts.forEach(id => clearTimeout(id))
    this.pendingTimeouts = []

    // Clear state
    this.videoTriggers.clear()
    this.activeVideos.clear()
    this.positionalAudioPosition = null
    this.audioWaypoints = null
    this.audioWaypointIndex = 0
    this.flickerTriggerTime = undefined
    this.flickerTriggered = false
    this.walkingTourStarted = false

    scene.isActive = false
  }

  /**
   * Handle scene end (audio finished)
   */
  handleSceneEnd(sceneId) {
    const scene = this.scenes.get(sceneId)
    console.log(`Scene ended: ${sceneId}, nextScene: ${scene?.nextScene}`)
    
    // Notify subtitle manager
    if (this.subtitleManager) {
      this.subtitleManager.onAudioEnd()
    }

    // Restore original lighting when audio ends (matching original behavior)
    // EXCEPT for scenes with walking tour (scene3) - those handle their own lighting
    const hasWalkingTour = scene?.lighting?.effects?.some(e => e.type === 'walkingTour')
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
    const currentIndex = scenes.findIndex(s => s.id === this.currentSceneId)
    
    if (currentIndex < scenes.length - 1) {
      await this.changeScene(scenes[currentIndex + 1].id)
    }
  }

  async previousScene() {
    const scenes = this.getAllScenes()
    const currentIndex = scenes.findIndex(s => s.id === this.currentSceneId)
    
    if (currentIndex > 0) {
      await this.changeScene(scenes[currentIndex - 1].id)
    }
  }

  skipCurrentScene() {
    if (this.audioManager && this.currentSceneId) {
      const audioId = `${this.currentSceneId}_audio`
      this.audioManager.stop(audioId)
      this.handleSceneEnd(this.currentSceneId)
    }
  }

  pause() {
    if (this.audioManager && this.currentSceneId) {
      const audioId = `${this.currentSceneId}_audio`
      this.audioManager.pause(audioId)
    }

    this.activeVideos.forEach((videoId) => {
      this.videoProjector?.pause(videoId)
    })
  }

  resume() {
    if (this.audioManager && this.currentSceneId) {
      const audioId = `${this.currentSceneId}_audio`
      this.audioManager.play(audioId)
    }

    this.activeVideos.forEach((videoId) => {
      this.videoProjector?.play(videoId)
    })
  }

  /**
   * Update (called each frame)
   */
  update(delta) {
    if (this.characterManager) {
      this.characterManager.update(delta)
    }
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
