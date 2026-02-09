/**
 * VideoManager - Handles video projection onto 3D planes
 * Extracted and refactored from Shadows of the Stabilisation Point
 */

export class VideoManager {
  /**
   * Create VideoManager
   * @param {THREE.Scene} scene - Three.js scene to add video planes to
   */
  constructor(scene) {
    this.scene = scene
    this.videos = new Map()
    this.isIOS = this.detectIOS()
  }

  /**
   * Detect iOS device
   * @returns {boolean} True if iOS
   */
  detectIOS() {
    return /iPad|iPhone|iPod/.test(navigator.platform) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  }

  /**
   * Load videos from scene configuration
   * @param {array} videoConfigs - Array of video configurations from JSON
   */
  async loadFromConfig(videoConfigs) {
    if (!videoConfigs || !Array.isArray(videoConfigs)) return

    for (const config of videoConfigs) {
      await this.createVideo(config)
    }
  }

  /**
   * Create a video projection
   * @param {object} config - Video configuration
   * @returns {Promise<object>} Video data object
   */
  async createVideo(config) {
    const {
      id,
      url,
      position,
      rotation,
      size = [64, 40],
      opacity = 0.9,
      loop = false,
      muted = true,
      multiWall = false,
      walls = []
    } = config

    const videoElement = this.createVideoElement(url, loop, muted)
    
    // Wait for video to be ready
    await new Promise((resolve) => {
      videoElement.onloadeddata = resolve
      videoElement.onerror = resolve
    })

    if (multiWall && walls.length > 0) {
      // Multi-wall display
      return this.createMultiWallVideo(id, videoElement, walls, size, opacity)
    } else {
      // Single video plane
      return this.createSingleVideo(id, videoElement, position, rotation, size, opacity)
    }
  }

  /**
   * Create video HTML element
   * @param {string} url - Video URL
   * @param {boolean} loop - Loop video
   * @param {boolean} muted - Mute video
   * @returns {HTMLVideoElement} Video element
   */
  createVideoElement(url, loop, muted) {
    const video = document.createElement('video')
    video.src = url
    video.crossOrigin = 'anonymous'
    video.loop = loop
    video.muted = muted
    video.playsInline = true
    video.setAttribute('playsinline', '')
    video.setAttribute('webkit-playsinline', '')

    // iOS requires video in DOM
    if (this.isIOS) {
      video.style.cssText = 'width:1px;height:1px;position:absolute;top:0;left:0;opacity:0'
      document.body.appendChild(video)
    }

    video.pause()
    return video
  }

