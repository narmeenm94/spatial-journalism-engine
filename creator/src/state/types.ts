/**
 * Core types for the Spatial Journalism Engine Creator
 * Mirrors the story.json schema structure
 */

// ── Vector / Transform ──
export interface Vec3 {
  x: number
  y: number
  z: number
}

// ── Project ──
export interface ProjectConfig {
  title: string
  version: string
  languages: string[]
  defaultLanguage: string
  modes: string[]
  assets: {
    basePath: string
    environment: string
    preload: string[]
  }
}

// ── Environment ──
export interface EnvironmentConfig {
  scale: number
  position: [number, number, number]
}

// ── Camera ──
export interface CameraKeyframe {
  id: string
  time: number
  position: [number, number, number]
  rotation: [number, number, number]
  duration: number
  easing: 'quadratic' | 'cubic' | 'sine'
}

export interface CameraConfig {
  initialPosition: [number, number, number]
  initialRotation: [number, number, number]
  moveSpeed: number
  rotateSpeed: number
  bounds: {
    minX: number
    maxX: number
    minY: number
    maxY: number
    minZ: number
    maxZ: number
  }
  buffer: number
  recenterPosition: [number, number, number]
  recenterRotation: [number, number, number]
  guided?: Record<string, CameraKeyframe[]>
}

// ── Lighting ──
export interface LightConfig {
  color: string
  intensity: number
  position?: [number, number, number]
}

export interface GlobalLighting {
  ambient: LightConfig
  directional: LightConfig & { position: [number, number, number] }
  hemisphere?: { skyColor: string; groundColor: string; intensity: number }
}

// ── Subtitle ──
export interface SubtitleEntry {
  id: string
  start: number
  end: number
  text: Record<string, string>
}

// ── Character ──
export interface CharacterConfig {
  id: string
  model: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  animation: string | null
  opacity: number
  delay: number       // ms — when the character begins to fade in
  duration: number    // ms — total visible time (from delay to fade-out end); 0 = until scene ends
  fadeIn: number      // ms — fade-in transition length
  fadeOut: number     // ms — fade-out transition length
}

// ── Video ──
export interface VideoConfig {
  id: string
  url: string
  position: [number, number, number]
  rotation: [number, number, number]
  size: [number, number]
  triggerTime: number    // seconds — when the video starts
  duration: number       // seconds — playback duration; 0 = play to end
  opacity?: number
  loop?: boolean
  muted?: boolean
  multiWall?: boolean
  walls?: Array<{
    position: [number, number, number]
    rotation: [number, number, number]
    size?: [number, number]
  }>
}

// ── Audio ──
export interface AudioConfig {
  id: string
  file: string
  positional: boolean
  volume: number
  loop: boolean
  autoplay?: boolean
  delay?: number         // ms — when the audio starts playing
  duration?: number      // ms — playback duration; 0 = play to end
  position?: [number, number, number]
  refDistance?: number
  maxDistance?: number
  waypoints?: Array<{
    time: number
    position: [number, number, number]
  }>
}

// ── Interactive Object ──
export interface InteractiveObjectConfig {
  id: string
  name: Record<string, string>
  model: string
  original: {
    position: [number, number, number]
    rotation: [number, number, number]
    scale: [number, number, number]
  }
  transformed: {
    position: [number, number, number]
    rotation: [number, number, number]
    scale: [number, number, number]
  }
  hasInfoBox: boolean
  infoBoxMessage: Record<string, string>
  enableRotation: boolean
}

// ── Lighting Effects ──
export interface SpotlightConfig {
  id: string
  position: [number, number, number]
  target: [number, number, number]
  color: string
  intensity: number
  angle: number
  penumbra: number
  volumetric: boolean
}

export interface WalkingTourWaypoint {
  id: string
  time: number
  position: [number, number, number]
  intensity: number
  text?: Record<string, string>
}

export interface FlickerConfig {
  triggerTime: number
  duration: number
  patterns: Array<{ intensity: number; duration: number }>
}

