import { installStoryFonts } from '../ui/storyFonts.js'
import { renderDesignedScreen, mergeLaunchChoice, resolveScreenTarget, screenChoice } from '../ui/screenDesign.js'
/**
 * UIManager - Handles UI generation and management from JSON configuration
 */

export class UIManager {
  /**
   * Create UIManager
   * @param {object} options - Manager options
   */
  constructor(options = {}) {
    this.container = options.container || document.body
    this.config = null
    this.elements = new Map()
    this.language = options.defaultLanguage || 'en'
    this.storyBaseUrl = options.storyBaseUrl || ''

    this.onLanguageChange = options.onLanguageChange
    this.onModeSelect = options.onModeSelect
    this.onStart = options.onStart
  }

  /**
   * Initialize UI from configuration
   * @param {object} uiConfig - UI configuration from JSON
   * @param {object} projectConfig - Project configuration
   */
  init(uiConfig, projectConfig) {
    this.config = uiConfig
    this.projectConfig = projectConfig
    this.basePath = projectConfig.assets?.basePath || './assets/'

    this.disposeFonts?.()
    this.disposeFonts = installStoryFonts(uiConfig.branding, path => this.resolveAssetPath(path), family => console.warn('Could not load story font:', family))

    // Inject base styles
    this.injectBaseStyles()
  }

  /**
   * Resolve asset path relative to basePath and story location
   * @param {string} path - Asset path
   * @returns {string} Resolved path
   */
  resolveAssetPath(path) {
    if (!path) return path
    // Don't modify absolute URLs
    if (
      path.startsWith('http://') ||
      path.startsWith('https://') ||
      path.startsWith('data:') ||
      path.startsWith('blob:')
    ) {
      return path
    }
    // For absolute paths starting with /, return as-is
    if (path.startsWith('/')) {
      return path
    }
    // Combine basePath with path and resolve against story base URL
    const combinedPath = `${this.basePath}${path}`
    try {
      const resolved = new URL(combinedPath, this.storyBaseUrl)
      return resolved.href
    } catch (e) {
      // Fallback to combined path if URL resolution fails
      return combinedPath
    }
  }

  /**
   * Load custom font
   * @param {object} branding - Branding configuration
   */

  /**
   * Inject base styles
   */
  injectBaseStyles() {
    const primaryColor = this.config.branding?.primaryColor || '#ffffff'
    const fontFamily =
      this.config.branding?.font ||
      '-apple-system, BlinkMacSystemFont, sans-serif'

    const style = document.createElement('style')
    style.id = 'sj-engine-styles'
    style.textContent = `
      .sj-ui {
        font-family: ${fontFamily};
        --sj-primary: ${primaryColor};
      }
      
      .sj-screen {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }
      
      .sj-home-screen {
        background: #000;
        color: #fff;
      }
      
      .sj-home-screen::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-size: cover;
        background-position: center;
        opacity: 0.6;
        z-index: -1;
      }
      
      .sj-title {
        font-size: 2.5rem;
        font-weight: bold;
        text-align: center;
        margin-bottom: 1rem;
        text-shadow: 0 2px 4px rgba(0,0,0,0.5);
      }
      
      .sj-subtitle {
        font-size: 1.2rem;
        opacity: 0.8;
        margin-bottom: 2rem;
        text-align: center;
      }
      
      .sj-button {
        padding: 12px 32px;
        font-size: 1rem;
        font-weight: 600;
        border: 2px solid var(--sj-primary);
        background: transparent;
        color: var(--sj-primary);
        border-radius: 30px;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      
      .sj-button:hover {
        background: var(--sj-primary);
        color: #000;
      }
      
      .sj-button-primary {
        background: var(--sj-primary);
        color: #000;
      }
      
      .sj-button-primary:hover {
        background: transparent;
        color: var(--sj-primary);
      }
      
      .sj-language-toggle {
        position: absolute;
        top: 20px;
        right: 20px;
        display: flex;
        gap: 10px;
      }
      
      .sj-lang-btn {
        padding: 8px 16px;
        border: 1px solid rgba(255,255,255,0.3);
        background: transparent;
        color: #fff;
        border-radius: 4px;
        cursor: pointer;
        opacity: 0.6;
        transition: opacity 0.2s;
      }
      
      .sj-lang-btn.active {
        opacity: 1;
        border-color: var(--sj-primary);
      }
      
      .sj-logo {
        position: absolute;
        bottom: 20px;
        height: 40px;
        opacity: 0.8;
      }
      
      .sj-mode-selection {
        display: flex;
        gap: 20px;
        margin-top: 20px;
      }
      
      .sj-mode-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 20px;
        border: 2px solid rgba(255,255,255,0.3);
        background: rgba(0,0,0,0.5);
        color: #fff;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.3s;
        min-width: 120px;
      }
      
      .sj-mode-btn:hover {
        border-color: var(--sj-primary);
        transform: translateY(-5px);
      }
      
      .sj-mode-icon {
        font-size: 2rem;
        margin-bottom: 10px;
      }
      
      .sj-control-btn {
        position: fixed;
        width: 44px;
        height: 44px;
        border: none;
        background: rgba(0,0,0,0.5);
        color: #fff;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100;
      }
      
      .sj-recenter-btn {
        bottom: 20px;
        left: 20px;
      }
      
      .sj-skip-btn {
        bottom: 20px;
        right: 20px;
      }
      
      .sj-hidden {
        display: none !important;
      }
      
      .sj-fade-in {
        animation: sjFadeIn 0.3s ease forwards;
      }
      
      .sj-fade-out {
        animation: sjFadeOut 0.3s ease forwards;
      }
      
      @keyframes sjFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes sjFadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
    `
    document.head.appendChild(style)
  }

