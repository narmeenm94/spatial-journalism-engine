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

    // Playback offsets follow the audio device clock, which freezes when the
    // browser suspends audio. Wall time would run ahead of audible narration.
    this.playOffsets = new Map()
    this.playStartTimes = new Map() // audioId -> AudioContext time in seconds
    this.timeTrackingActive = new Map() // audioId -> boolean

    this.initListener()
  }

  /**
   * Initialize audio listener
   */
  initListener() {
    if (!this.camera || typeof THREE === 'undefined') return

    // Check if camera already has an AudioListener
    let listener = this.camera.children.find(
      (child) => child instanceof THREE.AudioListener
    )
    if (!listener) {
      listener = new THREE.AudioListener()
      this.camera.add(listener)
    }
    this.listener = listener
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
        console.warn(
          'AudioListener not initialized, attempting to initialize...'
        )
        this.initListener()
        if (!this.listener) {
          reject(new Error('AudioListener not initialized'))
          return
        }
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
              const pos = Array.isArray(position)
                ? { x: position[0], y: position[1], z: position[2] }
                : position
              sound.position.set(pos.x, pos.y, pos.z)
            }
          }

          // Store waypoints for position updates
          if (waypoints && waypoints.length > 0) {
            sound.userData = {
              waypoints: [...waypoints].sort((a,b) => a.time-b.time).map((w) => ({
                ...w,
                position: Array.isArray(w.position)
                  ? { x: w.position[0], y: w.position[1], z: w.position[2] }
                  : w.position
              })),
              currentWaypointIndex: 0
            }
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
            console.log(`Audio ended: ${audioId}`)
            sound.isPlaying = false
            this.playOffsets.set(audioId, buffer.duration)
            this.timeTrackingActive.set(audioId, false)
            const callback = this.audioEndCallbacks.get(audioId)
            if (callback) callback()
          }

          this.sounds.set(audioId, sound)
          console.log(`Audio loaded: ${audioId}, duration: ${buffer.duration}s`)

          resolve(sound)
        },
        (progress) => {
          // Loading progress
        },
        (error) => {
          console.error(`Failed to load audio ${audioId} from ${url}:`, error)
          reject(
            new Error(
              `Failed to load audio ${audioId}: ${error?.message || 'Unknown error'}`
            )
          )
        }
      )
    })
  }

  /**
   * Play audio by ID
   * @param {string} audioId - Audio identifier
   */
  play(audioId) {
    const sound = this.sounds.get(audioId)
    if (sound && !sound.isPlaying) {
      try {
        sound.play()
        this.currentAudio = audioId
        // Record the actual time when playback started
        this.playStartTimes.set(audioId, this.getClockTime(sound))
        this.startTimeTracking(audioId)
        console.log(`Audio playing: ${audioId}`)
      } catch (error) {
        console.error(`Error playing audio ${audioId}:`, error)
      }
    }
  }

  /**
   * Start playback-time notifications
   * @param {string} audioId - Audio identifier
   */
  startTimeTracking(audioId) {
    const sound = this.sounds.get(audioId)
    if (!sound) return

    this.timeTrackingActive.set(audioId, true)

    const trackTime = () => {
      if (!this.timeTrackingActive.get(audioId)) return
      if (!sound.isPlaying) {
        // Audio stopped externally
        return
      }

      // Read the same clock that advances the audio source.
      const startTime = this.playStartTimes.get(audioId)
      if (startTime === undefined) return

      const currentTime = this.getCurrentTime(audioId) // Convert to seconds

      // Call time update callback
      const callback = this.timeUpdateCallbacks.get(audioId)
      if (callback) {
        callback(currentTime)
      }

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
          const progress =
            (currentTime - current.time) / (next.time - current.time)
          const clampedProgress = Math.min(Math.max(progress, 0), 1)
          const pos = {
            x:
              current.position.x +
              (next.position.x - current.position.x) * clampedProgress,
            y:
              current.position.y +
              (next.position.y - current.position.y) * clampedProgress,
            z:
              current.position.z +
              (next.position.z - current.position.z) * clampedProgress
          }
          sound.position.set(pos.x, pos.y, pos.z)
        } else {
          const pos = current.position
          sound.position.set(pos.x, pos.y, pos.z)
        }
        break
      }
    }
  }

  /**
   * Pause audio by ID
   * @param {string} audioId - Audio identifier
   */
  pause(audioId) {
    const sound = this.sounds.get(audioId)
    if (sound && sound.isPlaying) {
      this.playOffsets.set(audioId, this.getCurrentTime(audioId))
      sound.pause()
      this.timeTrackingActive.set(audioId, false)
    }
  }

  /**
   * Stop audio by ID
   * @param {string} audioId - Audio identifier
   */
  stop(audioId) {
    const sound = this.sounds.get(audioId)
    if (sound) {
      if (sound.isPlaying) {
        sound.stop()
      }
      sound.offset = 0
      sound._progress = 0
      this.playOffsets.set(audioId, 0)
      this.timeTrackingActive.set(audioId, false)
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
    const startTime = this.playStartTimes.get(audioId)
    const offset = this.playOffsets.get(audioId) || 0
    if (startTime !== undefined && this.timeTrackingActive.get(audioId)) {
      const time = offset + Math.max(0, this.getClockTime(sound) - startTime) * (sound?.playbackRate ?? 1)
      return sound?.loop ? time : Math.min(time, sound?.buffer?.duration ?? Infinity)
    }
    return offset
  }

  getClockTime(sound) {
    return sound?.context?.currentTime ?? this.listener?.context?.currentTime ?? performance.now() / 1000
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
   * Set position for positional audio
   * @param {string} audioId - Audio identifier
   * @param {THREE.Vector3} position - Position
   */
  setPosition(audioId, position) {
    const sound = this.sounds.get(audioId)
    if (sound) {
      sound.position.set(position.x, position.y, position.z)
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
      if (!sound || !sound.isPlaying) {
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
          this.timeTrackingActive.set(audioId, false)
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
      sound.parent?.remove(sound)
      // A loaded, unplayed object sound has no source node yet.
      if (sound.source && sound._connected) sound.disconnect()
      sound.panner?.disconnect()
      sound.gain?.disconnect()
      this.playOffsets.delete(audioId)
      this.sounds.delete(audioId)
      this.audioEndCallbacks.delete(audioId)
      this.timeUpdateCallbacks.delete(audioId)
      this.playStartTimes.delete(audioId)
      this.timeTrackingActive.delete(audioId)
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
    this.playStartTimes.clear()
    this.timeTrackingActive.clear()
  }
}

export default AudioManager