  /**
   * Create single video plane
   */
  createSingleVideo(id, videoElement, position, rotation, size, opacity) {
    const texture = new THREE.VideoTexture(videoElement)
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.format = THREE.RGBAFormat

    const geometry = new THREE.PlaneGeometry(size[0], size[1])
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: opacity,
      side: THREE.DoubleSide
    })

    const mesh = new THREE.Mesh(geometry, material)
    
    if (position) {
      mesh.position.set(position.x, position.y, position.z)
    }
    if (rotation) {
      mesh.rotation.set(rotation.x, rotation.y, rotation.z)
    }

    mesh.visible = false
    this.scene.add(mesh)

    const videoData = {
      id,
      element: videoElement,
      texture,
      mesh,
      material,
      meshes: [mesh]
    }

    this.videos.set(id, videoData)
    return videoData
  }

  /**
   * Create multi-wall video display
   */
  createMultiWallVideo(id, videoElement, walls, size, opacity) {
    const texture = new THREE.VideoTexture(videoElement)
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.format = THREE.RGBAFormat

    const meshes = walls.map((wall) => {
      const geometry = new THREE.PlaneGeometry(size[0], size[1])
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: opacity,
        side: THREE.DoubleSide
      })

      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(wall.position.x, wall.position.y, wall.position.z)
      mesh.rotation.set(wall.rotation.x, wall.rotation.y, wall.rotation.z)
      mesh.visible = false
      this.scene.add(mesh)
      return mesh
    })

    const videoData = {
      id,
      element: videoElement,
      texture,
      meshes,
      material: meshes[0]?.material
    }

    this.videos.set(id, videoData)
    return videoData
  }

  /**
   * Play video
   * @param {string} videoId - Video identifier
   */
  play(videoId) {
    const videoData = this.videos.get(videoId)
    if (videoData) {
      videoData.element.play()
      videoData.meshes.forEach(mesh => mesh.visible = true)
    }
  }

  /**
   * Pause video
   * @param {string} videoId - Video identifier
   */
  pause(videoId) {
    const videoData = this.videos.get(videoId)
    if (videoData) {
      videoData.element.pause()
    }
  }

  /**
   * Stop and hide video
   * @param {string} videoId - Video identifier
   */
  stop(videoId) {
    const videoData = this.videos.get(videoId)
    if (videoData) {
      videoData.element.pause()
      if (Number.isFinite(videoData.element.duration)) {
        videoData.element.currentTime = 0
      }
      videoData.meshes.forEach(mesh => mesh.visible = false)
    }
  }

  /**
   * Show video without playing
   * @param {string} videoId - Video identifier
   */
  show(videoId) {
    const videoData = this.videos.get(videoId)
    if (videoData) {
      videoData.meshes.forEach(mesh => mesh.visible = true)
    }
  }

  /**
   * Hide video
   * @param {string} videoId - Video identifier
   */
  hide(videoId) {
    const videoData = this.videos.get(videoId)
    if (videoData) {
      videoData.meshes.forEach(mesh => mesh.visible = false)
    }
  }

  /**
   * Fade out video
   * @param {string} videoId - Video identifier
   * @param {number} duration - Fade duration in ms
   * @returns {Promise} Resolves when fade complete
   */
  fadeOut(videoId, duration = 500) {
    return new Promise((resolve) => {
      const videoData = this.videos.get(videoId)
      if (!videoData) {
        resolve()
        return
      }

      const startOpacity = videoData.material.opacity
      const startTime = performance.now()

      const fade = () => {
        const elapsed = performance.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        const newOpacity = startOpacity * (1 - progress)

        videoData.meshes.forEach(mesh => {
          mesh.material.opacity = newOpacity
        })

        if (progress < 1) {
          requestAnimationFrame(fade)
        } else {
          this.stop(videoId)
          resolve()
        }
      }

      requestAnimationFrame(fade)
    })
  }

  /**
   * Fade in video
   * @param {string} videoId - Video identifier
   * @param {number} duration - Fade duration in ms
   * @param {number} targetOpacity - Target opacity
   * @returns {Promise} Resolves when fade complete
   */
  fadeIn(videoId, duration = 500, targetOpacity = 0.9) {
    return new Promise((resolve) => {
      const videoData = this.videos.get(videoId)
      if (!videoData) {
        resolve()
        return
      }

      // Start from 0
      videoData.meshes.forEach(mesh => {
        mesh.material.opacity = 0
        mesh.visible = true
      })

      const startTime = performance.now()

      const fade = () => {
        const elapsed = performance.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        const newOpacity = targetOpacity * progress

        videoData.meshes.forEach(mesh => {
          mesh.material.opacity = newOpacity
        })

        if (progress < 1) {
          requestAnimationFrame(fade)
        } else {
          resolve()
        }
      }

      requestAnimationFrame(fade)
    })
  }

  /**
   * Check if video has ended
   * @param {string} videoId - Video identifier
   * @returns {boolean} True if ended
   */
  hasEnded(videoId) {
    const videoData = this.videos.get(videoId)
    return videoData ? videoData.element.ended : true
  }

  /**
   * Get video duration
   * @param {string} videoId - Video identifier
   * @returns {number} Duration in seconds
   */
  getDuration(videoId) {
    const videoData = this.videos.get(videoId)
    return videoData ? videoData.element.duration : 0
  }

  /**
   * Get current time
   * @param {string} videoId - Video identifier
   * @returns {number} Current time in seconds
   */
  getCurrentTime(videoId) {
    const videoData = this.videos.get(videoId)
    return videoData ? videoData.element.currentTime : 0
  }

  /**
   * Remove video
   * @param {string} videoId - Video identifier
   */
  removeVideo(videoId) {
    const videoData = this.videos.get(videoId)
    if (videoData) {
      videoData.element.pause()
      
      // Clean up meshes
      videoData.meshes.forEach(mesh => {
        this.scene.remove(mesh)
        mesh.geometry.dispose()
        mesh.material.dispose()
      })

      // Clean up texture
      if (videoData.texture) {
        videoData.texture.dispose()
      }

      // Remove video element from DOM if iOS
      if (this.isIOS && videoData.element.parentNode) {
        videoData.element.parentNode.removeChild(videoData.element)
      }

      this.videos.delete(videoId)
    }
  }

  /**
   * Clean up all videos
   */
  dispose() {
    this.videos.forEach((_, id) => {
      this.removeVideo(id)
    })
    this.videos.clear()
  }
}

export default VideoManager
