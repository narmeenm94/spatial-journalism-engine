/**
 * Spatial Journalism Engine
 * JSON-driven platform for creating immersive WebAR journalism experiences
 * 
 * @author Yle / Narmeen Marji
 * @license MIT
 */

// Core
export { Engine } from './core/Engine.js'
export { JSONParser } from './core/JSONParser.js'
export { AssetLoader } from './core/AssetLoader.js'

// Managers
export { AudioManager } from './managers/AudioManager.js'
export { VideoManager } from './managers/VideoManager.js'
export { CharacterManager } from './managers/CharacterManager.js'
export { LightingManager } from './managers/LightingManager.js'
export { SceneManager } from './managers/SceneManager.js'
export { UIManager } from './managers/UIManager.js'

// Default export - main Engine class
import { Engine } from './core/Engine.js'
export default Engine

/**
 * Quick initialization helper
 * @param {object} options - Engine options
 * @returns {Promise<Engine>} Initialized engine instance
 * 
 * @example
 * // Initialize with story URL
 * const engine = await SJEngine.init({
 *   storyUrl: './story.json',
 *   container: document.getElementById('app')
 * })
 * 
 * @example
 * // Initialize with story object
 * const engine = await SJEngine.init({
 *   story: { project: {...}, scenes: [...] }
 * })
 */
Engine.init = async function(options = {}) {
  const engine = new Engine(options)
  
  if (options.storyUrl) {
    await engine.init(options.storyUrl)
  } else if (options.story) {
    await engine.init(options.story)
  }
  
  return engine
}

/**
 * Version
 */
Engine.VERSION = '1.0.0'

// Global export for non-module usage
if (typeof window !== 'undefined') {
  window.SJEngine = Engine
}
