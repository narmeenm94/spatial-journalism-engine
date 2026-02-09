/**
 * AudioManager - Handles audio playback including positional audio
 * Extracted and refactored from Shadows of the Stabilisation Point
 */

export class AudioManager {
  /**
   * Create AudioManager
   * @param {THREE.Camera} camera - Camera for AudioListener attachment
   */
  constructor(camera) {
    this.camera = camera
    this.sounds = new Map()
    this.listener = null
    this.currentAudio = null
    
    this.audioEndCallbacks = new Map()
    this.positionUpdateCallbacks = new Map()
    this.timeUpdateCallbacks = new Map()
    
    this.initListener()
  }

  /**
   * Initialize audio listener
   */
  initListener() {
    if (!this.camera || typeof THREE === 'undefined') return
    
    // Check if camera already has an AudioListener
    let listener = this.camera.children.find(child => child instanceof THREE.AudioListener)
    if (!listener) {
      listener = new THREE.AudioListener()
      this.camera.add(listener)
    }
    this.listener = listener
  }

  /**
   * Load audio from configuration
   * @param {object} config - Audio configuration from JSON
   * @returns {Promise<THREE.Audio>} Loaded audio object
   */
  async loadFromConfig(config) {
    if (!config || !config.url) return null
    
    return this.loadAudio(config.id || 'main', {
      url: config.url,
      volume: config.volume,
      loop: config.loop,
      autoplay: config.autoplay,
      delay: config.delay,
      positional: config.positional,
      position: config.position,
      refDistance: config.refDistance,
      maxDistance: config.maxDistance,
      waypoints: config.waypoints
    })
  }

  /**
   * Load and create audio
   * @param {string} audioId - Unique audio identifier
   * @param {object} options - Audio options
   * @returns {Promise<THREE.Audio>} Audio object
   */
  loadAudio(audioId, options = {}) {
    const {
      url,
      volume = 0.5,
      loop = false,
      autoplay = false,
      delay = 0,
      onEnded = null,
      positional = false,
      position = null,
      refDistance = 15,
      maxDistance = 50,
      rolloffFactor = 1,
      waypoints = [],
      onTimeUpdate = null
    } = options

    return new Promise((resolve, reject) => {
      if (!this.listener) {
        reject(new Error('AudioListener not initialized'))
        return
      }

      // Create positional or regular audio
      const sound = positional
        ? new THREE.PositionalAudio(this.listener)
        : new THREE.Audio(this.listener)

      const loader = new THREE.AudioLoader()

      loader.load(
        url,
        (buffer) => {
          sound.setBuffer(buffer)
          sound.setLoop(loop)
          sound.setVolume(volume)

          // Configure positional audio
          if (positional && sound.panner) {
            sound.setRefDistance(refDistance)
            sound.setMaxDistance(maxDistance)
            sound.setRolloffFactor(rolloffFactor)
            
            if (position) {
              sound.position.set(position.x, position.y, position.z)
            }
          }

          // Store waypoints for position updates
          if (waypoints.length > 0) {
            sound.userData = { waypoints, currentWaypointIndex: 0 }
          }

          // Set up time update callback
          if (onTimeUpdate) {
            this.timeUpdateCallbacks.set(audioId, onTimeUpdate)
          }

          // Set up end callback
          if (onEnded) {
            this.audioEndCallbacks.set(audioId, onEnded)
          }

          sound.onEnded = () => {
            const callback = this.audioEndCallbacks.get(audioId)
            if (callback) callback()
          }

          this.sounds.set(audioId, sound)

          // Auto-play with optional delay
          if (autoplay) {
            if (delay > 0) {
              setTimeout(() => {
                if (sound.buffer && !sound.isPlaying) {
                  sound.play()
                  this.startTimeTracking(audioId)
                }
              }, delay)
            } else {
              sound.play()
              this.startTimeTracking(audioId)
            }
          }

          resolve(sound)
        },
        undefined,
        (error) => {
          reject(new Error(`Failed to load audio ${audioId}: ${error.message}`))
        }
      )
    })
  }

  /**
   * Start time tracking for audio
   * @param {string} audioId - Audio identifier
   */
  startTimeTracking(audioId) {
    const sound = this.sounds.get(audioId)
    if (!sound) return

    const trackTime = () => {
      if (!sound.isPlaying) return

      const currentTime = sound.context.currentTime - sound.startTime
      
      // Call time update callback
      const callback = this.timeUpdateCallbacks.get(audioId)
      if (callback) callback(currentTime)

      // Update positional audio based on waypoints
      if (sound.userData?.waypoints) {
        this.updateAudioPosition(audioId, currentTime)
      }

      requestAnimationFrame(trackTime)
    }

    requestAnimationFrame(trackTime)
  }

