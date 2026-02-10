/**
 * Scene Editor Modal
 */

export class SceneEditor {
  constructor(app) {
    this.app = app
    this.currentScene = null
    this.currentIndex = -1
    
    this.bindModal()
  }

  bindModal() {
    document.getElementById('scene-modal-close')?.addEventListener('click', () => {
      this.closeModal()
    })
    
    document.getElementById('scene-modal-cancel')?.addEventListener('click', () => {
      this.closeModal()
    })
    
    document.getElementById('scene-modal-save')?.addEventListener('click', () => {
      this.saveScene()
    })
  }

  createNewScene() {
    this.currentScene = this.app.story.createScene()
    this.currentIndex = -1
    this.openModal('Add New Scene')
  }

  editScene(index) {
    this.currentScene = JSON.parse(JSON.stringify(this.app.story.getScene(index)))
    this.currentIndex = index
    this.openModal('Edit Scene')
  }

  openModal(title) {
    document.getElementById('scene-modal-title').textContent = title
    this.renderForm()
    document.getElementById('scene-modal').classList.add('active')
  }

  closeModal() {
    document.getElementById('scene-modal').classList.remove('active')
    this.currentScene = null
    this.currentIndex = -1
  }

  saveScene() {
    this.collectFormData()
    
    if (this.currentIndex === -1) {
      this.app.story.addScene(this.currentScene)
    } else {
      this.app.story.updateScene(this.currentIndex, this.currentScene)
    }
    
    this.app.renderScenes()
    this.closeModal()
  }

  renderForm() {
    const body = document.getElementById('scene-modal-body')
    
    body.innerHTML = `
      <div class="tabs">
        <div class="tab active" data-tab="basic">Basic</div>
        <div class="tab" data-tab="audio">Audio</div>
        <div class="tab" data-tab="characters">Characters</div>
        <div class="tab" data-tab="videos">Videos</div>
        <div class="tab" data-tab="lighting">Lighting</div>
      </div>
      
      <div class="tab-content active" id="tab-basic">
        ${this.renderBasicTab()}
      </div>
      
      <div class="tab-content" id="tab-audio">
        ${this.renderAudioTab()}
      </div>
      
      <div class="tab-content" id="tab-characters">
        ${this.renderCharactersTab()}
      </div>
      
      <div class="tab-content" id="tab-videos">
        ${this.renderVideosTab()}
      </div>
      
      <div class="tab-content" id="tab-lighting">
        ${this.renderLightingTab()}
      </div>
    `
    
    this.bindTabs()
    this.bindFormEvents()
  }