export interface SceneLighting {
  modifiers?: {
    ambient?: number
    directional?: number
    hemisphere?: number
  }
  spotlights?: SpotlightConfig[]
  walkingTour?: {
    waypoints: WalkingTourWaypoint[]
    dimLights: { ambient: number; directional: number; hemisphere: number }
    endLights: { ambient: number; directional: number; hemisphere: number }
    guidanceText?: Record<string, string>
  }
  flicker?: FlickerConfig
}

// ── Static Object (e.g., chair) ──
export interface StaticObjectConfig {
  id: string
  model: string
  position: [number, number, number]
  rotation?: [number, number, number]
  scale?: number | [number, number, number]
}

// ── Particle ──
export interface ParticleConfig {
  enabled: boolean
  count: number
  color: string
  size: number
  opacity: number
  blending: string
  area: {
    minX: number; maxX: number
    minY: number; maxY: number
    minZ: number; maxZ: number
  }
  animation: {
    rotateY: number
    driftY: { speed: number; resetThreshold: number; resetPosition: number }
  }
}

// ── Rendering ──
export interface RenderingConfig {
  toneMapping: string
  toneMappingExposure: number
  fog?: {
    type: string
    color: string
    density: number
  }
}

// ── Scene ──
export interface SceneConfig {
  id: string
  title: Record<string, string>
  audio: AudioConfig[]
  subtitles: SubtitleEntry[]
  characters: CharacterConfig[]
  videos: VideoConfig[]
  lighting: SceneLighting
  interactiveObjects?: InteractiveObjectConfig[]
  activateInteractionOutlines?: boolean
  nextScene?: string
  objects?: StaticObjectConfig[]
}

// ── Ending ──
export interface EndingConfig {
  video: string
  text: Record<string, string>
  quotes: Array<Record<string, string>>
  buttons: {
    learnMore?: { url: string } & Record<string, string>
    returnHome?: Record<string, string>
  }
  triggerMode: 'lastVideo' | 'characterFade' | 'audioEnd'
  triggerCharacterId?: string
  triggerSceneId?: string
  endingTrigger?: string
}

// ── UI Branding ──
export interface UIConfig {
  homeScreen: {
    title: Record<string, string>
    subtitle: Record<string, string>
    backgroundImage: string
    backgroundImageDesktop: string
    startButton: Record<string, string>
  }
  branding: {
    logo: string
    primaryColor: string
    font: string
    fontFiles: {
      woff2: string
      woff: string
    }
  }
  controls: {
    exploration: Record<string, string>
    guided: Record<string, string>
  }
  modes: {
    exploration: Record<string, string>
    guided: Record<string, string>
  }
}

// ── Full Story ──
export interface StoryConfig {
  project: ProjectConfig
  environment: EnvironmentConfig
  camera: CameraConfig
  lighting: GlobalLighting
  rendering?: RenderingConfig
  particles?: ParticleConfig
  scenes: SceneConfig[]
  ending: EndingConfig
  ui: UIConfig
  interactableObjects?: InteractiveObjectConfig[]
}

// ── Editor State ──
export type SelectionType =
  | 'none'
  | 'environment'
  | 'camera'
  | 'character'
  | 'video'
  | 'light'
  | 'audio'
  | 'interactiveObject'
  | 'spotlight'
  | 'cameraKeyframe'
  | 'particle'

export interface Selection {
  type: SelectionType
  sceneId?: string
  itemId?: string
}

export type TransformMode = 'translate' | 'rotate' | 'scale'

export interface EditorState {
  // Story data
  story: StoryConfig
  dirty: boolean

  // Editor state
  activeSceneId: string | null
  selection: Selection
  transformMode: TransformMode
  timelinePosition: number
  isPlaying: boolean
  language: string

  // UI state
  leftPanelWidth: number
  rightPanelWidth: number
  bottomPanelHeight: number
  showGrid: boolean
  showAxes: boolean
  showBounds: boolean
  showCameraPath: boolean

  // Asset management
  assetFiles: Record<string, File>
  assetsBaseUrl: string
}