  /**
   * Update audio position based on waypoints
   * @param {string} audioId - Audio identifier
   * @param {number} currentTime - Current playback time
   */
  updateAudioPosition(audioId, currentTime) {
    const sound = this.sounds.get(audioId)
    if (!sound || !sound.userData?.waypoints) return

    const waypoints = sound.userData.waypoints
    
    // Find current waypoint
    for (let i = waypoints.length - 1; i >= 0; i--) {
      if (currentTime >= waypoints[i].time) {
        const current = waypoints[i]
        const next = waypoints[i + 1]
        
        if (next) {
          // Interpolate between waypoints
          const progress = (currentTime - current.time) / (next.time - current.time)
          const pos = {
            x: current.position.x + (next.position.x - current.position.x) * progress,
            y: current.position.y + (next.position.y - current.position.y) * progress,
            z: current.position.z + (next.position.z - current.position.z) * progress
          }
          sound.position.set(pos.x, pos.y, pos.z)
        } else {
          sound.position.set(current.position.x, current.position.y, current.position.z)
        }
        break
      }
    }
  }

  /**
   * Play audio by ID
   * @param {string} audioId - Audio identifier
   */
  play(audioId) {
    const sound = this.sounds.get(audioId)
    if (sound && !sound.isPlaying) {
      sound.play()
      this.currentAudio = audioId
      this.startTimeTracking(audioId)
    }
  }

  /**
   * Pause audio by ID
   * @param {string} audioId - Audio identifier
   */
  pause(audioId) {
    const sound = this.sounds.get(audioId)
    if (sound && sound.isPlaying) {
      sound.pause()
    }
  }

  /**
   * Stop audio by ID
   * @param {string} audioId - Audio identifier
   */
  stop(audioId) {
    const sound = this.sounds.get(audioId)
    if (sound) {
      sound.stop()
    }
  }

  /**
   * Check if audio is playing
   * @param {string} audioId - Audio identifier
   * @returns {boolean} Playing state
   */
  isPlaying(audioId) {
    const sound = this.sounds.get(audioId)
    return sound ? sound.isPlaying : false
  }

  /**
   * Get current playback time
   * @param {string} audioId - Audio identifier
   * @returns {number} Current time in seconds
   */
  getCurrentTime(audioId) {
    const sound = this.sounds.get(audioId)
    if (sound && sound.isPlaying) {
      return sound.context.currentTime - sound.startTime
    }
    return 0
  }

  /**
   * Set volume for audio
   * @param {string} audioId - Audio identifier
   * @param {number} volume - Volume (0-1)
   */
  setVolume(audioId, volume) {
    const sound = this.sounds.get(audioId)
    if (sound) {
      sound.setVolume(Math.max(0, Math.min(1, volume)))
    }
  }

  /**
   * Fade out audio
   * @param {string} audioId - Audio identifier
   * @param {number} duration - Fade duration in ms
   * @returns {Promise} Resolves when fade complete
   */
  fadeOut(audioId, duration = 1000) {
    return new Promise((resolve) => {
      const sound = this.sounds.get(audioId)
      if (!sound) {
        resolve()
        return
      }

      const startVolume = sound.getVolume()
      const startTime = performance.now()

      const fade = () => {
        const elapsed = performance.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        sound.setVolume(startVolume * (1 - progress))

        if (progress < 1) {
          requestAnimationFrame(fade)
        } else {
          sound.stop()
          resolve()
        }
      }

      requestAnimationFrame(fade)
    })
  }

  /**
   * Remove audio
   * @param {string} audioId - Audio identifier
   */
  removeAudio(audioId) {
    const sound = this.sounds.get(audioId)
    if (sound) {
      if (sound.isPlaying) sound.stop()
      sound.disconnect()
      this.sounds.delete(audioId)
      this.audioEndCallbacks.delete(audioId)
      this.timeUpdateCallbacks.delete(audioId)
    }
  }

  /**
   * Stop all audio and clean up
   */
  dispose() {
    this.sounds.forEach((sound, id) => {
      this.removeAudio(id)
    })
    this.sounds.clear()
    this.audioEndCallbacks.clear()
    this.timeUpdateCallbacks.clear()
  }
}

export default AudioManager
