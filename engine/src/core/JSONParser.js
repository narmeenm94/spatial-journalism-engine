/**
 * JSONParser - Validates and parses story JSON configuration
 * Uses Ajv for JSON Schema validation
 */

import Ajv from 'ajv'

export class JSONParser {
  constructor() {
    this.ajv = new Ajv({ allErrors: true, verbose: true })
    this.schema = null
    this.validator = null
    this.storyBaseUrl = '' // Base URL for resolving relative asset paths
  }

  /**
   * Load the JSON schema for validation
   * @param {string|object} schema - Schema URL or object
   */
  async loadSchema(schema) {
    if (typeof schema === 'string') {
      const response = await fetch(schema)
      this.schema = await response.json()
    } else {
      this.schema = schema
    }
    this.validator = this.ajv.compile(this.schema)
  }

  /**
   * Validate story JSON against schema
   * @param {object} story - Story configuration object
   * @returns {object} Validation result with isValid and errors
   */
  validate(story) {
    if (!this.validator) {
      console.warn('Schema not loaded, skipping validation')
      return { isValid: true, errors: [] }
    }

    const isValid = this.validator(story)
    
    return {
      isValid,
      errors: isValid ? [] : this.formatErrors(this.validator.errors)
    }
  }

  /**
   * Format validation errors for better readability
   * @param {array} errors - Ajv error array
   * @returns {array} Formatted error messages
   */
  formatErrors(errors) {
    return errors.map(error => ({
      path: error.instancePath || '/',
      message: error.message,
      params: error.params,
      keyword: error.keyword
    }))
  }

  /**
   * Parse and validate story JSON from URL or object
   * @param {string|object} source - Story JSON URL or object
   * @param {object} [options] - Parse options
   * @param {boolean} [options.skipValidation] - Skip schema validation (e.g. for Creator preview)
   * @returns {object} Parsed and validated story configuration
   */
  async parse(source, options = {}) {
    let story

    if (typeof source === 'string') {
      // Store the base URL from the story location for resolving relative paths
      const url = new URL(source, window.location.href)
      this.storyBaseUrl = url.href.substring(0, url.href.lastIndexOf('/') + 1)
      
      const response = await fetch(source)
      if (!response.ok) {
        throw new Error(`Failed to load story: ${response.statusText}`)
      }
      story = await response.json()
    } else {
      story = source
      // For object sources, use current page location (unless storyBaseUrl was set externally)
      if (!this.storyBaseUrl) {
        this.storyBaseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1)
      }
    }

    // Skip validation when story comes from the Creator (different internal format)
    // or when explicitly requested. The normalize step handles both formats.
    if (!options.skipValidation && typeof source === 'string') {
      const validation = this.validate(story)
      if (!validation.isValid) {
        console.error('Story validation failed:', validation.errors)
        throw new Error(`Invalid story configuration: ${validation.errors.map(e => e.message).join(', ')}`)
      }
    }

