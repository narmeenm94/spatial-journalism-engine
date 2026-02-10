/**
 * SceneEffects - Special lighting effects for scenes
 * Ported from Shadows of the Stabilisation Point
 * Supports: Walking tour highlight, Flicker effects
 * 
 * IMPORTANT: The highlight light for the walking tour must be added to the
 * room model (not the scene root) because waypoint positions are in
 * room-model-local coordinate space. This matches the original implementation
 * where Scene3LightingManager adds the light to this.roomModel.
 */

export class SceneEffects {
  /**
   * @param {object} options
   * @param {THREE.Object3D} options.roomModel - Room model object (for highlight light placement)
   * @param {object} options.lights - References to global lights { ambient, directional, hemisphere }
   * @param {string} options.language - Current language
   */
  constructor(options = {}) {
    // CRITICAL: Use roomModel for highlight light, not the scene root
    // roomModel may be set later via direct assignment after environment loads
    this.roomModel = options.roomModel || options.scene || null
    this.lights = options.lights || { ambient: null, directional: null, hemisphere: null }
    this.language = options.language || 'en'
    
    // Highlight light for walking tour
    this.highlightLight = null
    
    // State
    this.isRunning = false
    this.currentAnimation = null
    this.startTime = null
    this.hasTransitionedToEndState = false
    
    // Flicker state
    this.isFlickering = false
    
    // Original light intensities - stored when effects START, restored when they STOP
    // These represent the light state BEFORE the effect was applied
    this.savedIntensities = null
    
    // Effect configurations
    this.walkingTourConfig = null
    this.flickerConfig = null
    
    // Guidance text
    this.guidanceTexts = {
      en: 'Follow the Light...',
      fi: 'Seuraa valoa...'
    }
  }

  /**
   * Set light references
   */
  setLights(lights) {
    this.lights = lights
  }

  /**
   * Save current light intensities before applying an effect
   */
  saveCurrentIntensities() {
    this.savedIntensities = {
      ambient: this.lights.ambient?.intensity || 0,
      directional: this.lights.directional?.intensity || 0,
      hemisphere: this.lights.hemisphere?.intensity || 0
    }
  }

  /**
   * Initialize walking tour effect
   */
  initWalkingTour(config) {
    this.walkingTourConfig = {
      waypoints: config.waypoints || [],
      dimLights: config.dimLights || { ambient: 0.05, directional: 0.2, hemisphere: 0.02 },
      endLights: config.endLights || { ambient: 0.25, directional: 0.5, hemisphere: 0.05 },
      guidanceText: config.guidanceText || this.guidanceTexts
    }

    // Create highlight light and add it to the ROOM MODEL (not scene root)
    // This is critical because waypoint positions are in room-model-local space
    if (!this.highlightLight && this.roomModel) {
      this.highlightLight = new THREE.PointLight(0x00ffff, 0, 5)
      this.highlightLight.castShadow = true
      this.highlightLight.distance = 1.5
      this.highlightLight.decay = 2.0
      // Add to room model so positions match the room's local coordinate space
      this.roomModel.add(this.highlightLight)
      console.log('SceneEffects: Highlight light added to room model')
    } else if (!this.roomModel) {
      console.warn('SceneEffects: roomModel not available, highlight light not created')
    }
  }

  /**
   * Initialize flicker effect
   */
  initFlicker(config) {
    this.flickerConfig = {
      triggerTime: config.triggerTime || 0,
      patterns: config.patterns || [
        { duration: 100, intensity: 0.1 },
        { duration: 50, intensity: 0.8 },
        { duration: 200, intensity: 0.3 },
        { duration: 150, intensity: 0.9 },
        { duration: 300, intensity: 0.2 },
        { duration: 100, intensity: 1.0 },
        { duration: 400, intensity: 0.15 },
        { duration: 200, intensity: 0.7 },
        { duration: 150, intensity: 0.4 },
        { duration: 300, intensity: 1.0 }
      ]
    }
  }

