/**
 * AssetLoader - Manages loading and caching of 3D models, audio, video, and images
 */

export class AssetLoader {
  constructor() {
    this.cache = new Map()
    this.loadingPromises = new Map()
    this.gltfLoader = null
    this.audioLoader = null
    this.textureLoader = null

    this.onProgress = null
    this.totalAssets = 0
    this.loadedAssets = 0
  }

  /**
   * Initialize Three.js loaders
   */
  init() {
    if (typeof THREE !== 'undefined') {
      // GLTFLoader from three/examples
      if (THREE.GLTFLoader) {
        this.gltfLoader = new THREE.GLTFLoader()
      }
      this.audioLoader = new THREE.AudioLoader()
      this.textureLoader = new THREE.TextureLoader()
    }
  }

  /**
   * Set the GLTFLoader instance (for custom loader configuration)
   * @param {THREE.GLTFLoader} loader - GLTFLoader instance
   */
  setGLTFLoader(loader) {
    this.gltfLoader = loader
  }

  /**
   * Preload a list of assets
   * @param {array} assets - Array of asset URLs to preload
   * @param {function} onProgress - Progress callback (0-1)
   * @returns {Promise} Resolves when all assets are loaded
   */
  async preload(assets, onProgress) {
    this.onProgress = onProgress
    this.totalAssets = assets.length
    this.loadedAssets = 0

    const promises = assets.map(async (url) => {
      await this.load(url)
      this.loadedAssets++
      if (this.onProgress) {
        this.onProgress(this.loadedAssets / this.totalAssets)
      }
    })

    await Promise.all(promises)
  }

  /**
   * Load a single asset based on file extension
   * @param {string} url - Asset URL
   * @returns {Promise} Loaded asset
   */
  async load(url) {
    // Check cache first
    if (this.cache.has(url)) {
      return this.cache.get(url)
    }

    // Check if already loading
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)
    }

    const extension = this.getExtension(url)
    let loadPromise

    switch (extension) {
      case 'glb':
      case 'gltf':
        loadPromise = this.loadModel(url)
        break
      case 'mp3':
      case 'wav':
      case 'ogg':
        loadPromise = this.loadAudio(url)
        break
      case 'mp4':
      case 'webm':
        loadPromise = this.loadVideo(url)
        break
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'webp':
        loadPromise = this.loadTexture(url)
        break
      default:
        loadPromise = this.loadGeneric(url)
    }

    this.loadingPromises.set(url, loadPromise)

    try {
      const asset = await loadPromise
      this.cache.set(url, asset)
      this.loadingPromises.delete(url)
      return asset
    } catch (error) {
      this.loadingPromises.delete(url)
      throw error
    }
  }

  /**
   * Load a 3D model (GLB/GLTF)
   * @param {string} url - Model URL
   * @returns {Promise<object>} GLTF object with scene, animations, etc.
   */
  loadModel(url) {
    return new Promise((resolve, reject) => {
      if (!this.gltfLoader) {
        reject(new Error('GLTFLoader not available'))
        return
      }

      this.gltfLoader.load(
        url,
        (gltf) => {
          resolve(gltf)
        },
        undefined,
        (error) => {
          reject(new Error(`Failed to load model ${url}: ${error.message}`))
        }
      )
    })
  }

  /**
   * Load an audio buffer
   * @param {string} url - Audio URL
   * @returns {Promise<AudioBuffer>} Audio buffer
   */
  loadAudio(url) {
    return new Promise((resolve, reject) => {
      if (!this.audioLoader) {
        // Fallback: return URL for HTML5 audio
        resolve({ url, type: 'url' })
        return
      }

      this.audioLoader.load(
        url,
        (buffer) => {
          resolve(buffer)
        },
        undefined,
        (error) => {
          reject(new Error(`Failed to load audio ${url}: ${error.message}`))
        }
      )
    })
  }

  /**
   * Load a video element
   * @param {string} url - Video URL
   * @returns {Promise<HTMLVideoElement>} Video element
   */
  loadVideo(url) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.crossOrigin = 'anonymous'
      video.playsInline = true
      video.muted = true
      video.preload = 'auto'

      video.onloadeddata = () => {
        resolve(video)
      }

      video.onerror = () => {
        reject(new Error(`Failed to load video ${url}`))
      }

      video.src = url
      video.load()
    })
  }

  /**
   * Load a texture
   * @param {string} url - Texture URL
   * @returns {Promise<THREE.Texture>} Three.js texture
   */
  loadTexture(url) {
    return new Promise((resolve, reject) => {
      if (!this.textureLoader) {
        // Fallback: return URL
        resolve({ url, type: 'url' })
        return
      }

      this.textureLoader.load(
        url,
        (texture) => {
          resolve(texture)
        },
        undefined,
        (error) => {
          reject(new Error(`Failed to load texture ${url}: ${error.message}`))
        }
      )
    })
  }

  /**
   * Load generic asset via fetch
   * @param {string} url - Asset URL
   * @returns {Promise<Response>} Fetch response
   */
  async loadGeneric(url) {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to load ${url}: ${response.statusText}`)
    }
    return response
  }

  /**
   * Get file extension from URL
   * @param {string} url - URL string
   * @returns {string} Lowercase extension
   */
  getExtension(url) {
    if (url.startsWith('data:')) {
      const mime = url.slice(5, url.indexOf(';'))
      return (
        {
          'model/gltf-binary': 'glb',
          'model/gltf+json': 'gltf',
          'audio/mpeg': 'mp3',
          'audio/wav': 'wav',
          'video/mp4': 'mp4',
          'video/webm': 'webm',
          'image/png': 'png',
          'image/jpeg': 'jpg'
        }[mime] || ''
      )
    }
    const path = url.split('?')[0]
    const parts = path.split('.')
    return parts[parts.length - 1].toLowerCase()
  }

  /**
   * Get cached asset
   * @param {string} url - Asset URL
   * @returns {any} Cached asset or undefined
   */
  get(url) {
    return this.cache.get(url)
  }

  /**
   * Check if asset is cached
   * @param {string} url - Asset URL
   * @returns {boolean} True if cached
   */
  has(url) {
    return this.cache.has(url)
  }

  /**
   * Clear a specific asset from cache
   * @param {string} url - Asset URL
   */
  clear(url) {
    const asset = this.cache.get(url)
    if (asset) {
      this.disposeAsset(asset)
      this.cache.delete(url)
    }
  }

  /**
   * Clear all cached assets
   */
  clearAll() {
    this.cache.forEach((asset) => {
      this.disposeAsset(asset)
    })
    this.cache.clear()
  }

  /**
   * Dispose of an asset to free memory
   * @param {any} asset - Asset to dispose
   */
  disposeAsset(asset) {
    if (!asset) return

    // Dispose Three.js objects
    if (asset.scene) {
      asset.scene.traverse((child) => {
        if (child.geometry) child.geometry.dispose()
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose())
          } else {
            child.material.dispose()
          }
        }
      })
    }

    // Dispose textures
    if (asset.isTexture) {
      asset.dispose()
    }

    // Dispose video elements
    if (asset instanceof HTMLVideoElement) {
      asset.pause()
      asset.src = ''
      asset.load()
    }
  }
}

export default AssetLoader
