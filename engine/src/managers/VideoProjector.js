/**
 * VideoProjector - Advanced video projection with shader effects
 * Ported from Shadows of the Stabilisation Point
 * Features: vignette effect, color tinting, fade animations
 */

export class VideoProjector {
  constructor(scene) {
    this.scene = scene
    this.videos = new Map()
    this.isIOS = /iPad|iPhone|iPod/.test(navigator.platform) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  }

  /**
   * Create video element
   */
  _createVideoElement(url, loop, muted = true) {
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
   * Create video texture
   */
  static _createVideoTexture(videoElement) {
    const texture = new THREE.VideoTexture(videoElement)
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.format = THREE.RGBAFormat
    return texture
  }

  /**
   * Create shader material with vignette and tint effects
   */
  static _createVideoShaderMaterial(videoTexture) {
    try {
      return new THREE.ShaderMaterial({
        uniforms: {
          videoTexture: { value: videoTexture },
          opacity: { value: 0.0 }
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D videoTexture;
          uniform float opacity;
          varying vec2 vUv;
          void main() {
            vec4 videoColor = texture2D(videoTexture, vUv);
            vec2 center = vec2(0.5, 0.5);
            float dist = distance(vUv, center);
            float vignette = smoothstep(0.8, 0.2, dist);
            vec3 tintColor = vec3(0.9, 0.95, 1.0);
            vec3 finalColor = videoColor.rgb * tintColor;
            gl_FragColor = vec4(finalColor, videoColor.a * opacity * vignette);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending
      })
    } catch (error) {
      console.warn('Shader creation failed, using basic material:', error)
      return new THREE.MeshBasicMaterial({
        map: videoTexture,
        transparent: true,
        opacity: 0
      })
    }
  }

  /**
   * Load videos from scene configuration
   */
  async loadFromConfig(videoConfigs) {
    if (!videoConfigs || !Array.isArray(videoConfigs)) return

    for (const config of videoConfigs) {
      await this.createVideoProjection(config.id, config)
    }
  }

  /**
   * Create video projection
   */
  async createVideoProjection(videoId, options = {}) {
    const {
      url,
      position = { x: 0, y: 0, z: 0 },
      rotation = { x: 0, y: 0, z: 0 },
      size = [64, 40],
      opacity = 0.9,
      loop = false,
      muted = true,
      multiWall = false,
      walls = []
    } = options

    try {
      const videoElement = this._createVideoElement(url, loop, muted)
      videoElement.currentTime = 0
      videoElement.pause()

      const videoTexture = VideoProjector._createVideoTexture(videoElement)
      videoTexture.needsUpdate = true

      if (multiWall && walls.length > 0) {
        return this._createMultiWallProjection(videoId, videoElement, videoTexture, walls, size, opacity)
      } else {
        return this._createSingleProjection(videoId, videoElement, videoTexture, position, rotation, size, opacity)
      }
    } catch (error) {
      console.error(`Error creating video projection ${videoId}:`, error)
      return null
    }
  }

  /**
   * Create single video projection
   */
  _createSingleProjection(videoId, videoElement, videoTexture, position, rotation, size, opacity) {
    const material = VideoProjector._createVideoShaderMaterial(videoTexture)
    const geometry = new THREE.PlaneGeometry(size[0], size[1])
    const mesh = new THREE.Mesh(geometry, material)

    mesh.position.set(position.x, position.y, position.z)
    mesh.rotation.set(rotation.x, rotation.y, rotation.z)
    this.scene.add(mesh)

    // Start invisible
    if (material.uniforms?.opacity) {
      material.uniforms.opacity.value = 0
    } else {
      material.opacity = 0
    }

    const videoData = {
      id: videoId,
      element: videoElement,
      texture: videoTexture,
      mesh,
      meshes: [mesh],
      material,
      targetOpacity: opacity,
      playing: false,
      isShaderMaterial: material instanceof THREE.ShaderMaterial
    }

    this.videos.set(videoId, videoData)
    return mesh
  }

  /**
   * Create multi-wall video projection
   */
  _createMultiWallProjection(videoId, videoElement, videoTexture, walls, size, opacity) {
    const meshes = walls.map((wall, index) => {
      const material = VideoProjector._createVideoShaderMaterial(videoTexture)
      const geometry = new THREE.PlaneGeometry(size[0], size[1])
      const mesh = new THREE.Mesh(geometry, material)

      mesh.position.set(wall.position.x, wall.position.y, wall.position.z)
      mesh.rotation.set(wall.rotation.x, wall.rotation.y, wall.rotation.z)
      
      if (material.uniforms?.opacity) {
        material.uniforms.opacity.value = 0
      } else {
        material.opacity = 0
      }

      this.scene.add(mesh)
      return mesh
    })

    const videoData = {
      id: videoId,
      element: videoElement,
      texture: videoTexture,
      meshes,
      material: meshes[0]?.material,
      targetOpacity: opacity,
      playing: false,
      isShaderMaterial: meshes[0]?.material instanceof THREE.ShaderMaterial
    }

    this.videos.set(videoId, videoData)
    return meshes
  }

  /**
   * Play video with fade in
   */
  async playVideo(videoId, fadeInDuration = 2000) {
    const videoData = this.videos.get(videoId)
    if (!videoData) return false

    try {
      videoData.element.currentTime = 0
      await videoData.element.play()
      videoData.playing = true
      this.fadeInVideo(videoId, fadeInDuration)
      return true
    } catch (error) {
      console.error(`Error playing video ${videoId}:`, error)
      return false
    }
  }

  /**
   * Fade in video
   */
  fadeInVideo(videoId, duration = 2000) {
    const videoData = this.videos.get(videoId)
    if (!videoData) return

    const startTime = performance.now()
    const targetOpacity = videoData.targetOpacity

    const animate = () => {
      const elapsed = performance.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Ease in-out
      const easeProgress = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2

      const currentOpacity = easeProgress * targetOpacity

      videoData.meshes.forEach(mesh => {
        if (mesh.material.uniforms?.opacity) {
          mesh.material.uniforms.opacity.value = currentOpacity
        } else {
          mesh.material.opacity = currentOpacity
        }
      })

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    animate()
  }

  /**
   * Fade out video
   */
  fadeOutVideo(videoId, duration = 500) {
    return new Promise((resolve) => {
      const videoData = this.videos.get(videoId)
      if (!videoData) {
        resolve()
        return
      }

      const material = videoData.material
      let startOpacity
      
      if (material.uniforms?.opacity) {
        startOpacity = material.uniforms.opacity.value
      } else {
        startOpacity = material.opacity
      }

      const startTime = performance.now()

      const animate = () => {
        const elapsed = performance.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        const currentOpacity = startOpacity * (1 - progress)

        videoData.meshes.forEach(mesh => {
          if (mesh.material.uniforms?.opacity) {
            mesh.material.uniforms.opacity.value = currentOpacity
          } else {
            mesh.material.opacity = currentOpacity
          }
        })

        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          resolve()
        }
      }

      animate()
    })
  }

  /**
   * Stop video
   */
  stopVideo(videoId) {
    const videoData = this.videos.get(videoId)
    if (videoData) {
      videoData.element.pause()
      videoData.element.currentTime = 0
      videoData.playing = false

      videoData.meshes.forEach(mesh => {
        if (mesh.material.uniforms?.opacity) {
          mesh.material.uniforms.opacity.value = 0
        } else {
          mesh.material.opacity = 0
        }
      })
    }
  }

  /**
   * Pause video
   */
  pause(videoId) {
    const videoData = this.videos.get(videoId)
    if (videoData) {
      videoData.element.pause()
    }
  }

  /**
   * Resume video
   */
  play(videoId) {
    const videoData = this.videos.get(videoId)
    if (videoData) {
      videoData.element.play()
    }
  }

  /**
   * Check if video has ended
   */
  hasEnded(videoId) {
    const videoData = this.videos.get(videoId)
    return videoData ? videoData.element.ended : true
  }

  /**
   * Get video current time
   */
  getCurrentTime(videoId) {
    const videoData = this.videos.get(videoId)
    return videoData ? videoData.element.currentTime : 0
  }

  /**
   * Remove video
   */
  removeVideo(videoId) {
    const videoData = this.videos.get(videoId)
    if (videoData) {
      videoData.element.pause()
      if (Number.isFinite(videoData.element.duration)) {
        videoData.element.currentTime = 0
      }

      // Remove meshes
      videoData.meshes.forEach(mesh => {
        this.scene.remove(mesh)
        mesh.geometry.dispose()
        mesh.material.dispose()
      })

      // Remove texture
      if (videoData.texture) {
        videoData.texture.dispose()
      }

      // Remove from DOM if iOS
      if (this.isIOS && videoData.element.parentNode) {
        videoData.element.parentNode.removeChild(videoData.element)
      }

      this.videos.delete(videoId)
    }
  }

  /**
   * Update textures (call in render loop)
   */
  update() {
    this.videos.forEach((videoData) => {
      if (videoData.texture && videoData.playing) {
        videoData.texture.needsUpdate = true
      }
    })
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

export default VideoProjector