  /**
   * Transition light intensities (absolute target values, not multipliers)
   */
  transitionLights(targetIntensities, duration = 2000) {
    return new Promise((resolve) => {
      const startIntensities = {
        ambient: this.lights.ambient?.intensity || 0,
        directional: this.lights.directional?.intensity || 0,
        hemisphere: this.lights.hemisphere?.intensity || 0
      }
      
      const startTime = performance.now()

      const animate = () => {
        const elapsed = performance.now() - startTime
        const progress = Math.min(elapsed / duration, 1)

        // Ease in-out
        const easeProgress = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2

        if (this.lights.ambient) {
          this.lights.ambient.intensity = startIntensities.ambient +
            (targetIntensities.ambient - startIntensities.ambient) * easeProgress
        }
        if (this.lights.directional) {
          this.lights.directional.intensity = startIntensities.directional +
            (targetIntensities.directional - startIntensities.directional) * easeProgress
        }
        if (this.lights.hemisphere) {
          this.lights.hemisphere.intensity = startIntensities.hemisphere +
            (targetIntensities.hemisphere - startIntensities.hemisphere) * easeProgress
        }

        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          resolve()
        }
      }

      requestAnimationFrame(animate)
    })
  }

  /**
   * Create guidance text element
   */
  createGuidanceText() {
    const textElement = document.createElement('div')
    textElement.id = 'sj-guidance-text'
    textElement.style.cssText = `
      position: fixed;
      top: 10%;
      left: 50%;
      transform: translateX(-50%);
      color: white;
      font-size: 22px;
      opacity: 0;
      transition: opacity 2s ease;
      z-index: 10000;
      text-align: center;
      text-shadow: 0 2px 4px rgba(0,0,0,0.5);
    `
    
    const text = this.walkingTourConfig?.guidanceText?.[this.language] || 
                 this.guidanceTexts[this.language]
    textElement.textContent = text

    document.body.appendChild(textElement)
    return textElement
  }

  /**
   * Start walking tour effect
   */
  startWalkingTour() {
    if (!this.walkingTourConfig || !this.highlightLight) return

    this.isRunning = true
    this.startTime = performance.now() / 1000
    this.hasTransitionedToEndState = false

    // Save current light intensities before dimming
    this.saveCurrentIntensities()

    // Show guidance text
    const guidanceText = this.createGuidanceText()
    setTimeout(() => guidanceText.style.opacity = '1', 100)
    setTimeout(() => {
      guidanceText.style.opacity = '0'
      setTimeout(() => guidanceText.remove(), 2000)
    }, 7000)

    // Dim lights to walking tour dim state
    this.transitionLights(this.walkingTourConfig.dimLights)

    // Start animation
    this.runWalkingTourAnimation()
    console.log('SceneEffects: Walking tour started')
  }

  /**
   * Run walking tour animation
   */
  runWalkingTourAnimation() {
    if (!this.isRunning || !this.startTime) return

    const waypoints = this.walkingTourConfig.waypoints
    if (!waypoints || waypoints.length === 0) return

    const realTimeSeconds = (performance.now() / 1000) - this.startTime

    // Handle pre-first-waypoint state
    if (realTimeSeconds < waypoints[0].time) {
      this.highlightLight.intensity = 0
      this.currentAnimation = requestAnimationFrame(() => this.runWalkingTourAnimation())
      return
    }

    // Check for end state
    const lastWaypointTime = waypoints[waypoints.length - 1].time
    if (realTimeSeconds >= lastWaypointTime + 1.0 && !this.hasTransitionedToEndState) {
      this.hasTransitionedToEndState = true
      // Transition to brighter end state lighting
      this.transitionLights(this.walkingTourConfig.endLights)
      console.log('SceneEffects: Walking tour transitioning to end state lighting')
    }

    // Find current waypoint
    let currentWaypoint = waypoints[0]
    let nextWaypoint = waypoints[0]

    for (let i = 0; i < waypoints.length - 1; i++) {
      if (realTimeSeconds >= waypoints[i].time && realTimeSeconds < waypoints[i + 1].time) {
        currentWaypoint = waypoints[i]
        nextWaypoint = waypoints[i + 1]
        break
      }
    }

    const transitionDuration = 1.0
    const timeInTransition = realTimeSeconds - currentWaypoint.time

    if (realTimeSeconds < lastWaypointTime + 1.0) {
      // Update position in room-model-local space
      const pos = currentWaypoint.position
      this.highlightLight.position.set(pos.x, pos.y, pos.z)

      // Update intensity (fade in/out)
      if (timeInTransition < transitionDuration) {
        this.highlightLight.intensity = Math.min(timeInTransition / transitionDuration, 1) * 1.5
      } else if (nextWaypoint.time - realTimeSeconds < transitionDuration) {
        this.highlightLight.intensity = Math.max((nextWaypoint.time - realTimeSeconds) / transitionDuration, 0) * 1.5
      } else {
        this.highlightLight.intensity = 1.5
      }
    } else {
      this.highlightLight.intensity = 0
    }

    this.currentAnimation = requestAnimationFrame(() => this.runWalkingTourAnimation())
  }

  /**
   * Stop walking tour effect
   * IMPORTANT: Does NOT restore global lighting - the LightingManager handles
   * that during scene transitions to avoid conflicting animation loops.
   */
  stopWalkingTour() {
    this.isRunning = false
    this.hasTransitionedToEndState = false
    
    if (this.currentAnimation) {
      cancelAnimationFrame(this.currentAnimation)
      this.currentAnimation = null
    }

    // Turn off highlight light
    if (this.highlightLight) {
      this.highlightLight.intensity = 0
    }

    // NOTE: We intentionally do NOT restore global light intensities here.
    // The LightingManager will handle the transition to the next scene's
    // lighting via applySceneLighting(). Restoring here would create
    // conflicting animation loops that cause lights to flicker/fight.
    console.log('SceneEffects: Walking tour stopped (highlight light off, global lights left as-is)')
  }

  /**
   * Start flicker effect
   */
  async startFlicker() {
    if (this.isFlickering || !this.flickerConfig) return
    this.isFlickering = true

    // Save current intensities before flickering
    this.saveCurrentIntensities()
    console.log('SceneEffects: Flicker starting, saved intensities:', { ...this.savedIntensities })

    const applyIntensity = (multiplier) => {
      if (this.lights.ambient && this.savedIntensities) {
        this.lights.ambient.intensity = this.savedIntensities.ambient * multiplier
      }
      if (this.lights.directional && this.savedIntensities) {
        this.lights.directional.intensity = this.savedIntensities.directional * multiplier
      }
      if (this.lights.hemisphere && this.savedIntensities) {
        this.lights.hemisphere.intensity = this.savedIntensities.hemisphere * multiplier
      }
    }

    for (const pattern of this.flickerConfig.patterns) {
      if (!this.isFlickering) break
      applyIntensity(pattern.intensity)
      await new Promise(resolve => setTimeout(resolve, pattern.duration))
    }

    // Restore to saved intensities (the state before flicker started)
    if (this.savedIntensities) {
      applyIntensity(1.0)
    }
    this.isFlickering = false
    console.log('SceneEffects: Flicker complete, restored to pre-flicker intensities')
  }

  /**
   * Stop flicker effect
   * IMPORTANT: Only stops the flicker loop. Does NOT force-restore light values.
   * The flicker's own completion will restore to pre-flicker values.
   * Scene transitions are handled by LightingManager.
   */
  stopFlicker() {
    this.isFlickering = false
    // NOTE: We intentionally do NOT force-restore light intensities here.
    // If the flicker was interrupted mid-pattern, the LightingManager will
    // handle the correct lighting via applySceneLighting() for the next scene.
    console.log('SceneEffects: Flicker stopped')
  }

  /**
   * Set language
   */
  setLanguage(language) {
    this.language = language
  }

  /**
   * Clean up
   */
  dispose() {
    this.stopWalkingTour()
    this.isFlickering = false
    
    if (this.highlightLight && this.roomModel) {
      this.roomModel.remove(this.highlightLight)
    }

    // Remove guidance text if exists
    const guidanceText = document.getElementById('sj-guidance-text')
    if (guidanceText) {
      guidanceText.remove()
    }
  }
}

export default SceneEffects