  /**
   * Get localized string
   * @param {string|object} value - Localized value
   * @returns {string} Resolved string
   */
  getText(value) {
    if (typeof value === 'string') return value
    if (typeof value === 'object') {
      return value[this.language] || value.en || Object.values(value)[0] || ''
    }
    return ''
  }

  /**
   * Create home screen
   * @returns {HTMLElement} Home screen element
   */
  createHomeScreen() {
    if (this.config.screenDesigner?.enabled) return this.createDesignedHome()

    const homeConfig = this.config.homeScreen || {}

    const screen = document.createElement('div')
    screen.className = 'sj-ui sj-screen sj-home-screen'
    screen.id = 'sj-home-screen'

    // Set background image (resolve paths)
    if (homeConfig.backgroundImage) {
      const isMobile = window.innerWidth < 768
      const mobileBg = this.resolveAssetPath(homeConfig.backgroundImage)
      const desktopBg = homeConfig.backgroundImageDesktop
        ? this.resolveAssetPath(homeConfig.backgroundImageDesktop)
        : mobileBg
      const bgImage = isMobile ? mobileBg : desktopBg
      screen.style.setProperty('--bg-image', `url(${bgImage})`)
    }

    // Add background image style
    const desktopBgUrl = homeConfig.backgroundImageDesktop
      ? `url(${this.resolveAssetPath(homeConfig.backgroundImageDesktop)})`
      : 'var(--bg-image)'
    const bgStyle = document.createElement('style')
    bgStyle.textContent = `
      #sj-home-screen::before {
        background-image: var(--bg-image);
      }
      @media (min-width: 768px) {
        #sj-home-screen::before {
          background-image: ${desktopBgUrl};
        }
      }
    `
    document.head.appendChild(bgStyle)

    // Language toggle
    if (this.projectConfig.languages?.length > 1) {
      const langToggle = this.createLanguageToggle()
      screen.appendChild(langToggle)
    }

    // Title
    if (homeConfig.title) {
      const title = document.createElement('h1')
      title.className = 'sj-title'
      title.textContent = this.getText(homeConfig.title)
      title.id = 'sj-title'
      screen.appendChild(title)
    }

    // Subtitle
    if (homeConfig.subtitle) {
      const subtitle = document.createElement('p')
      subtitle.className = 'sj-subtitle'
      subtitle.textContent = this.getText(homeConfig.subtitle)
      subtitle.id = 'sj-subtitle'
      screen.appendChild(subtitle)
    }

    // Start button
    const startBtn = document.createElement('button')
    startBtn.className = 'sj-button sj-button-primary'
    startBtn.textContent = this.getText(homeConfig.startButtonText) || 'Start'
    startBtn.id = 'sj-start-btn'
    startBtn.onclick = () => this.handleStart()
    screen.appendChild(startBtn)

    // Logo
    if (this.config.branding?.logo) {
      const logo = document.createElement('img')
      logo.className = 'sj-logo'
      logo.src = this.resolveAssetPath(this.config.branding.logo)
      logo.alt = 'Logo'
      screen.appendChild(logo)
    }

    this.elements.set('homeScreen', screen)
    this.container.appendChild(screen)

    return screen
  }