    // Apply defaults and normalize the story
    return this.normalize(story)
  }

  /**
   * Normalize story configuration with defaults
   * @param {object} story - Raw story configuration
   * @returns {object} Normalized story
   */
  normalize(story) {
    const normalized = { ...story }

    // Project defaults
    normalized.project = {
      version: '1.0',
      languages: ['en'],
      defaultLanguage: 'en',
      modes: ['ar', '3d'],
      ...story.project,
      assets: {
        basePath: './assets/',
        preload: [],
        ...story.project.assets
      }
    }

    // Normalize scenes
    normalized.scenes = story.scenes.map((scene, index) => 
      this.normalizeScene(scene, index, normalized.project)
    )

    // UI defaults
    normalized.ui = {
      homeScreen: {},
      branding: {},
      controls: {
        showRecenter: true,
        showSkip: true,
        showSettings: true
      },
      ...story.ui
    }

    return normalized
  }

  /**
   * Normalize individual scene configuration
   * @param {object} scene - Scene configuration
   * @param {number} index - Scene index
   * @param {object} project - Project configuration
   * @returns {object} Normalized scene
   */
  normalizeScene(scene, index, project) {
    const basePath = project.assets.basePath

    // Accept both engine format (name) and creator format (title)
    const sceneName = scene.name || scene.title || `Scene ${index + 1}`

    // Audio: accept single object or array of audio configs
    const rawAudioArr = scene.audio
      ? (Array.isArray(scene.audio) ? scene.audio : [scene.audio])
      : []

    // Subtitles: accept both per-language object and array-of-objects format
    let subtitles = scene.subtitles
    if (subtitles && !Array.isArray(subtitles) && typeof subtitles === 'object') {
      // Already per-language object format — pass through (SceneManager handles it)
    } else if (Array.isArray(subtitles) && subtitles.length > 0 && typeof subtitles[0].text === 'object') {
      // Creator format: [{id, start, end, text: {en: "...", fi: "..."}}]
      // Convert to engine's per-language format: {en: [{start, end, text}], fi: [...]}
      const langs = project.languages || ['en']
      const converted = {}
      langs.forEach(lang => {
        converted[lang] = subtitles
          .filter(s => s.text && s.text[lang])
          .map(s => ({ start: s.start, end: s.end, text: s.text[lang] }))
      })
      subtitles = converted
    }

    return {
      id: scene.id || `scene${index + 1}`,
      name: sceneName,
      isActive: false,
      ...scene,
      name: sceneName,
      subtitles,
      
      // Normalize audio (always an array)
      audio: rawAudioArr.map((a, ai) => {
        const url = a.url || a.file || ''
        return {
          id: a.id || `audio_${scene.id}_${ai}`,
          volume: 0.5,
          loop: false,
          autoplay: true,
          delay: 0,
          positional: false,
          refDistance: 15,
          maxDistance: 50,
          ...a,
          url: this.resolvePath(url, basePath)
        }
      }),

      // Normalize characters
      characters: (scene.characters || []).map((char, i) => ({
        id: char.id || `char_${scene.id}_${i}`,
        delay: 0,
        opacity: 0.7,
        ...char,
        model: this.resolvePath(char.model, basePath),
        position: this.normalizeVector3(char.position),
        rotation: this.normalizeRotation(char.rotation),
        scale: this.normalizeScale(char.scale)
      })),

      // Normalize objects
      objects: (scene.objects || []).map((obj, i) => ({
        id: obj.id || `obj_${scene.id}_${i}`,
        ...obj,
        model: this.resolvePath(obj.model, basePath),
        position: this.normalizeVector3(obj.position),
        rotation: this.normalizeRotation(obj.rotation),
        scale: this.normalizeScale(obj.scale)
      })),

      // Normalize videos — accept both triggerAt (engine) and triggerTime (creator)
      videos: (scene.videos || []).map((video, i) => ({
        opacity: 0.9,
        loop: false,
        muted: true,
        ...video,
        id: video.id || `video_${scene.id}_${i}`,
        url: this.resolvePath(video.url, basePath),
        triggerAt: video.triggerAt ?? video.triggerTime ?? 0,
        position: this.normalizeVector3(video.position),
        rotation: this.normalizeRotation(video.rotation),
        size: video.size || [64, 40]
      })),

      // Normalize lighting — map creator's spotlights[] to engine format
      lighting: this.normalizeLighting(scene.lighting)
    }
  }

  /**
   * Resolve asset path relative to base path and story location
   * @param {string} path - Asset path
   * @param {string} basePath - Base path from story config
   * @returns {string} Resolved absolute path
   */
  resolvePath(path, basePath) {
    if (!path) return path
    // Don't modify absolute URLs or data/blob URLs
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:') || path.startsWith('data:')) {
      return path
    }

    // Check for a local asset blob URL (set by the Creator preview via postMessage).
    // Keys in localAssetBlobUrls match the config path, e.g. "models/file.glb"
    if (this.localAssetBlobUrls) {
      if (this.localAssetBlobUrls[path]) {
        return this.localAssetBlobUrls[path]
      }
      // Also try with basePath stripped (e.g. "assets/models/file.glb" → "models/file.glb")
      const combined = `${basePath || ''}${path}`
      if (this.localAssetBlobUrls[combined]) {
        return this.localAssetBlobUrls[combined]
      }
    }

    // For absolute paths starting with /, return as-is
    if (path.startsWith('/')) {
      return path
    }
    // Combine basePath with path
    const combinedPath = `${basePath}${path}`
    // Resolve against story base URL to get absolute path
    try {
      const resolved = new URL(combinedPath, this.storyBaseUrl)
      return resolved.pathname
    } catch (e) {
      // Fallback to combined path if URL resolution fails
      return combinedPath
    }
  }

  /**
   * Normalize array to THREE.Vector3 format
   * @param {array|object} vec - Vector as array or object
   * @returns {object} Vector3-compatible object
   */
  /**
   * Normalize scene lighting configuration.
   * Maps creator format (spotlights array) to engine format and preserves
   * engine-native fields (modifiers, spotlight, effects, etc.)
   */
  normalizeLighting(lighting) {
    if (!lighting) return null

    const result = { ...lighting }

    // The creator stores scene point/spot lights as `spotlights: SpotlightConfig[]`.
    // The engine's SceneManager already understands `spotlight` (singular) for
    // volumetric lighting, but not additional dynamic lights.
    // We keep both: `spotlight` for the first volumetric-capable light,
    // and `dynamicLights` for all spotlights that should appear as real Three.js lights.
    if (lighting.spotlights && Array.isArray(lighting.spotlights) && lighting.spotlights.length > 0) {
      // If engine-format `spotlight` is not already set, derive it from the first creator spotlight
      if (!result.spotlight) {
        const first = lighting.spotlights[0]
        result.spotlight = {
          position: Array.isArray(first.position)
            ? first.position
            : [first.position?.x || 0, first.position?.y || 0, first.position?.z || 0],
          color: first.color || '#ffffff',
          intensity: first.intensity ?? 1,
          volumetric: first.volumetric ?? false,
          volumetricOffset: first.volumetricOffset || 13.5
        }
      }

      // Store the full array so the engine can create real Three.js lights
      result.dynamicLights = lighting.spotlights.map(s => ({
        id: s.id || 'spot',
        type: s.type || 'point', // 'point' | 'spot' | 'directional'
        position: Array.isArray(s.position) ? s.position : [s.position?.x || 0, s.position?.y || 0, s.position?.z || 0],
        target: s.target ? (Array.isArray(s.target) ? s.target : [s.target.x || 0, s.target.y || 0, s.target.z || 0]) : null,
        color: s.color || '#ffffff',
        intensity: s.intensity ?? 1,
        angle: s.angle ?? 0.6,
        penumbra: s.penumbra ?? 0.5,
        distance: s.distance ?? 30,
        decay: s.decay ?? 2,
        castShadow: s.castShadow ?? false
      }))
    }

    return result
  }

  normalizeVector3(vec) {
    if (!vec) return { x: 0, y: 0, z: 0 }
    if (Array.isArray(vec)) {
      return { x: vec[0] || 0, y: vec[1] || 0, z: vec[2] || 0 }
    }
    return vec
  }

  /**
   * Normalize rotation (values already in radians)
   * @param {array|object} rot - Rotation in radians
   * @returns {object} Rotation object {x, y, z}
   */
  normalizeRotation(rot) {
    if (!rot) return { x: 0, y: 0, z: 0 }
    if (Array.isArray(rot)) {
      return { x: rot[0] || 0, y: rot[1] || 0, z: rot[2] || 0 }
    }
    return { x: rot.x || 0, y: rot.y || 0, z: rot.z || 0 }
  }

  /**
   * Normalize scale to Vector3 format
   * @param {number|array|object} scale - Scale value
   * @returns {object} Vector3-compatible scale
   */
  normalizeScale(scale) {
    if (!scale) return { x: 1, y: 1, z: 1 }
    if (typeof scale === 'number') {
      return { x: scale, y: scale, z: scale }
    }
    if (Array.isArray(scale)) {
      return { x: scale[0] || 1, y: scale[1] || 1, z: scale[2] || 1 }
    }
    return scale
  }

  /**
   * Get localized string value
   * @param {string|object} value - Localized string
   * @param {string} language - Target language code
   * @param {string} fallback - Fallback language code
   * @returns {string} Resolved string
   */
  getLocalizedString(value, language, fallback = 'en') {
    if (typeof value === 'string') return value
    if (typeof value === 'object') {
      return value[language] || value[fallback] || Object.values(value)[0] || ''
    }
    return ''
  }
}

export default JSONParser
