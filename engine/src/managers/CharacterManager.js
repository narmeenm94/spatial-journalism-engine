/**
 * CharacterManager - Handles loading and management of 3D characters and objects
 * Extracted and refactored from Shadows of the Stabilisation Point
 * 
 * IMPORTANT: Character models with animations (skinned meshes) must be loaded
 * fresh each time via GLTFLoader. Cloning gltf.scene doesn't properly handle
 * bone references in skinned meshes, making characters invisible.
 */

export class CharacterManager {
  /**
   * Create CharacterManager
   * @param {THREE.Object3D} parentObject - Parent object to add characters to (room model)
   * @param {AssetLoader} assetLoader - Asset loader instance (used for static objects only)
   */
  constructor(parentObject, assetLoader) {
    this.parentObject = parentObject
    this.assetLoader = assetLoader
    this.characters = new Map()
    this.objects = new Map()
    this.mixers = new Map()
    // Track which characters/objects belong to which scene
    this.sceneCharacterMap = new Map() // sceneId -> Set of charIds
    this.sceneObjectMap = new Map() // sceneId -> Set of objIds
    this.currentSceneId = null
    
    // Create a dedicated GLTFLoader for fresh character loads
    if (typeof THREE !== 'undefined' && THREE.GLTFLoader) {
      this.gltfLoader = new THREE.GLTFLoader()
    }
  }

  /**
   * Set current scene ID for tracking
   * @param {string} sceneId - Scene identifier
   */
  setCurrentScene(sceneId) {
    this.currentSceneId = sceneId
    if (!this.sceneCharacterMap.has(sceneId)) {
      this.sceneCharacterMap.set(sceneId, new Set())
    }
    if (!this.sceneObjectMap.has(sceneId)) {
      this.sceneObjectMap.set(sceneId, new Set())
    }
  }

  /**
   * Load a GLTF model fresh (no caching) - required for animated skinned meshes
   * This matches the original project's behavior where each character is loaded
   * via a fresh GLTFLoader.load() call.
   * @param {string} url - Model URL
   * @returns {Promise<object>} GLTF result
   */
  loadModelFresh(url) {
    return new Promise((resolve, reject) => {
      if (!this.gltfLoader) {
        reject(new Error('GLTFLoader not available'))
        return
      }
      this.gltfLoader.load(
        url,
        (gltf) => resolve(gltf),
        undefined,
        (error) => reject(new Error(`Failed to load model ${url}: ${error?.message || error}`))
      )
    })
  }

  /**
   * Load a character model
   * @param {string} charId - Character identifier
   * @param {object} options - Character options
   * @returns {Promise<THREE.Object3D>} Character model
   */
  async loadCharacter(charId, options = {}) {
    if (this.characters.has(charId)) {
      console.log(`Character ${charId} already loaded, returning existing`)
      return this.characters.get(charId).model
    }

    const { model, position, scale, rotation, animation, delay = 0, opacity = 0.7 } = options

    try {
      console.log(`  CharacterManager: Loading character ${charId} from ${model}`)
      
      // Load model FRESH each time - critical for animated skinned meshes
      // Do NOT use assetLoader cache - cloning gltf.scene breaks bone references
      const gltf = await this.loadModelFresh(model)
      
      if (!gltf || !gltf.scene) {
        console.error(`  CharacterManager: No scene in loaded GLTF for ${charId}`)
        return null
      }

      // Use the scene directly (not cloned) since we loaded fresh
      const characterModel = gltf.scene

      // Apply transforms
      if (position) {
        characterModel.position.set(
          position.x || 0, 
          position.y || 0, 
          position.z || 0
        )
      }
      if (rotation) {
        characterModel.rotation.set(
          rotation.x || 0, 
          rotation.y || 0, 
          rotation.z || 0
        )
      }
      if (scale) {
        if (typeof scale === 'number') {
          characterModel.scale.set(scale, scale, scale)
        } else {
          characterModel.scale.set(scale.x || 1, scale.y || 1, scale.z || 1)
        }
      }

      console.log(`  Position: (${characterModel.position.x}, ${characterModel.position.y}, ${characterModel.position.z})`)
      console.log(`  Scale: (${characterModel.scale.x}, ${characterModel.scale.y}, ${characterModel.scale.z})`)
      console.log(`  Rotation: (${characterModel.rotation.x}, ${characterModel.rotation.y}, ${characterModel.rotation.z})`)

      // Set up materials - make transparent/ghostly
      // Start at opacity 0 for fade-in effect (SceneManager calls fadeInCharacter after loading)
      characterModel.traverse((child) => {
        if (child.isMesh && child.material) {
          // Clone material to avoid affecting shared instances
          child.material = child.material.clone()
          child.material.transparent = true
          child.material.opacity = 0  // Start invisible - SceneManager will fade in
          child.material.depthWrite = false
        }
      })

      // Set up animations
      // IMPORTANT: Only play animation if explicitly requested in config.
      // If no animation property is specified, keep the model in its default pose.
      // This matches the original behavior where scene3's Olena has no animation.
      if (gltf.animations && gltf.animations.length > 0 && animation) {
        const mixer = new THREE.AnimationMixer(characterModel)
        this.mixers.set(charId, mixer)

        // Try to find the specific animation by name
        const clip = gltf.animations.find(anim => anim.name === animation)
        if (clip) {
          const action = mixer.clipAction(clip)
          action.setLoop(THREE.LoopRepeat, Infinity)
          action.play()
          console.log(`  Playing animation: ${animation}`)
        } else {
          // If named animation not found, play first animation as fallback
          console.warn(`  Animation "${animation}" not found, available: ${gltf.animations.map(a => a.name).join(', ')}`)
          if (gltf.animations.length > 0) {
            const defaultAction = mixer.clipAction(gltf.animations[0])
            defaultAction.setLoop(THREE.LoopRepeat, Infinity)
            defaultAction.play()
            console.log(`  Playing fallback animation: ${gltf.animations[0].name}`)
          }
        }
      } else if (gltf.animations && gltf.animations.length > 0 && !animation) {
        console.log(`  No animation specified for ${charId}, keeping default pose (available: ${gltf.animations.map(a => a.name).join(', ')})`)
      }

      // Add to parent object (room model) - matches original behavior
      this.parentObject.add(characterModel)
      this.characters.set(charId, { model: characterModel, gltf, options })
      
      // Track scene membership
      if (this.currentSceneId) {
        const sceneChars = this.sceneCharacterMap.get(this.currentSceneId) || new Set()
        sceneChars.add(charId)
        this.sceneCharacterMap.set(this.currentSceneId, sceneChars)
      }
      
      // Log world position for debugging
      const worldPos = new THREE.Vector3()
      characterModel.getWorldPosition(worldPos)
      console.log(`  Character ${charId} added. World position: (${worldPos.x.toFixed(2)}, ${worldPos.y.toFixed(2)}, ${worldPos.z.toFixed(2)})`)
      
      return characterModel
    } catch (error) {
      console.error(`Failed to load character ${charId}:`, error)
      return null // Don't throw - continue loading other characters
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
      return this.objects.get(objectId).model
    }

    const { model, position, scale, rotation, animation } = options

    try {
      // Static objects can use cached loading (no skinned mesh issues)
      const gltf = await this.assetLoader.load(model)
      const objectModel = gltf.scene.clone()

      // Apply transforms
      if (position) {
        objectModel.position.set(position.x || 0, position.y || 0, position.z || 0)
      }
      if (rotation) {
        objectModel.rotation.set(rotation.x || 0, rotation.y || 0, rotation.z || 0)
      }
      if (scale) {
        if (typeof scale === 'number') {
          objectModel.scale.set(scale, scale, scale)
        } else {
          objectModel.scale.set(scale.x || 1, scale.y || 1, scale.z || 1)
        }
      }

      // Set up materials
      objectModel.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material = child.material.clone()
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
        } else if (gltf.animations.length > 0) {
          mixer.clipAction(gltf.animations[0]).play()
        }
      }