  /**
   * Create language toggle
   * @returns {HTMLElement} Language toggle element
   */
  createDesignedHome() {
    this.disposeDesignedHome?.()
    const design=this.config.screenDesigner, shell=document.createElement('div'), canvas=document.createElement('div')
    shell.id='sj-home-screen';shell.className='sj-ui';shell.style.cssText='position:absolute;inset:0;z-index:100;pointer-events:auto;'
    canvas.style.cssText='width:100%;height:100%';shell.appendChild(canvas)
    let screenId=design.homeScreenId, cleanup=()=>{}, launch={type:'start',mode:'auto'}
    const media=matchMedia('(max-width:767px)')
    this.drawDesignedHome=()=>{
      if(shell.classList.contains('sj-hidden'))return
      cleanup()
      const screen=resolveScreenTarget(design,screenId,launch.navigation||'explore')
      if(!screen)return
      screenId=screen.id;launch={...launch,...screenChoice(screen,launch)}
      const requestedPlatform=launch.mode!=='auto'?launch.mode:new URLSearchParams(window.location.search).get('mode')
      const mobileDevice=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||navigator.maxTouchPoints>1
      const platform=requestedPlatform||(mobileDevice&&this.projectConfig.modes?.includes('ar')?'ar':this.projectConfig.modes?.length===1?this.projectConfig.modes[0]:'3d')
      const requireStartGesture=platform==='vr'||(platform==='ar'&&this.projectConfig.ar?.backend!=='8thwall')
      cleanup=renderDesignedScreen(canvas,screen,{requireStartGesture,navigation:launch.navigation,language:this.language,mobile:media.matches,resolveAsset:p=>this.resolveAssetPath(p),onAction:action=>{
        launch=mergeLaunchChoice(launch,action)
        if(action.type==='choice'){this.drawDesignedHome()}
        else if(action.type==='language'){this.setLanguage(action.language)}
        else if(action.type==='screen'){screenId=action.screenId;this.drawDesignedHome();canvas.querySelector('button')?.focus()}
        else if(action.type==='link'){try{const url=new URL(action.url);if(['https:','http:'].includes(url.protocol))window.open(url.href,'_blank','noopener,noreferrer')}catch{}}
        else { cleanup(); this.onStart?.({mode:launch.mode,navigation:launch.navigation}) }
      }})
    }
    this.resetDesignedHome=()=>{launch={type:'start',mode:'auto'};screenId=design.homeScreenId;this.drawDesignedHome()}
    media.addEventListener('change',this.drawDesignedHome)
    this.disposeDesignedHome=()=>{media.removeEventListener('change',this.drawDesignedHome);cleanup();shell.remove()}
    this.elements.set('homeScreen',shell);this.container.appendChild(shell);this.drawDesignedHome()
    if(this.projectConfig.languages?.length>1&&!design.screens.some(s=>s.elements.some(e=>e.action?.type==='language')))shell.appendChild(this.createLanguageToggle())
    return shell
  }

  createLanguageToggle() {
    const toggle = document.createElement('div')
    toggle.className = 'sj-language-toggle'

    this.projectConfig.languages.forEach((lang) => {
      const btn = document.createElement('button')
      btn.className = `sj-lang-btn ${lang === this.language ? 'active' : ''}`
      btn.textContent = lang.toUpperCase()
      btn.onclick = () => this.setLanguage(lang)
      toggle.appendChild(btn)
    })

    this.elements.set('languageToggle', toggle)
    return toggle
  }

  /**
   * Create mode selection screen
   * @returns {HTMLElement} Mode selection element
   */
  createModeSelection() {
    const modes = this.projectConfig.modes || ['ar', '3d']

    const container = document.createElement('div')
    container.className = 'sj-mode-selection'
    container.id = 'sj-mode-selection'

    const modeLabels = {
      ar: { label: 'Phone AR' },
      vr: { label: 'Headset VR' },
      '3d': { icon: '🖥️', label: '3D Mode' },
      guided: { icon: '🎬', label: 'Guided' },
      exploration: { icon: '🔍', label: 'Exploration' }
    }

    modes.forEach((mode) => {
      const btn = document.createElement('button')
      btn.className = 'sj-mode-btn'
      btn.textContent = modeLabels[mode]?.label || mode
      btn.onclick = () => this.handleModeSelect(mode)
      container.appendChild(btn)
    })

    this.elements.set('modeSelection', container)
    return container
  }

  /**
   * Create control buttons (recenter, skip, etc.)
   * @returns {object} Control button elements
   */
  createControls() {
    const controls = {}
    const controlsConfig = this.config.controls || {}

    // Recenter button
    if (controlsConfig.showRecenter !== false) {
      const recenterBtn = document.createElement('button')
      recenterBtn.className = 'sj-control-btn sj-recenter-btn'
      recenterBtn.innerHTML = '⟲'
      recenterBtn.title = 'Recenter'
      recenterBtn.id = 'sj-recenter-btn'
      controls.recenter = recenterBtn
      this.elements.set('recenterBtn', recenterBtn)
    }

    // Skip button
    if (controlsConfig.showSkip !== false) {
      const skipBtn = document.createElement('button')
      skipBtn.className = 'sj-control-btn sj-skip-btn'
      skipBtn.innerHTML = '⏭'
      skipBtn.title = 'Skip'
      skipBtn.id = 'sj-skip-btn'
      controls.skip = skipBtn
      this.elements.set('skipBtn', skipBtn)
    }

    return controls
  }

