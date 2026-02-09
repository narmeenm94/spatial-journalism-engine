/**
 * CharacterManager - Handles loading and management of 3D characters and objects
 * Extracted and refactored from Shadows of the Stabilisation Point
 */

export class CharacterManager {
  /**
   * Create CharacterManager
   * @param {THREE.Scene} scene - Three.js scene
   * @param {AssetLoader} assetLoader - Asset loader instance
   */
  constructor(scene, assetLoader) {
    this.scene = scene
    this.assetLoader = assetLoader
    this.characters = new Map()
    this.objects = new Map()
    this.mixers = new Map()
  }

  /**
   * Load characters from scene configuration
   * @param {array} characterConfigs - Array of character configurations from JSON
   */
  async loadCharactersFromConfig(characterConfigs) {
    if (!characterConfigs || !Array.isArray(characterConfigs)) return

    for (const config of characterConfigs) {
      await this.loadCharacter(config.id, config)
    }
  }

  /**
   * Load objects from scene configuration
   * @param {array} objectConfigs - Array of object configurations from JSON
   */
  async loadObjectsFromConfig(objectConfigs) {
    if (!objectConfigs || !Array.isArray(objectConfigs)) return

    for (const config of objectConfigs) {
      await this.loadObject(config.id, config)
    }
  }

  /**
   * Load a character model
   * @param {string} charId - Character identifier
   * @param {object} options - Character options
   * @returns {Promise<THREE.Object3D>} Character model
   */
  async loadCharacter(charId, options = {}) {
    if (this.characters.has(charId)) {
      return this.characters.get(charId)
    }

    const { model, position, scale, rotation, animation, delay = 0, opacity = 0.7 } = options

    // Handle delay
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }

    try {
      const gltf = await this.assetLoader.load(model)
      const characterModel = gltf.scene.clone()

      // Apply transforms
      if (position) {
        characterModel.position.set(position.x, position.y, position.z)
      }
      if (rotation) {
        characterModel.rotation.set(rotation.x, rotation.y, rotation.z)
      }
      if (scale) {
        const s = typeof scale === 'number' ? scale : scale.x
        characterModel.scale.set(s, s, s)
      }

      // Set up materials
      characterModel.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.transparent = true
          child.material.opacity = opacity
          child.material.depthWrite = false
        }
      })

      // Set up animations
      if (gltf.animations && gltf.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(characterModel)
        this.mixers.set(charId, mixer)

        if (animation) {
          const clip = THREE.AnimationClip.findByName(gltf.animations, animation)
          if (clip) {
            const action = mixer.clipAction(clip)
            action.play()
          }
        }
      }

      this.scene.add(characterModel)
      this.characters.set(charId, { model: characterModel, gltf, options })
      
      return characterModel
    } catch (error) {
      console.error(`Failed to load character ${charId}:`, error)
      throw error
    }
  }

  /**
   * Load a static object
   * @param {string} objectId - Object identifier
   * @param {object} options - Object options
   * @returns {Promise<THREE.Object3D>} Object model
   */
  async loadObject(objectId, options = {}) {
    if (this.objects.has(objectId)) {
      return this.objects.get(objectId)
    }

    const { model, position, scale, rotation, animation } = options

    try {
      const gltf = await this.assetLoader.load(model)
      const objectModel = gltf.scene.clone()

      // Apply transforms
      if (position) {
        objectModel.position.set(position.x, position.y, position.z)
      }
      if (rotation) {
        objectModel.rotation.set(rotation.x, rotation.y, rotation.z)
      }
      if (scale) {
        const s = typeof scale === 'number' ? scale : scale.x
        objectModel.scale.set(s, s, s)
      }

      // Set up materials
      objectModel.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.transparent = true
          child.material.opacity = 1.0
          child.material.depthWrite = false
        }
      })

      // Set up animations if any
      if (gltf.animations && gltf.animations.length > 0 && animation) {
        const mixer = new THREE.AnimationMixer(objectModel)
        this.mixers.set(objectId, mixer)
        
        const clip = THREE.AnimationClip.findByName(gltf.animations, animation)
        if (clip) {
          mixer.clipAction(clip).play()
        }
      }

      this.scene.add(objectModel)
      this.objects.set(objectId, { model: objectModel, gltf, options })
      
      return objectModel
    } catch (error) {
      console.error(`Failed to load object ${objectId}:`, error)
      throw error
    }
  }

  /**
   * Update animation mixers
   * @param {number} delta - Time delta in seconds
   */
  update(delta) {
    this.mixers.forEach((mixer) => {
      mixer.update(delta)
    })
  }

  /**
   * Fade in character
   * @param {string} charId - Character identifier
   * @param {number} duration - Fade duration in ms
   * @param {number} targetOpacity - Target opacity
   */
  fadeInCharacter(charId, duration = 1000, targetOpacity = 0.7) {
    const charData = this.characters.get(charId)
    if (!charData) return

    const character = charData.model
    
    // Set initial opacity to 0
    character.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.opacity = 0
      }
    })

    this.animateOpacity(character, 0, targetOpacity, duration)
  }

  /**
   * Fade out character
   * @param {string} charId - Character identifier
   * @param {number} duration - Fade duration in ms
   */
  fadeOutCharacter(charId, duration = 1000) {
    const charData = this.characters.get(charId)
    if (!charData) return

    const character = charData.model
    const startOpacity = charData.options.opacity || 0.7

    this.animateOpacity(character, startOpacity, 0, duration)
  }

  /**
   * Animate opacity of a model
   */
  animateOpacity(model, startOpacity, targetOpacity, duration) {
    const startTime = performance.now()

    const animate = () => {
      const elapsed = performance.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Ease in-out
      const easeProgress = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2
      
      const currentOpacity = startOpacity + (targetOpacity - startOpacity) * easeProgress

      model.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.opacity = currentOpacity
        }
      })

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }

  /**
   * Remove character
   * @param {string} charId - Character identifier
   */
  removeCharacter(charId) {
    const charData = this.characters.get(charId)
    if (charData) {
      this.scene.remove(charData.model)
      this.disposeModel(charData.model)
      this.mixers.delete(charId)
      this.characters.delete(charId)
    }
  }

  /**
   * Remove object
   * @param {string} objectId - Object identifier
   */
  removeObject(objectId) {
    const objData = this.objects.get(objectId)
    if (objData) {
      this.scene.remove(objData.model)
      this.disposeModel(objData.model)
      this.mixers.delete(objectId)
      this.objects.delete(objectId)
    }
  }

  /**
   * Dispose of a model's resources
   */
  disposeModel(model) {
    model.traverse((child) => {
      if (child.isMesh) {
        if (child.geometry) child.geometry.dispose()
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose())
          } else {
            child.material.dispose()
          }
        }
      }
    })
  }

  /**
   * Remove all characters from a scene
   * @param {string} sceneId - Scene identifier prefix
   */
  removeSceneCharacters(sceneId) {
    this.characters.forEach((_, charId) => {
      if (charId.includes(sceneId)) {
        this.removeCharacter(charId)
      }
    })
  }

  /**
   * Remove all objects from a scene
   * @param {string} sceneId - Scene identifier prefix
   */
  removeSceneObjects(sceneId) {
    this.objects.forEach((_, objId) => {
      if (objId.includes(sceneId)) {
        this.removeObject(objId)
      }
    })
  }

  /**
   * Clean up all characters and objects
   */
  dispose() {
    this.characters.forEach((_, charId) => {
      this.removeCharacter(charId)
    })
    this.objects.forEach((_, objId) => {
      this.removeObject(objId)
    })
    this.characters.clear()
    this.objects.clear()
    this.mixers.clear()
  }
}

export default CharacterManager
