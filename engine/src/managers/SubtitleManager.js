/**
 * SubtitleManager - Time-synced subtitle display
 * Ported from Shadows of the Stabilisation Point
 * Reads subtitle data from JSON configuration
 */

export class SubtitleManager {
  constructor(options = {}) {
    this.language = options.defaultLanguage || 'en'
    this.subtitles = new Map() // Map of sceneId -> { en: [...], fi: [...] }
    this.currentScene = null
    this.currentTime = 0
    this.isPlaying = false
    this.totalScenes = options.totalScenes || 4
    
    // Create DOM elements
    this.container = null
    this.subtitleElement = null
    this.sceneIndicators = []
    
    this.createElements()
    
    // Listen for language changes
    document.addEventListener('languageChanged', (e) => {
      this.setLanguage(e.detail.language)
    })
  }

  /**
   * Create subtitle DOM elements
   */
  createElements() {
    // Check for existing container
    this.container = document.getElementById('subtitle-container')
    if (!this.container) {
      this.container = document.createElement('div')
      this.container.id = 'subtitle-container'
      this.container.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        width: 90%;
        max-width: 800px;
        text-align: center;
        z-index: 1000;
        pointer-events: none;
        display: none;
      `
      document.body.appendChild(this.container)
    }

    // Subtitle text element
    this.subtitleElement = document.getElementById('subtitle-text')
    if (!this.subtitleElement) {
      this.subtitleElement = document.createElement('p')
      this.subtitleElement.id = 'subtitle-text'
      this.subtitleElement.style.cssText = `
        font-size: 1.1rem;
        color: white;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
        padding: 12px 20px;
        background: rgba(0, 0, 0, 0.6);
        border-radius: 8px;
        margin: 0;
        line-height: 1.5;
      `
      this.container.appendChild(this.subtitleElement)
    }

    // Scene indicators
    this.createSceneIndicators()
  }

  /**
   * Create scene progress indicators
   */
  createSceneIndicators() {
    let indicatorsContainer = document.getElementById('scene-indicators')
    
    if (!indicatorsContainer) {
      indicatorsContainer = document.createElement('div')
      indicatorsContainer.id = 'scene-indicators'
      indicatorsContainer.style.cssText = `
        display: flex;
        justify-content: center;
        gap: 8px;
        margin-top: 16px;
      `
      this.container.appendChild(indicatorsContainer)
    }

    // Clear existing indicators
    indicatorsContainer.innerHTML = ''
    this.sceneIndicators = []

    // Create indicators for each scene
    for (let i = 0; i < this.totalScenes; i++) {
      const indicator = document.createElement('div')
      indicator.className = 'scene-indicator'
      indicator.style.cssText = `
        height: 4px;
        width: 48px;
        border-radius: 9999px;
        background-color: #666;
        transition: background-color 0.3s ease;
      `
      indicatorsContainer.appendChild(indicator)
      this.sceneIndicators.push(indicator)
    }
  }

  /**
   * Load subtitles from scene configurations
   */
  loadSubtitles(scenes) {
    this.subtitles.clear()
    
    scenes.forEach((scene) => {
      if (scene.subtitles) {
        this.subtitles.set(scene.id, scene.subtitles)
      }
    })

    // Update total scenes
    this.totalScenes = scenes.length
    this.createSceneIndicators()
  }

  /**
   * Set current language
   */
  setLanguage(language) {
    this.language = language
    // Update current subtitle if playing
    if (this.isPlaying && this.currentScene) {
      this.updateSubtitle(this.currentScene, this.currentTime)
    }
  }

  /**
   * Update subtitle based on current time
   */
  updateSubtitle(sceneId, currentTime) {
    this.currentScene = sceneId
    this.currentTime = currentTime

    const sceneSubtitles = this.subtitles.get(sceneId)
    if (!sceneSubtitles) {
      this.subtitleElement.textContent = ''
      return
    }

    const languageSubtitles = sceneSubtitles[this.language]
    if (!languageSubtitles) {
      this.subtitleElement.textContent = ''
      return
    }

    // Find current subtitle
    const currentSubtitle = languageSubtitles.find(
      sub => currentTime >= sub.start && currentTime <= sub.end
    )

    if (currentSubtitle) {
      this.subtitleElement.textContent = currentSubtitle.text
    } else {
      this.subtitleElement.textContent = ''
    }
  }

  /**
   * Update scene indicators
   */
  updateSceneIndicators(sceneId) {
    // Extract scene number from ID (e.g., "scene1" -> 1)
    const match = sceneId.match(/scene(\d+)/i)
    if (!match) return

    const sceneNumber = parseInt(match[1], 10)
    
    this.sceneIndicators.forEach((indicator, index) => {
      indicator.style.backgroundColor = index < sceneNumber ? '#fff' : '#666'
    })
  }

  /**
   * Called when audio starts for a scene
   */
  onAudioStart(sceneId) {
    this.isPlaying = true
    this.currentScene = sceneId
    this.show()
    this.updateSceneIndicators(sceneId)
  }

  /**
   * Called on audio time update
   */
  onAudioTimeUpdate(sceneId, currentTime) {
    this.updateSubtitle(sceneId, currentTime)
    this.updateSceneIndicators(sceneId)
  }

  /**
   * Called when audio ends
   */
  onAudioEnd() {
    this.isPlaying = false
    this.subtitleElement.textContent = ''
    // Don't hide - keep indicators visible
  }

  /**
   * Show subtitle container
   */
  show() {
    this.container.style.display = 'block'
    this.container.style.opacity = '1'
    this.container.style.visibility = 'visible'
  }

  /**
   * Hide subtitle container
   */
  hide() {
    this.container.style.display = 'none'
  }

  /**
   * Clean up
   */
  dispose() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container)
    }
    this.subtitles.clear()
  }
}

export default SubtitleManager
