/**
 * Story Data Model
 */

export class StoryData {
  constructor() {
    this.reset()
  }

  reset() {
    this.project = {
      title: '',
      version: '1.0',
      languages: ['en'],
      defaultLanguage: 'en',
      modes: ['ar', '3d'],
      assets: {
        basePath: './assets/',
        environment: '',
        preload: []
      }
    }

    this.scenes = []

    this.ui = {
      homeScreen: {
        backgroundImage: '',
        backgroundImageDesktop: '',
        title: {},
        subtitle: {},
        startButtonText: {}
      },
      branding: {
        logo: '',
        primaryColor: '#ffffff',
        font: '',
        fontFiles: {}
      },
      controls: {
        showRecenter: true,
        showSkip: true,
        showSettings: true
      }
    }

    this.ending = {
      video: '',
      text: {},
      credits: []
    }
  }

  loadFromJSON(json) {
    if (json.project) {
      this.project = {
        ...this.project,
        ...json.project,
        assets: {
          ...this.project.assets,
          ...json.project.assets
        }
      }
    }

    if (json.scenes) {
      this.scenes = json.scenes
    }

    if (json.ui) {
      this.ui = {
        homeScreen: { ...this.ui.homeScreen, ...json.ui.homeScreen },
        branding: { ...this.ui.branding, ...json.ui.branding },
        controls: { ...this.ui.controls, ...json.ui.controls }
      }
    }

    if (json.ending) {
      this.ending = { ...this.ending, ...json.ending }
    }
  }

  toJSON() {
    return {
      project: this.cleanObject(this.project),
      scenes: this.scenes.map(scene => this.cleanScene(scene)),
      ui: this.cleanObject(this.ui),
      ending: this.cleanObject(this.ending)
    }
  }

  cleanObject(obj) {
    const cleaned = {}
    
    for (const key in obj) {
      const value = obj[key]
      
      if (value === null || value === undefined) continue
      if (value === '') continue
      if (Array.isArray(value) && value.length === 0) continue
      if (typeof value === 'object' && !Array.isArray(value)) {
        const cleanedNested = this.cleanObject(value)
        if (Object.keys(cleanedNested).length > 0) {
          cleaned[key] = cleanedNested
        }
      } else {
        cleaned[key] = value
      }
    }
    
    return cleaned
  }

  cleanScene(scene) {
    const cleaned = { ...scene }
    
    // Clean arrays
    if (cleaned.characters?.length === 0) delete cleaned.characters
    if (cleaned.objects?.length === 0) delete cleaned.objects
    if (cleaned.videos?.length === 0) delete cleaned.videos
    
    // Clean audio
    if (cleaned.audio && !cleaned.audio.url) delete cleaned.audio
    
    return this.cleanObject(cleaned)
  }

  createScene() {
    const index = this.scenes.length + 1
    return {
      id: `scene${index}`,
      name: `Scene ${index}`,
      audio: {
        url: '',
        volume: 0.5,
        loop: false,
        autoplay: true,
        delay: 0
      },
      characters: [],
      objects: [],
      videos: [],
      lighting: {
        ambient: 1,
        directional: 1,
        hemisphere: 1
      }
    }
  }

  addScene(scene) {
    this.scenes.push(scene)
    return this.scenes.length - 1
  }

  updateScene(index, scene) {
    this.scenes[index] = scene
  }

  removeScene(index) {
    this.scenes.splice(index, 1)
  }

  getScene(index) {
    return this.scenes[index]
  }
}

export default StoryData