  bindTabs() {
    document.querySelectorAll('#scene-modal .tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('#scene-modal .tab').forEach(t => t.classList.remove('active'))
        document.querySelectorAll('#scene-modal .tab-content').forEach(c => c.classList.remove('active'))
        
        tab.classList.add('active')
        document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active')
      })
    })
  }

  renderBasicTab() {
    return `
      <div class="form-group">
        <label for="scene-id">Scene ID</label>
        <input type="text" id="scene-id" class="input" value="${this.currentScene.id || ''}" placeholder="scene1">
      </div>
      
      <div class="form-group">
        <label for="scene-name">Scene Name</label>
        <input type="text" id="scene-name" class="input" value="${this.currentScene.name || ''}" placeholder="Introduction">
      </div>
      
      <div class="form-group">
        <label for="scene-next">Next Scene ID (optional)</label>
        <input type="text" id="scene-next" class="input" value="${this.currentScene.nextScene || ''}" placeholder="scene2">
        <small style="color: var(--text-muted)">Leave empty for manual navigation</small>
      </div>
    `
  }

  renderAudioTab() {
    const audio = this.currentScene.audio || {}
    
    return `
      <div class="form-group">
        <label for="audio-url">Audio File</label>
        <input type="text" id="audio-url" class="input" value="${audio.url || ''}" placeholder="audio/narration.mp3">
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="audio-volume">Volume</label>
          <div class="range-with-value">
            <input type="range" id="audio-volume" min="0" max="1" step="0.1" value="${audio.volume ?? 0.5}">
            <span class="range-value">${audio.volume ?? 0.5}</span>
          </div>
        </div>
        <div class="form-group">
          <label for="audio-delay">Delay (ms)</label>
          <input type="number" id="audio-delay" class="input" value="${audio.delay || 0}" min="0">
        </div>
      </div>
      
      <div class="checkbox-group">
        <label class="checkbox-label">
          <input type="checkbox" id="audio-loop" ${audio.loop ? 'checked' : ''}> Loop
        </label>
        <label class="checkbox-label">
          <input type="checkbox" id="audio-autoplay" ${audio.autoplay !== false ? 'checked' : ''}> Autoplay
        </label>
        <label class="checkbox-label">
          <input type="checkbox" id="audio-positional" ${audio.positional ? 'checked' : ''}> Positional Audio
        </label>
      </div>
      
      <div id="positional-options" style="display: ${audio.positional ? 'block' : 'none'}">
        <h4 style="margin: 16px 0 8px">Position</h4>
        <div class="vector3-label"><span>X</span><span>Y</span><span>Z</span></div>
        <div class="vector3-input">
          <input type="number" id="audio-pos-x" class="input" value="${audio.position?.x ?? 0}">
          <input type="number" id="audio-pos-y" class="input" value="${audio.position?.y ?? 0}">
          <input type="number" id="audio-pos-z" class="input" value="${audio.position?.z ?? 0}">
        </div>
        
        <div class="form-row" style="margin-top: 16px">
          <div class="form-group">
            <label for="audio-ref-distance">Ref Distance</label>
            <input type="number" id="audio-ref-distance" class="input" value="${audio.refDistance ?? 15}">
          </div>
          <div class="form-group">
            <label for="audio-max-distance">Max Distance</label>
            <input type="number" id="audio-max-distance" class="input" value="${audio.maxDistance ?? 50}">
          </div>
        </div>
      </div>
    `
  }

  renderCharactersTab() {
    const characters = this.currentScene.characters || []
    
    let html = `
      <div class="item-list" id="characters-list">
        ${characters.map((char, i) => this.renderCharacterItem(char, i)).join('')}
      </div>
      <button class="btn btn-secondary" id="btn-add-character">
        <span class="icon">+</span> Add Character
      </button>
    `
    
    return html
  }

  renderCharacterItem(char, index) {
    return `
      <div class="subsection" data-char-index="${index}">
        <div class="subsection-header">
          <span class="subsection-title">Character ${index + 1}</span>
          <button class="btn btn-small btn-danger" data-action="remove-char" data-index="${index}">Remove</button>
        </div>
        
        <div class="form-group">
          <label>Model</label>
          <input type="text" class="input char-model" value="${char.model || ''}" placeholder="models/character.glb">
        </div>
        
        <div class="form-group">
          <label>Position (X, Y, Z)</label>
          <div class="vector3-input">
            <input type="number" class="input char-pos-x" value="${char.position?.x ?? 0}">
            <input type="number" class="input char-pos-y" value="${char.position?.y ?? 0}">
            <input type="number" class="input char-pos-z" value="${char.position?.z ?? 0}">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Scale</label>
            <input type="number" class="input char-scale" value="${typeof char.scale === 'number' ? char.scale : char.scale?.x ?? 1}">
          </div>
          <div class="form-group">
            <label>Rotation Y (degrees)</label>
            <input type="number" class="input char-rot-y" value="${(char.rotation?.y ?? 0) * (180 / Math.PI)}">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Animation</label>
            <input type="text" class="input char-animation" value="${char.animation || ''}" placeholder="Talking">
          </div>
          <div class="form-group">
            <label>Delay (ms)</label>
            <input type="number" class="input char-delay" value="${char.delay || 0}" min="0">
          </div>
        </div>
      </div>
    `
  }

  renderVideosTab() {
    const videos = this.currentScene.videos || []
    
    return `
      <div class="item-list" id="videos-list">
        ${videos.map((video, i) => this.renderVideoItem(video, i)).join('')}
      </div>
      <button class="btn btn-secondary" id="btn-add-video">
        <span class="icon">+</span> Add Video
      </button>
    `
  }

  renderVideoItem(video, index) {
    return `
      <div class="subsection" data-video-index="${index}">
        <div class="subsection-header">
          <span class="subsection-title">${video.id || `Video ${index + 1}`}</span>
          <button class="btn btn-small btn-danger" data-action="remove-video" data-index="${index}">Remove</button>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Video ID</label>
            <input type="text" class="input video-id" value="${video.id || ''}" placeholder="intro-video">
          </div>
          <div class="form-group">
            <label>Video File</label>
            <input type="text" class="input video-url" value="${video.url || ''}" placeholder="video/clip.mp4">
          </div>
        </div>
        
        <div class="form-group">
          <label>Position (X, Y, Z)</label>
          <div class="vector3-input">
            <input type="number" class="input video-pos-x" value="${video.position?.x ?? 0}">
            <input type="number" class="input video-pos-y" value="${video.position?.y ?? 0}">
            <input type="number" class="input video-pos-z" value="${video.position?.z ?? 0}">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Rotation Y (degrees)</label>
            <input type="number" class="input video-rot-y" value="${(video.rotation?.y ?? 0) * (180 / Math.PI)}">
          </div>
          <div class="form-group">
            <label>Trigger At (seconds)</label>
            <input type="number" class="input video-trigger" value="${video.triggerAt ?? ''}" step="0.1" placeholder="0.0">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Width</label>
            <input type="number" class="input video-width" value="${video.size?.[0] ?? 64}">
          </div>
          <div class="form-group">
            <label>Height</label>
            <input type="number" class="input video-height" value="${video.size?.[1] ?? 40}">
          </div>
        </div>
        
        <div class="checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" class="video-loop" ${video.loop ? 'checked' : ''}> Loop
          </label>
          <label class="checkbox-label">
            <input type="checkbox" class="video-muted" ${video.muted !== false ? 'checked' : ''}> Muted
          </label>
        </div>
      </div>
    `
  }

  renderLightingTab() {
    const lighting = this.currentScene.lighting || {}
    
    return `
      <div class="form-group">
        <label>Ambient Light Intensity</label>
        <div class="range-with-value">
          <input type="range" id="light-ambient" min="0" max="2" step="0.1" value="${lighting.ambient ?? 1}">
          <span class="range-value">${lighting.ambient ?? 1}</span>
        </div>
      </div>
      
      <div class="form-group">
        <label>Directional Light Intensity</label>
        <div class="range-with-value">
          <input type="range" id="light-directional" min="0" max="2" step="0.1" value="${lighting.directional ?? 1}">
          <span class="range-value">${lighting.directional ?? 1}</span>
        </div>
      </div>
      
      <div class="form-group">
        <label>Hemisphere Light Intensity</label>
        <div class="range-with-value">
          <input type="range" id="light-hemisphere" min="0" max="2" step="0.1" value="${lighting.hemisphere ?? 1}">
          <span class="range-value">${lighting.hemisphere ?? 1}</span>
        </div>
      </div>
      
      <div class="checkbox-group" style="margin-top: 20px">
        <label class="checkbox-label">
          <input type="checkbox" id="light-volumetric" ${lighting.volumetric ? 'checked' : ''}> Volumetric Lighting
        </label>
        <label class="checkbox-label">
          <input type="checkbox" id="light-flicker" ${lighting.flicker ? 'checked' : ''}> Flicker Effect
        </label>
      </div>
    `
  }

  bindFormEvents() {
    // Volume range
    const volumeRange = document.getElementById('audio-volume')
    volumeRange?.addEventListener('input', () => {
      volumeRange.nextElementSibling.textContent = volumeRange.value
    })
    
    // Positional audio toggle
    document.getElementById('audio-positional')?.addEventListener('change', (e) => {
      document.getElementById('positional-options').style.display = e.target.checked ? 'block' : 'none'
    })
    
    // Light ranges
    const lightTypes = ['ambient', 'directional', 'hemisphere']
    for (let i = 0; i < lightTypes.length; i++) {
      const type = lightTypes[i]
      const range = document.getElementById('light-' + type)
      if (range) {
        range.addEventListener('input', () => {
          range.nextElementSibling.textContent = range.value
        })
      }
    }
    
    // Add character
    document.getElementById('btn-add-character')?.addEventListener('click', () => {
      this.currentScene.characters = this.currentScene.characters || []
      this.currentScene.characters.push({
        model: '',
        position: { x: 0, y: 0, z: 0 },
        scale: 1,
        rotation: { x: 0, y: 0, z: 0 }
      })
      this.refreshCharactersList()
    })
    
    // Add video
    document.getElementById('btn-add-video')?.addEventListener('click', () => {
      this.currentScene.videos = this.currentScene.videos || []
      this.currentScene.videos.push({
        id: `video${this.currentScene.videos.length + 1}`,
        url: '',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        size: [64, 40]
      })
      this.refreshVideosList()
    })
    
    // Remove character/video buttons
    this.bindRemoveButtons()
  }

  bindRemoveButtons() {
    document.querySelectorAll('[data-action="remove-char"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.dataset.index)
        this.currentScene.characters.splice(index, 1)
        this.refreshCharactersList()
      })
    })
    
    document.querySelectorAll('[data-action="remove-video"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.dataset.index)
        this.currentScene.videos.splice(index, 1)
        this.refreshVideosList()
      })
    })
  }

  refreshCharactersList() {
    const container = document.getElementById('characters-list')
    container.innerHTML = this.currentScene.characters.map((char, i) => this.renderCharacterItem(char, i)).join('')
    this.bindRemoveButtons()
  }

  refreshVideosList() {
    const container = document.getElementById('videos-list')
    container.innerHTML = this.currentScene.videos.map((video, i) => this.renderVideoItem(video, i)).join('')
    this.bindRemoveButtons()
  }

  collectFormData() {
    // Basic
    this.currentScene.id = document.getElementById('scene-id')?.value || this.currentScene.id
    this.currentScene.name = document.getElementById('scene-name')?.value || this.currentScene.name
    this.currentScene.nextScene = document.getElementById('scene-next')?.value || undefined
    
    // Audio
    this.currentScene.audio = {
      url: document.getElementById('audio-url')?.value || '',
      volume: parseFloat(document.getElementById('audio-volume')?.value) || 0.5,
      delay: parseInt(document.getElementById('audio-delay')?.value) || 0,
      loop: document.getElementById('audio-loop')?.checked || false,
      autoplay: document.getElementById('audio-autoplay')?.checked !== false,
      positional: document.getElementById('audio-positional')?.checked || false
    }
    
    if (this.currentScene.audio.positional) {
      this.currentScene.audio.position = {
        x: parseFloat(document.getElementById('audio-pos-x')?.value) || 0,
        y: parseFloat(document.getElementById('audio-pos-y')?.value) || 0,
        z: parseFloat(document.getElementById('audio-pos-z')?.value) || 0
      }
      this.currentScene.audio.refDistance = parseFloat(document.getElementById('audio-ref-distance')?.value) || 15
      this.currentScene.audio.maxDistance = parseFloat(document.getElementById('audio-max-distance')?.value) || 50
    }
    
    // Characters
    this.currentScene.characters = []
    document.querySelectorAll('[data-char-index]').forEach((el, i) => {
      this.currentScene.characters.push({
        model: el.querySelector('.char-model')?.value || '',
        position: {
          x: parseFloat(el.querySelector('.char-pos-x')?.value) || 0,
          y: parseFloat(el.querySelector('.char-pos-y')?.value) || 0,
          z: parseFloat(el.querySelector('.char-pos-z')?.value) || 0
        },
        scale: parseFloat(el.querySelector('.char-scale')?.value) || 1,
        rotation: {
          x: 0,
          y: (parseFloat(el.querySelector('.char-rot-y')?.value) || 0) * (Math.PI / 180),
          z: 0
        },
        animation: el.querySelector('.char-animation')?.value || undefined,
        delay: parseInt(el.querySelector('.char-delay')?.value) || 0
      })
    })
    
    // Videos
    this.currentScene.videos = []
    document.querySelectorAll('[data-video-index]').forEach((el, i) => {
      const triggerVal = el.querySelector('.video-trigger')?.value
      this.currentScene.videos.push({
        id: el.querySelector('.video-id')?.value || `video${i + 1}`,
        url: el.querySelector('.video-url')?.value || '',
        position: {
          x: parseFloat(el.querySelector('.video-pos-x')?.value) || 0,
          y: parseFloat(el.querySelector('.video-pos-y')?.value) || 0,
          z: parseFloat(el.querySelector('.video-pos-z')?.value) || 0
        },
        rotation: {
          x: 0,
          y: (parseFloat(el.querySelector('.video-rot-y')?.value) || 0) * (Math.PI / 180),
          z: 0
        },
        size: [
          parseFloat(el.querySelector('.video-width')?.value) || 64,
          parseFloat(el.querySelector('.video-height')?.value) || 40
        ],
        triggerAt: triggerVal ? parseFloat(triggerVal) : undefined,
        loop: el.querySelector('.video-loop')?.checked || false,
        muted: el.querySelector('.video-muted')?.checked !== false
      })
    })
    
    // Lighting
    this.currentScene.lighting = {
      ambient: parseFloat(document.getElementById('light-ambient')?.value) || 1,
      directional: parseFloat(document.getElementById('light-directional')?.value) || 1,
      hemisphere: parseFloat(document.getElementById('light-hemisphere')?.value) || 1,
      volumetric: document.getElementById('light-volumetric')?.checked || false,
      flicker: document.getElementById('light-flicker')?.checked || false
    }
  }
}

export default SceneEditor