  /**
   * Set language
   * @param {string} lang - Language code
   */
  setLanguage(lang) {
    this.language = lang

    // Update active button
    document.querySelectorAll('.sj-lang-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.textContent.toLowerCase() === lang)
    })

    // Update text content
    this.updateLocalizedText()

    // Callback
    if (this.onLanguageChange) {
      this.onLanguageChange(lang)
    }

    // Dispatch event
    document.dispatchEvent(
      new CustomEvent('languageChanged', { detail: { language: lang } })
    )
  }

  /**
   * Update all localized text
   */
  updateLocalizedText() {
    if (this.config.screenDesigner?.enabled) { this.drawDesignedHome?.(); return }
    const homeConfig = this.config.homeScreen || {}

    const title = document.getElementById('sj-title')
    if (title && homeConfig.title) {
      title.textContent = this.getText(homeConfig.title)
    }

    const subtitle = document.getElementById('sj-subtitle')
    if (subtitle && homeConfig.subtitle) {
      subtitle.textContent = this.getText(homeConfig.subtitle)
    }

    const startBtn = document.getElementById('sj-start-btn')
    if (startBtn) {
      startBtn.textContent = this.getText(homeConfig.startButtonText) || 'Start'
    }
  }

  /**
   * Handle start button click
   */
  handleStart() {
    if (this.onStart) {
      this.onStart()
    }
  }

  /**
   * Handle mode selection
   * @param {string} mode - Selected mode
   */
  handleModeSelect(mode) {
    if (this.onModeSelect) {
      this.onModeSelect(mode)
    }
  }

  /**
   * Show an element
   * @param {string} elementId - Element key
   */
  show(elementId) {
    const element = this.elements.get(elementId)
    if (element) {
      element.classList.remove('sj-hidden')
      if(elementId==='homeScreen')this.resetDesignedHome?.()
      element.classList.add('sj-fade-in')
    }
  }

  /**
   * Hide an element
   * @param {string} elementId - Element key
   */
  hide(elementId) {
    const element = this.elements.get(elementId)
    if (element) {
      element.querySelectorAll('video').forEach(video => video.pause())
      element.classList.add('sj-fade-out')
      setTimeout(() => {
        element.classList.add('sj-hidden')
        element.classList.remove('sj-fade-out')
      }, 300)
    }
  }

  /**
   * Remove an element
   * @param {string} elementId - Element key
   */
  remove(elementId) {
    const element = this.elements.get(elementId)
    if (element && element.parentNode) {
      element.parentNode.removeChild(element)
      this.elements.delete(elementId)
    }
  }

  /**
   * Show loading screen
   * @param {string} message - Loading message
   */
  showLoading(message = 'Loading...') {
    let loading = document.getElementById('sj-loading')
    if (!loading) {
      loading = document.createElement('div')
      loading.id = 'sj-loading'
      this.container.appendChild(loading)
    }
    // The standalone file picker reuses this container without progress markup.
    // Rebuild it when beginning playback instead of assuming a text node exists.
    let text = loading.querySelector('.sj-loading-text')
    if (!text) {
      const spinner = document.createElement('div')
      spinner.className = 'sj-loading-spinner'
      text = document.createElement('div')
      text.className = 'sj-loading-text'
      loading.replaceChildren(spinner, text)
    }
    loading.className = 'sj-loading'
    loading.style.display = 'flex'
    text.textContent = message
  }

  /**
   * Hide loading screen
   */
  hideLoading() {
    const loading = document.getElementById('sj-loading')
    if (loading) {
      loading.classList.add('sj-hidden')
    }
  }

  /**
   * Update loading progress
   * @param {number} progress - Progress (0-1)
   */
  updateLoadingProgress(progress) {
    const text = document.querySelector('.sj-loading-text')
    if (text) {
      text.textContent = `Loading... ${Math.round(progress * 100)}%`
    }
  }

  /**
   * Clean up UI
   */
  dispose() {
    this.disposeDesignedHome?.()
    this.disposeFonts?.()
    this.elements.forEach((element) => {
      if (element.parentNode) {
        element.parentNode.removeChild(element)
      }
    })
    this.elements.clear()

    // Remove injected styles
    const style = document.getElementById('sj-engine-styles')
    if (style) style.remove()
  }
}

export default UIManager