      this.parentObject.add(objectModel)
      this.objects.set(objectId, { model: objectModel, gltf, options })
      
      // Track scene membership
      if (this.currentSceneId) {
        const sceneObjs = this.sceneObjectMap.get(this.currentSceneId) || new Set()
        sceneObjs.add(objectId)
        this.sceneObjectMap.set(this.currentSceneId, sceneObjs)
      }
      
      return objectModel
    } catch (error) {
      console.error(`Failed to load object ${objectId}:`, error)
      return null
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
   * Slow fade out character (used for ending sequence trigger in scene4)
   * Linear fade over a long duration, matching original's slowFadeOutCharacter
   * @param {string} charId - Character identifier
   * @param {number} duration - Fade duration in ms (default 66000 = 66 seconds)
   * @param {number} startOpacity - Starting opacity
   */
  slowFadeOutCharacter(charId, duration = 66000, startOpacity = 0.7) {
    const charData = this.characters.get(charId)
    if (!charData) {
      console.warn(`Character ${charId} not found for slow fade out`)
      return
    }

    const character = charData.model

    // Ensure materials start at the expected opacity
    character.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.opacity = startOpacity
      }
    })

    const startTime = performance.now()

    const animate = () => {
      const elapsed = performance.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Linear fade for slow, consistent transition (matches original)
      const currentOpacity = startOpacity * (1 - progress)

      character.traverse((child) => {
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
   * Get average opacity of a character's meshes
   * @param {string} charId - Character identifier
   * @returns {number} Average opacity
   */
  getCharacterOpacity(charId) {
    const charData = this.characters.get(charId)
    if (!charData) return 0

    let totalOpacity = 0
    let meshCount = 0

    charData.model.traverse((child) => {
      if (child.isMesh && child.material) {
        totalOpacity += child.material.opacity
        meshCount++
      }
    })

    return meshCount > 0 ? totalOpacity / meshCount : 0
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
      this.parentObject.remove(charData.model)
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
      this.parentObject.remove(objData.model)
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
   * Remove all characters belonging to a scene
   * @param {string} sceneId - Scene identifier
   */
  removeSceneCharacters(sceneId) {
    const charIds = this.sceneCharacterMap.get(sceneId)
    if (charIds) {
      charIds.forEach(charId => {
        this.removeCharacter(charId)
      })
      this.sceneCharacterMap.delete(sceneId)
    }

    const objIds = this.sceneObjectMap.get(sceneId)
    if (objIds) {
      objIds.forEach(objId => {
        this.removeObject(objId)
      })
      this.sceneObjectMap.delete(sceneId)
    }
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
    this.sceneCharacterMap.clear()
    this.sceneObjectMap.clear()
  }
}

export default CharacterManager
