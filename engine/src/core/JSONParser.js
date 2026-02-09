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
   * @returns {object} Parsed and validated story configuration
   */
  async parse(source) {
    let story

    if (typeof source === 'string') {
      const response = await fetch(source)
      if (!response.ok) {
        throw new Error(`Failed to load story: ${response.statusText}`)
      }
      story = await response.json()
    } else {
      story = source
    }

    const validation = this.validate(story)
    
    if (!validation.isValid) {
      console.error('Story validation failed:', validation.errors)
      throw new Error(`Invalid story configuration: ${validation.errors.map(e => e.message).join(', ')}`)
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

    return {
      id: scene.id || `scene${index + 1}`,
      name: scene.name || `Scene ${index + 1}`,
      isActive: false,
      ...scene,
      
      // Normalize audio
      audio: scene.audio ? {
        volume: 0.5,
        loop: false,
        autoplay: true,
        delay: 0,
        positional: false,
        refDistance: 15,
        maxDistance: 50,
        ...scene.audio,
        url: this.resolvePath(scene.audio.url, basePath)
      } : null,

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

      // Normalize videos
      videos: (scene.videos || []).map((video, i) => ({
        opacity: 0.9,
        loop: false,
        muted: true,
        ...video,
        id: video.id || `video_${scene.id}_${i}`,
        url: this.resolvePath(video.url, basePath),
        position: this.normalizeVector3(video.position),
        rotation: this.normalizeRotation(video.rotation),
        size: video.size || [64, 40]
      })),

      // Normalize lighting
      lighting: {
        ambient: 1,
        directional: 1,
        hemisphere: 1,
        ...scene.lighting,
        position: scene.lighting?.position ? this.normalizeVector3(scene.lighting.position) : null
      }
    }
  }

  /**
   * Resolve asset path relative to base path
   * @param {string} path - Asset path
   * @param {string} basePath - Base path
   * @returns {string} Resolved path
   */
  resolvePath(path, basePath) {
    if (!path) return path
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/')) {
      return path
    }
    return `${basePath}${path}`
  }

  /**
   * Normalize array to THREE.Vector3 format
   * @param {array|object} vec - Vector as array or object
   * @returns {object} Vector3-compatible object
   */
  normalizeVector3(vec) {
    if (!vec) return { x: 0, y: 0, z: 0 }
    if (Array.isArray(vec)) {
      return { x: vec[0] || 0, y: vec[1] || 0, z: vec[2] || 0 }
    }
    return vec
  }

  /**
   * Normalize rotation from degrees to radians
   * @param {array|object} rot - Rotation in degrees
   * @returns {object} Rotation in radians
   */
  normalizeRotation(rot) {
    if (!rot) return { x: 0, y: 0, z: 0 }
    const toRad = (deg) => (deg * Math.PI) / 180
    if (Array.isArray(rot)) {
      return { x: toRad(rot[0] || 0), y: toRad(rot[1] || 0), z: toRad(rot[2] || 0) }
    }
    return { x: toRad(rot.x || 0), y: toRad(rot.y || 0), z: toRad(rot.z || 0) }
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
