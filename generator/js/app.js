/**
 * Spatial Journalism Engine - Story Generator
 * Main application script
 */

import { StoryData } from './forms/story-data.js'
import { SceneEditor } from './forms/scene-editor.js'

class Generator {
  constructor() {
    this.story = new StoryData()
    this.sceneEditor = new SceneEditor(this)
    
    this.init()
  }

  init() {
    this.bindNavigation()
    this.bindProjectForm()
    this.bindUIForm()
    this.bindEndingForm()
    this.bindImportExport()
    this.bindPreview()
    this.bindScenes()
    
    this.updateLocalizedInputs()
    this.updatePreview()
  }

  // Navigation
  bindNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const section = item.dataset.section
        this.showSection(section)
      })
    })
  }

  showSection(sectionId) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.section === sectionId)
    })
    
    // Update sections
    document.querySelectorAll('.section').forEach(section => {
      section.classList.toggle('active', section.id === `section-${sectionId}`)
    })
    
    // Update preview when shown
    if (sectionId === 'preview') {
      this.updatePreview()
    }
  }

  // Project Form
  bindProjectForm() {
    const titleInput = document.getElementById('project-title')
    const versionInput = document.getElementById('project-version')
    const defaultLangSelect = document.getElementById('project-default-lang')
    const basePathInput = document.getElementById('assets-base-path')
    const environmentInput = document.getElementById('assets-environment')
    
    titleInput.addEventListener('input', () => {
      this.story.project.title = titleInput.value
    })
    
    versionInput.addEventListener('input', () => {
      this.story.project.version = versionInput.value
    })
    
    defaultLangSelect.addEventListener('change', () => {
      this.story.project.defaultLanguage = defaultLangSelect.value
    })
    
    basePathInput.addEventListener('input', () => {
      this.story.project.assets.basePath = basePathInput.value
    })
    
    environmentInput.addEventListener('input', () => {
      this.story.project.assets.environment = environmentInput.value
    })
    
    // Languages tag input
    const langInput = document.getElementById('project-languages')
    langInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && langInput.value.trim()) {
        e.preventDefault()
        this.addLanguage(langInput.value.trim())
        langInput.value = ''
      }
    })
    
    // Mode checkboxes
    ['ar', '3d', 'guided', 'exploration'].forEach(mode => {
      const checkbox = document.getElementById(`mode-${mode}`)
      if (checkbox) {
        checkbox.addEventListener('change', () => {
          this.updateModes()
        })
      }
    })
  }

  addLanguage(lang) {
    if (this.story.project.languages.includes(lang)) return
    
    this.story.project.languages.push(lang)
    this.renderLanguageTags()
    this.updateLocalizedInputs()
    this.updateDefaultLangOptions()
  }

  removeLanguage(lang) {
    const index = this.story.project.languages.indexOf(lang)
    if (index > -1) {
      this.story.project.languages.splice(index, 1)
      this.renderLanguageTags()
      this.updateLocalizedInputs()
      this.updateDefaultLangOptions()
    }
  }

  renderLanguageTags() {
    const container = document.getElementById('languages-container')
    const input = document.getElementById('project-languages')
    
    container.innerHTML = ''
    this.story.project.languages.forEach(lang => {
      const tag = document.createElement('span')
      tag.className = 'tag'
      tag.dataset.value = lang
      tag.innerHTML = `${lang} <button class="tag-remove">&times;</button>`
      tag.querySelector('.tag-remove').addEventListener('click', () => {
        this.removeLanguage(lang)
      })
      container.appendChild(tag)
    })
    container.appendChild(input)
  }

  updateDefaultLangOptions() {
    const select = document.getElementById('project-default-lang')
    select.innerHTML = ''
    this.story.project.languages.forEach(lang => {
      const option = document.createElement('option')
      option.value = lang
      option.textContent = lang.toUpperCase()
      select.appendChild(option)
    })
    select.value = this.story.project.defaultLanguage
  }

  updateModes() {
    const modes = []
    if (document.getElementById('mode-ar')?.checked) modes.push('ar')
    if (document.getElementById('mode-3d')?.checked) modes.push('3d')
    if (document.getElementById('mode-guided')?.checked) modes.push('guided')
    if (document.getElementById('mode-exploration')?.checked) modes.push('exploration')
    this.story.project.modes = modes
  }

  // UI Form
  bindUIForm() {
    const bgInput = document.getElementById('ui-bg-image')
    const bgDesktopInput = document.getElementById('ui-bg-image-desktop')
    const logoInput = document.getElementById('ui-logo')
    const fontInput = document.getElementById('ui-font')
    const fontFileInput = document.getElementById('ui-font-woff2')
    const colorPicker = document.getElementById('ui-primary-color-picker')
    const colorInput = document.getElementById('ui-primary-color')
    
    bgInput?.addEventListener('input', () => {
      this.story.ui.homeScreen.backgroundImage = bgInput.value
    })
    
    bgDesktopInput?.addEventListener('input', () => {
      this.story.ui.homeScreen.backgroundImageDesktop = bgDesktopInput.value
    })
    
    logoInput?.addEventListener('input', () => {
      this.story.ui.branding.logo = logoInput.value
    })
    
    fontInput?.addEventListener('input', () => {
      this.story.ui.branding.font = fontInput.value
    })
    
    fontFileInput?.addEventListener('input', () => {
      if (!this.story.ui.branding.fontFiles) {
        this.story.ui.branding.fontFiles = {}
      }
      this.story.ui.branding.fontFiles.woff2 = fontFileInput.value
    })
    
    colorPicker?.addEventListener('input', () => {
      colorInput.value = colorPicker.value
      this.story.ui.branding.primaryColor = colorPicker.value
    })
    
    colorInput?.addEventListener('input', () => {
      colorPicker.value = colorInput.value
      this.story.ui.branding.primaryColor = colorInput.value
    })
    
    // Controls
    ['recenter', 'skip', 'settings'].forEach(ctrl => {
      const checkbox = document.getElementById(`ctrl-${ctrl}`)
      checkbox?.addEventListener('change', () => {
        this.story.ui.controls[`show${ctrl.charAt(0).toUpperCase() + ctrl.slice(1)}`] = checkbox.checked
      })
    })
  }

  // Ending Form
  bindEndingForm() {
    const videoInput = document.getElementById('ending-video')
    
    videoInput?.addEventListener('input', () => {
      this.story.ending.video = videoInput.value
    })
    
    document.getElementById('btn-add-credit')?.addEventListener('click', () => {
      this.addCredit()
    })
  }

  addCredit() {
    const credit = { role: {}, name: '' }
    this.story.ending.credits.push(credit)
    this.renderCredits()
  }

  removeCredit(index) {
    this.story.ending.credits.splice(index, 1)
    this.renderCredits()
  }

  renderCredits() {
    const container = document.getElementById('credits-list')
    container.innerHTML = ''
    
    this.story.ending.credits.forEach((credit, index) => {
      const item = document.createElement('div')
      item.className = 'item-card'
      item.innerHTML = `
        <div class="item-card-content">
          <input type="text" class="input" placeholder="Role" value="${credit.role.en || ''}" data-field="role" data-index="${index}">
          <input type="text" class="input" placeholder="Name" value="${credit.name}" data-field="name" data-index="${index}" style="margin-top:8px">
        </div>
        <div class="item-card-actions">
          <button class="btn btn-small btn-danger" data-action="remove" data-index="${index}">Remove</button>
        </div>
      `
      container.appendChild(item)
    })
    
    container.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', () => {
        const index = parseInt(input.dataset.index)
        const field = input.dataset.field
        if (field === 'role') {
          this.story.ending.credits[index].role = { en: input.value }
        } else {
          this.story.ending.credits[index][field] = input.value
        }
      })
    })
    
    container.querySelectorAll('[data-action="remove"]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.removeCredit(parseInt(btn.dataset.index))
      })
    })
  }

  // Localized Inputs
  updateLocalizedInputs() {
    const containers = [
      { id: 'ui-title-container', path: 'ui.homeScreen.title' },
      { id: 'ui-subtitle-container', path: 'ui.homeScreen.subtitle' },
      { id: 'ending-text-container', path: 'ending.text' }
    ]
    
    containers.forEach(({ id, path }) => {
      this.renderLocalizedInput(id, path)
    })
  }

  renderLocalizedInput(containerId, path) {
    const container = document.getElementById(containerId)
    if (!container) return
    
    container.innerHTML = ''
    
    this.story.project.languages.forEach(lang => {
      const field = document.createElement('div')
      field.className = 'localized-field'
      field.innerHTML = `
        <span class="lang-label">${lang}</span>
        <input type="text" class="input" data-lang="${lang}" data-path="${path}" placeholder="Enter ${lang.toUpperCase()} text">
      `
      container.appendChild(field)
    })
    
    container.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', () => {
        const lang = input.dataset.lang
        const pathParts = input.dataset.path.split('.')
        let obj = this.story
        for (let i = 0; i < pathParts.length - 1; i++) {
          obj = obj[pathParts[i]]
        }
        const key = pathParts[pathParts.length - 1]
        if (typeof obj[key] !== 'object') {
          obj[key] = {}
        }
        obj[key][lang] = input.value
      })
    })
  }

  // Scenes
  bindScenes() {
    document.getElementById('btn-add-scene')?.addEventListener('click', () => {
      this.sceneEditor.createNewScene()
    })
    
    this.renderScenes()
  }

  renderScenes() {
    const container = document.getElementById('scenes-list')
    if (!container) return
    
    container.innerHTML = ''
    
    if (this.story.scenes.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon">🎬</div>
          <p>No scenes yet. Add your first scene to get started.</p>
          <button class="btn btn-primary" id="btn-add-first-scene">
            <span class="icon">+</span> Add Scene
          </button>
        </div>
      `
      document.getElementById('btn-add-first-scene')?.addEventListener('click', () => {
        this.sceneEditor.createNewScene()
      })
      return
    }
    
    this.story.scenes.forEach((scene, index) => {
      const card = document.createElement('div')
      card.className = 'scene-card'
      card.innerHTML = `
        <div class="scene-card-header">
          <span class="scene-card-title">${scene.name || 'Untitled Scene'}</span>
          <span class="scene-card-id">${scene.id}</span>
        </div>
        <div class="scene-card-meta">
          <span>📹 ${scene.videos?.length || 0} videos</span>
          <span>👤 ${scene.characters?.length || 0} characters</span>
          <span>🎵 ${scene.audio?.url ? '1 audio' : 'No audio'}</span>
        </div>
        <div class="scene-card-actions">
          <button class="btn btn-small btn-secondary" data-action="edit" data-index="${index}">Edit</button>
          <button class="btn btn-small btn-secondary" data-action="duplicate" data-index="${index}">Duplicate</button>
          <button class="btn btn-small btn-danger" data-action="delete" data-index="${index}">Delete</button>
        </div>
      `
      container.appendChild(card)
    })
    
    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        const action = btn.dataset.action
        const index = parseInt(btn.dataset.index)
        
        if (action === 'edit') {
          this.sceneEditor.editScene(index)
        } else if (action === 'duplicate') {
          this.duplicateScene(index)
        } else if (action === 'delete') {
          this.deleteScene(index)
        }
      })
    })
    
    container.querySelectorAll('.scene-card').forEach((card, index) => {
      card.addEventListener('click', () => {
        this.sceneEditor.editScene(index)
      })
    })
  }

  duplicateScene(index) {
    const scene = JSON.parse(JSON.stringify(this.story.scenes[index]))
    scene.id = `scene${Date.now()}`
    scene.name = `${scene.name} (Copy)`
    this.story.scenes.push(scene)
    this.renderScenes()
  }

  deleteScene(index) {
    if (confirm('Are you sure you want to delete this scene?')) {
      this.story.scenes.splice(index, 1)
      this.renderScenes()
    }
  }

  // Import/Export
  bindImportExport() {
    document.getElementById('btn-import')?.addEventListener('click', () => {
      this.showImportModal()
    })
    
    document.getElementById('btn-export')?.addEventListener('click', () => {
      this.exportJSON()
    })
    
    document.getElementById('import-modal-close')?.addEventListener('click', () => {
      this.hideImportModal()
    })
    
    document.getElementById('import-modal-cancel')?.addEventListener('click', () => {
      this.hideImportModal()
    })
    
    document.getElementById('import-modal-submit')?.addEventListener('click', () => {
      this.importJSON()
    })
    
    document.getElementById('import-file')?.addEventListener('change', (e) => {
      const file = e.target.files[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (event) => {
          document.getElementById('import-text').value = event.target.result
        }
        reader.readAsText(file)
      }
    })
  }

  showImportModal() {
    document.getElementById('import-modal').classList.add('active')
  }

  hideImportModal() {
    document.getElementById('import-modal').classList.remove('active')
    document.getElementById('import-text').value = ''
    document.getElementById('import-file').value = ''
  }

  importJSON() {
    const text = document.getElementById('import-text').value
    try {
      const data = JSON.parse(text)
      this.story.loadFromJSON(data)
      this.populateForm()
      this.hideImportModal()
      alert('Story imported successfully!')
    } catch (error) {
      alert('Invalid JSON: ' + error.message)
    }
  }

  exportJSON() {
    const json = JSON.stringify(this.story.toJSON(), null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = 'story.json'
    a.click()
    
    URL.revokeObjectURL(url)
  }

  populateForm() {
    // Project
    document.getElementById('project-title').value = this.story.project.title || ''
    document.getElementById('project-version').value = this.story.project.version || '1.0'
    document.getElementById('assets-base-path').value = this.story.project.assets.basePath || './assets/'
    document.getElementById('assets-environment').value = this.story.project.assets.environment || ''
    
    this.renderLanguageTags()
    this.updateDefaultLangOptions()
    this.updateLocalizedInputs()
    
    // Modes
    document.getElementById('mode-ar').checked = this.story.project.modes.includes('ar')
    document.getElementById('mode-3d').checked = this.story.project.modes.includes('3d')
    document.getElementById('mode-guided').checked = this.story.project.modes.includes('guided')
    document.getElementById('mode-exploration').checked = this.story.project.modes.includes('exploration')
    
    // UI
    document.getElementById('ui-bg-image').value = this.story.ui.homeScreen.backgroundImage || ''
    document.getElementById('ui-bg-image-desktop').value = this.story.ui.homeScreen.backgroundImageDesktop || ''
    document.getElementById('ui-logo').value = this.story.ui.branding.logo || ''
    document.getElementById('ui-font').value = this.story.ui.branding.font || ''
    document.getElementById('ui-primary-color').value = this.story.ui.branding.primaryColor || '#ffffff'
    document.getElementById('ui-primary-color-picker').value = this.story.ui.branding.primaryColor || '#ffffff'
    
    // Scenes
    this.renderScenes()
    
    // Credits
    this.renderCredits()
  }

  // Preview
  bindPreview() {
    document.getElementById('btn-copy-json')?.addEventListener('click', () => {
      const json = document.getElementById('json-output').textContent
      navigator.clipboard.writeText(json)
      alert('JSON copied to clipboard!')
    })
    
    document.getElementById('btn-download-json')?.addEventListener('click', () => {
      this.exportJSON()
    })
  }

  updatePreview() {
    const output = document.getElementById('json-output')
    if (output) {
      output.textContent = JSON.stringify(this.story.toJSON(), null, 2)
    }
  }
}

// Initialize
const app = new Generator()
