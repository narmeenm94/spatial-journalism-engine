/**
 * Central Zustand store for the Spatial Journalism Creator
 * Holds the full story JSON structure with undo/redo support
 */

import { create } from 'zustand'
import { produce, enablePatches, applyPatches, type Patch } from 'immer'
import { v4 as uuid } from 'uuid'
import { mediaType } from '../utils/media.ts'
import type {
  StoryConfig,
  EditorState,
  Selection,
  TransformMode,
  CharacterConfig,
  VideoConfig,
  SubtitleEntry,
  InteractiveObjectConfig,
  SpotlightConfig,
  CameraKeyframe,
  AudioConfig
} from './types'

enablePatches()

// ── Default Story ──
function createDefaultStory(): StoryConfig {
  return {
    project: {
      title: 'Untitled Story',
      version: '1.0',
      languages: ['en'],
      defaultLanguage: 'en',
      modes: ['3d'],
      assets: {
        basePath: 'assets/',
        environment: '',
        preload: []
      }
    },
    environment: {
      scale: 1,
      position: [0, 0, 0]
    },
    camera: {
      initialPosition: [0, 1.6, 3],
      initialRotation: [0, 0, 0],
      moveSpeed: 0.005,
      rotateSpeed: 0.003,
      bounds: { minX: -5, maxX: 5, minY: -1, maxY: 5, minZ: -5, maxZ: 5 },
      buffer: 0.5,
      recenterPosition: [0, 1.6, 3],
      recenterRotation: [0, 0, 0],
      guided: {}
    },
    lighting: {
      ambient: { color: '0x404040', intensity: 0.5 },
      directional: { color: '0xffffff', intensity: 0.8, position: [5, 10, 5] },
      hemisphere: {
        skyColor: '0xffffff',
        groundColor: '0x444444',
        intensity: 0.4
      }
    },
    rendering: {
      toneMapping: 'ACESFilmic',
      toneMappingExposure: 1.4,
      fog: { type: 'exponential', color: '0xcccccc', density: 0.15 }
    },
    particles: {
      enabled: false,
      count: 2000,
      color: '0xcccccc',
      size: 0.005,
      opacity: 0.3,
      blending: 'AdditiveBlending',
      area: { minX: -2, maxX: 2, minY: -1.5, maxY: 1.5, minZ: 0, maxZ: 4 },
      animation: {
        rotateY: 0.0001,
        driftY: { speed: 0.0005, resetThreshold: 3, resetPosition: 1 }
      }
    },
    scenes: [
      {
        id: 'scene1',
        title: { en: 'Scene 1' },
        audio: [],
        subtitles: [],
        characters: [],
        videos: [],
        lighting: {}
      }
    ],
    ending: {
      video: '',
      text: { en: '' },
      quotes: [],
      buttons: {},
      triggerMode: 'audioEnd'
    },
    ui: {
      homeScreen: {
        title: { en: 'Untitled Story' },
        subtitle: { en: '' },
        backgroundImage: '',
        backgroundImageDesktop: '',
        startButton: { en: 'Begin Experience' }
      },
      branding: {
        logo: '',
        primaryColor: '#24665b',
        font: 'sans-serif',
        fontFiles: { woff2: '', woff: '' }
      },
      controls: {
        exploration: { en: 'Exploration' },
        guided: { en: 'Guided' }
      },
      modes: {
        exploration: { en: 'Explore freely' },
        guided: { en: 'Guided tour' }
      }
    },
    interactableObjects: []
  }
}

// ── Undo/Redo History ──
interface HistoryEntry {
  patches: Patch[]
  inversePatches: Patch[]
  description: string
}

interface UndoState {
  past: HistoryEntry[]
  future: HistoryEntry[]
}

// ── Store Actions ──
interface EditorActions {
  // Story mutations
  updateStory: (
    updater: (draft: StoryConfig) => void,
    description?: string
  ) => void
  setStory: (story: StoryConfig) => void
  resetStory: () => void

  // Selection
  setSelection: (sel: Selection) => void
  clearSelection: () => void
  setTransformMode: (mode: TransformMode) => void

  // Scene management
  setActiveScene: (sceneId: string | null) => void
  addScene: () => void
  removeScene: (sceneId: string) => void
  reorderScenes: (fromIndex: number, toIndex: number) => void

  // Character management
  addCharacter: (sceneId: string) => void
  removeCharacter: (sceneId: string, charId: string) => void
  updateCharacter: (
    sceneId: string,
    charId: string,
    updates: Partial<CharacterConfig>
  ) => void

  // Video management
  addVideo: (sceneId: string) => void
  removeVideo: (sceneId: string, videoId: string) => void
  updateVideo: (
    sceneId: string,
    videoId: string,
    updates: Partial<VideoConfig>
  ) => void

  // Subtitle management
  addSubtitle: (sceneId: string) => void
  removeSubtitle: (sceneId: string, subId: string) => void
  updateSubtitle: (
    sceneId: string,
    subId: string,
    updates: Partial<SubtitleEntry>
  ) => void

  // Interactive objects
  addSceneButton: (sceneId: string) => void
  addInteractiveObject: () => void
  removeInteractiveObject: (objId: string) => void
  updateInteractiveObject: (
    objId: string,
    updates: Partial<InteractiveObjectConfig>
  ) => void

  // Spotlight management
  addSpotlight: (sceneId: string) => void
  removeSpotlight: (sceneId: string, spotId: string) => void
  updateSpotlight: (
    sceneId: string,
    spotId: string,
    updates: Partial<SpotlightConfig>
  ) => void

  // Camera keyframes
  addCameraKeyframe: (sceneId: string, pose?: Partial<CameraKeyframe>) => void
  removeCameraKeyframe: (sceneId: string, kfId: string) => void
  updateCameraKeyframe: (
    sceneId: string,
    kfId: string,
    updates: Partial<CameraKeyframe>
  ) => void

  // Audio management
  addAudio: (sceneId: string) => void
  removeAudio: (sceneId: string, audioId: string) => void
  updateAudio: (
    sceneId: string,
    audioId: string,
    updates: Partial<AudioConfig>
  ) => void

  // Timeline
  setTimelinePosition: (time: number) => void
  stopPlayback: () => void
  setMediaDuration: (path: string, duration: number) => void
  setPlaybackLoading: (id: string, path: string | null) => void
  setPlaybackIssue: (id: string, issue: string | null) => void
  setIsPlaying: (playing: boolean) => void

  // UI state
  setLanguage: (lang: string) => void
  setShowGrid: (show: boolean) => void
  setShowAxes: (show: boolean) => void
  setShowBounds: (show: boolean) => void
  setAudienceFullView: (full: boolean) => void
  setShowCameraPiP: (show: boolean) => void
  setShowCameraPath: (show: boolean) => void
  setLeftPanelWidth: (w: number) => void
  setRightPanelWidth: (w: number) => void
  setBottomPanelHeight: (h: number) => void

  // Undo/Redo
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean

  // Asset management
  addAssetFile: (name: string, file: File) => void
  removeAssetFile: (name: string) => void
  setAssetsBaseUrl: (url: string) => void
  clearAssetFiles: () => void
}

type Store = EditorState & EditorActions & { _history: UndoState }

// ── Create Store ──
export const useStore = create<Store>((set, get) => {
  // Helper to find a scene by ID
  const findScene = (story: StoryConfig, sceneId: string) =>
    story.scenes.find((s) => s.id === sceneId)

  return {
    // Initial state
    story: createDefaultStory(),
    dirty: false,

    activeSceneId: 'scene1',
    selection: { type: 'none' },
    transformMode: 'translate',
    timelinePosition: 0,
    isPlaying: false,
    playbackPreview: false,
    audienceFullView: false,
    mediaDurations: {},
    playbackIssues: {},
    playbackLoading: {},
    language: 'en',

    leftPanelWidth: 260,
    rightPanelWidth: 300,
    bottomPanelHeight: 200,
    showGrid: true,
    showAxes: false,
    showBounds: false,
    showCameraPiP: false,
    showCameraPath: true,
    previewCameraPath: false,

    assetFiles: {},
    assetsBaseUrl: '',

    _history: { past: [], future: [] },

    // ── Story mutations with undo/redo ──
    updateStory: (updater, description = 'Edit') => {
      const state = get()
      let patches: Patch[] = []
      let inversePatches: Patch[] = []

      const nextStory = produce(
        state.story,
        (draft) => {
          updater(draft)
        },
        (p, ip) => {
          patches = p
          inversePatches = ip
        }
      )

      if (!patches.length) return
      set({
        story: nextStory,
        language: nextStory.project.languages.includes(state.language)
          ? state.language
          : nextStory.project.defaultLanguage,
        dirty: true,
        _history: {
          past: [
            ...state._history.past.slice(-50),
            { patches, inversePatches, description }
          ],
          future: []
        }
      })
    },

    setStory: (story) => {
      set({
        story,
        language: story.project.defaultLanguage || 'en',
        assetFiles: {},
        assetsBaseUrl: '',
        timelinePosition: 0,
        isPlaying: false,
    playbackPreview: false,
    audienceFullView: false,
    mediaDurations: {},
    playbackIssues: {},
    playbackLoading: {},
        dirty: false,
        activeSceneId: story.scenes[0]?.id || null,
        selection: { type: 'none' },
        _history: { past: [], future: [] }
      })
    },

    resetStory: () => {
      set({
        story: createDefaultStory(),
        language: 'en',
        assetFiles: {},
        assetsBaseUrl: '',
        timelinePosition: 0,
        isPlaying: false,
    playbackPreview: false,
    audienceFullView: false,
    mediaDurations: {},
    playbackIssues: {},
    playbackLoading: {},
        dirty: false,
        activeSceneId: 'scene1',
        selection: { type: 'none' },
        _history: { past: [], future: [] }
      })
    },

    // ── Selection ──
    setSelection: (sel) => set({ selection: sel }),
    clearSelection: () => set({ selection: { type: 'none' } }),
    setTransformMode: (mode) => set({ transformMode: mode }),

    // ── Scene management ──
    setActiveScene: (sceneId) =>
      set({
        activeSceneId: sceneId,
        selection: { type: 'none' },
        timelinePosition: 0,
        isPlaying: false, playbackPreview: get().audienceFullView
      }),

    addScene: () => {
      const state = get()
      let num = state.story.scenes.length + 1
      while (state.story.scenes.some((scene) => scene.id === `scene${num}`))
        num++
      const newId = `scene${num}`
      state.updateStory((draft) => {
        draft.scenes.push({
          id: newId,
          title: { en: `Scene ${num}` },
          audio: [],
          subtitles: [],
          characters: [],
          videos: [],
          lighting: {}
        })
      }, `Add scene ${num}`)
      set({ activeSceneId: newId })
    },

    removeScene: (sceneId) => {
      const state = get()
      if (state.story.scenes.length <= 1) return
      state.updateStory((draft) => {
        draft.scenes = draft.scenes.filter((s) => s.id !== sceneId)
        for (const scene of draft.scenes)
          if (scene.nextScene === sceneId) delete scene.nextScene
        for (const scene of draft.scenes) for (const button of scene.sceneButtons || [])
          if (button.targetScene === sceneId) delete button.targetScene
        if (draft.camera.guided) delete draft.camera.guided[sceneId]
        if (draft.ending.triggerSceneId === sceneId)
          delete draft.ending.triggerSceneId
      }, `Remove scene ${sceneId}`)
      set((s) => ({
        selection: { type: 'none' },
        activeSceneId:
          s.activeSceneId === sceneId
            ? s.story.scenes[0]?.id || null
            : s.activeSceneId
      }))
    },

    reorderScenes: (fromIndex, toIndex) => {
      get().updateStory((draft) => {
        const [moved] = draft.scenes.splice(fromIndex, 1)
        draft.scenes.splice(toIndex, 0, moved)
      }, 'Reorder scenes')
    },

    // ── Character management ──
    addCharacter: (sceneId) => {
      const charId = `char-${uuid().slice(0, 8)}`
      get().updateStory((draft) => {
        const scene = findScene(draft, sceneId)
        if (!scene) return
        scene.characters.push({
          id: charId,
          model: '',
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          animation: null,
          opacity: 0.7,
          delay: 0,
          duration: 0,
          fadeIn: 3000,
          fadeOut: 1000
        })
      }, 'Add character')
      set({ selection: { type: 'character', sceneId, itemId: charId } })
    },

    removeCharacter: (sceneId, charId) => {
      get().updateStory((draft) => {
        const scene = findScene(draft, sceneId)
        if (!scene) return
        scene.characters = scene.characters.filter((c) => c.id !== charId)
      }, 'Remove character')
      set({ selection: { type: 'none' } })
    },

    updateCharacter: (sceneId, charId, updates) => {
      get().updateStory((draft) => {
        const scene = findScene(draft, sceneId)
        if (!scene) return
        const char = scene.characters.find((c) => c.id === charId)
        if (!char) return
        Object.assign(char, updates)
      }, 'Update character')
    },

    // ── Video management ──
    addVideo: (sceneId) => {
      const videoId = `video-${uuid().slice(0, 8)}`
      get().updateStory((draft) => {
        const scene = findScene(draft, sceneId)
        if (!scene) return
        scene.videos.push({
          id: videoId,
          url: '',
          position: [0, 0, -2],
          rotation: [0, 0, 0],
          size: [2, 1.5],
          triggerTime: 0,
          duration: 30
        })
      }, 'Add video')
      set({ selection: { type: 'video', sceneId, itemId: videoId } })
    },

    removeVideo: (sceneId, videoId) => {
      get().updateStory((draft) => {
        const scene = findScene(draft, sceneId)
        if (!scene) return
        scene.videos = scene.videos.filter((v) => v.id !== videoId)
      }, 'Remove video')
      set({ selection: { type: 'none' } })
    },

    updateVideo: (sceneId, videoId, updates) => {
      get().updateStory((draft) => {
        const scene = findScene(draft, sceneId)
        if (!scene) return
        const vid = scene.videos.find((v) => v.id === videoId)
        if (!vid) return
        Object.assign(vid, updates)
      }, 'Update video')
    },

    // ── Subtitle management ──
    addSubtitle: (sceneId) => {
      const subId = `sub-${uuid().slice(0, 8)}`
      get().updateStory((draft) => {
        const scene = findScene(draft, sceneId)
        if (!scene) return
        const lastSub = scene.subtitles[scene.subtitles.length - 1]
        scene.subtitles.push({
          id: subId,
          start: lastSub ? lastSub.end : 0,
          end: lastSub ? lastSub.end + 3 : 3,
          text: { en: '' }
        })
      }, 'Add subtitle')
    },

    removeSubtitle: (sceneId, subId) => {
      get().updateStory((draft) => {
        const scene = findScene(draft, sceneId)
        if (!scene) return
        scene.subtitles = scene.subtitles.filter((s) => s.id !== subId)
      }, 'Remove subtitle')
    },

    updateSubtitle: (sceneId, subId, updates) => {
      get().updateStory((draft) => {
        const scene = findScene(draft, sceneId)
        if (!scene) return
        const sub = scene.subtitles.find((s) => s.id === subId)
        if (!sub) return
        Object.assign(sub, updates)
      }, 'Update subtitle')
    },

    addSceneButton: (sceneId) => {
      const id = `button-${uuid().slice(0, 8)}`
      get().updateStory(d => {
        const scene = findScene(d, sceneId)
        if (!scene) return
        const p = d.camera.initialPosition, [x, y] = d.camera.initialRotation
        const e = d.environment.position, scale = d.environment.scale || 1
        scene.sceneButtons ??= []
        scene.sceneButtons.push({
          id, label: { [d.project.defaultLanguage]: 'Continue' }, appearance: 'text',
          position: [(p[0] - 2 * Math.sin(y) - e[0]) / scale, (p[1] + 2 * Math.sin(x) * Math.cos(y) - e[1]) / scale, (p[2] - 2 * Math.cos(x) * Math.cos(y) - e[2]) / scale],
          rotation: [0, 0, 0], scale: [0.25 / scale, 0.25 / scale, 0.25 / scale],
          showWhen: 'start', pulse: true, depthTest: true,
          color: '#171717', backgroundColor: '#f3d85e'
        })
      }, 'Add scene button')
      set({ playbackPreview: false, isPlaying: false, audienceFullView: false, selection: { type: 'sceneButton', sceneId, itemId: id } })
    },

    // ── Interactive objects ──
    addInteractiveObject: () => {
      const objId = `obj-${uuid().slice(0, 8)}`
      get().updateStory((draft) => {
        if (!draft.interactableObjects) draft.interactableObjects = []
        draft.interactableObjects.push({
          id: objId,
          name: { en: 'New Object' },
          model: '',
          original: {
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1]
          },
          transformed: {
            position: [0, 1, 0],
            rotation: [0, 0, 0],
            scale: [2, 2, 2]
          },
          hasInfoBox: false,
          infoBoxMessage: { en: '' },
          enableRotation: false
        })
      }, 'Add interactive object')
      set({ selection: { type: 'interactiveObject', itemId: objId } })
    },

    removeInteractiveObject: (objId) => {
      get().updateStory((draft) => {
        if (!draft.interactableObjects) return
        draft.interactableObjects = draft.interactableObjects.filter(
          (o) => o.id !== objId
        )
      }, 'Remove interactive object')
      set({ selection: { type: 'none' } })
    },

    updateInteractiveObject: (objId, updates) => {
      get().updateStory((draft) => {
        if (!draft.interactableObjects) return
        const obj = draft.interactableObjects.find((o) => o.id === objId)
        if (!obj) return
        Object.assign(obj, updates)
      }, 'Update interactive object')
    },

    // ── Spotlight management ──
    addSpotlight: (sceneId) => {
      const spotId = `spot-${uuid().slice(0, 8)}`
      get().updateStory((draft) => {
        const scene = findScene(draft, sceneId)
        if (!scene) return
        if (!scene.lighting.spotlights) scene.lighting.spotlights = []
        scene.lighting.spotlights.push({
          id: spotId,
          position: [0, 3, 0],
          target: [0, 0, 0],
          color: '0xffffff',
          intensity: 1,
          angle: 0.5,
          penumbra: 0.5,
          volumetric: false
        })
      }, 'Add spotlight')
      set({ selection: { type: 'spotlight', sceneId, itemId: spotId } })
    },

    removeSpotlight: (sceneId, spotId) => {
      get().updateStory((draft) => {
        const scene = findScene(draft, sceneId)
        if (!scene || !scene.lighting.spotlights) return
        scene.lighting.spotlights = scene.lighting.spotlights.filter(
          (s) => s.id !== spotId
        )
      }, 'Remove spotlight')
      set({ selection: { type: 'none' } })
    },

    updateSpotlight: (sceneId, spotId, updates) => {
      get().updateStory((draft) => {
        const scene = findScene(draft, sceneId)
        if (!scene || !scene.lighting.spotlights) return
        const spot = scene.lighting.spotlights.find((s) => s.id === spotId)
        if (!spot) return
        Object.assign(spot, updates)
      }, 'Update spotlight')
    },

    // ── Camera keyframes ──
    addCameraKeyframe: (sceneId, pose = {}) => {
      const kfId = `kf-${uuid().slice(0, 8)}`
      get().updateStory((draft) => {
        if (!draft.camera.guided) draft.camera.guided = {}
        if (!draft.camera.guided[sceneId]) draft.camera.guided[sceneId] = []
        const existing = draft.camera.guided[sceneId]
        const lastTime =
          existing.length > 0
            ? Math.max(...existing.map((k) => k.time)) + 10
            : 0
        existing.push({
          time: lastTime,
          position: [...draft.camera.initialPosition],
          rotation: [...draft.camera.initialRotation],
          duration: 2000,
          easing: 'quadratic',
          ...pose,
          id: kfId
        })
      }, 'Add camera keyframe')
      set({ selection: { type: 'cameraKeyframe', sceneId, itemId: kfId } })
    },

    removeCameraKeyframe: (sceneId, kfId) => {
      get().updateStory((draft) => {
        if (!draft.camera.guided?.[sceneId]) return
        draft.camera.guided[sceneId] = draft.camera.guided[sceneId].filter(
          (k) => k.id !== kfId
        )
      }, 'Remove camera keyframe')
      set({ selection: { type: 'none' } })
    },

    updateCameraKeyframe: (sceneId, kfId, updates) => {
      get().updateStory((draft) => {
        if (!draft.camera.guided?.[sceneId]) return
        const kf = draft.camera.guided[sceneId].find((k) => k.id === kfId)
        if (!kf) return
        Object.assign(kf, updates)
      }, 'Update camera keyframe')
    },

    // ── Audio management ──
    addAudio: (sceneId) => {
      const audioId = `audio-${uuid().slice(0, 8)}`
      get().updateStory((draft) => {
        const scene = findScene(draft, sceneId)
        if (!scene) return
        scene.audio.push({
          id: audioId,
          file: '',
          positional: false,
          volume: 1,
          loop: false,
          autoplay: true,
          delay: 0,
          duration: 0
        })
      }, 'Add audio')
      set({ selection: { type: 'audio', sceneId, itemId: audioId } })
    },

    removeAudio: (sceneId, audioId) => {
      get().updateStory((draft) => {
        const scene = findScene(draft, sceneId)
        if (!scene) return
        scene.audio = scene.audio.filter((a) => a.id !== audioId)
      }, 'Remove audio')
      set({ selection: { type: 'none' } })
    },

    updateAudio: (sceneId, audioId, updates) => {
      get().updateStory((draft) => {
        const scene = findScene(draft, sceneId)
        if (!scene) return
        const audio = scene.audio.find((a) => a.id === audioId)
        if (!audio) return
        Object.assign(audio, updates)
      }, 'Update audio')
    },

    // ── Timeline ──
    setTimelinePosition: (time) => set({ timelinePosition: Number.isFinite(time) ? Math.max(0, time) : 0, playbackPreview: true }),
    setIsPlaying: (playing) => set(playing ? { isPlaying: true, playbackPreview: true, showCameraPiP: true } : { isPlaying: false }),
    stopPlayback: () => set({ isPlaying: false, playbackPreview: false, audienceFullView: false, timelinePosition: 0 }),
    setMediaDuration: (path, duration) => { if (Number.isFinite(duration) && duration > 0 && get().mediaDurations[path] !== duration) set({ mediaDurations: { ...get().mediaDurations, [path]: duration } }) },
    setPlaybackLoading: (id, path) => {
      if ((get().playbackLoading[id] || null) === path) return
      const loading = { ...get().playbackLoading }
      if (path) loading[id] = path; else delete loading[id]
      set({ playbackLoading: loading })
    },
    setPlaybackIssue: (id, issue) => {
      if ((get().playbackIssues[id] || null) === issue) return
      const issues = { ...get().playbackIssues }
      if (issue) issues[id] = issue; else delete issues[id]
      set({ playbackIssues: issues })
    },

    // ── UI state ──
    setLanguage: (lang) => set({ language: lang }),
    setShowGrid: (show) => set({ showGrid: show }),
    setShowAxes: (show) => set({ showAxes: show }),
    setShowBounds: (show) => set({ showBounds: show }),
    setAudienceFullView: (full) => set(full ? { audienceFullView: true, showCameraPiP: true, playbackPreview: true } : { audienceFullView: false }),
    setShowCameraPiP: (show) => set({ showCameraPiP: show }),
    setShowCameraPath: (show) => set({ showCameraPath: show }),
    setLeftPanelWidth: (w) => set({ leftPanelWidth: w }),
    setRightPanelWidth: (w) => set({ rightPanelWidth: w }),
    setBottomPanelHeight: (h) => set({ bottomPanelHeight: h }),

    // ── Undo / Redo ──
    undo: () => {
      const state = get()
      const { past, future } = state._history
      if (past.length === 0) return
      const last = past[past.length - 1]
      const restoredStory = applyPatches(state.story, last.inversePatches)
      set({
        story: restoredStory,
        dirty: true,
        selection: { type: 'none' },
        activeSceneId: restoredStory.scenes.some(
          (s) => s.id === state.activeSceneId
        )
          ? state.activeSceneId
          : restoredStory.scenes[0]?.id || null,
        _history: {
          past: past.slice(0, -1),
          future: [last, ...future]
        }
      })
    },

    redo: () => {
      const state = get()
      const { past, future } = state._history
      if (future.length === 0) return
      const next = future[0]
      const restoredStory = applyPatches(state.story, next.patches)
      set({
        story: restoredStory,
        dirty: true,
        selection: { type: 'none' },
        activeSceneId: restoredStory.scenes.some(
          (s) => s.id === state.activeSceneId
        )
          ? state.activeSceneId
          : restoredStory.scenes[0]?.id || null,
        _history: {
          past: [...past, next],
          future: future.slice(1)
        }
      })
    },

    canUndo: () => get()._history.past.length > 0,
    canRedo: () => get()._history.future.length > 0,

    // ── Asset management ──
    addAssetFile: (name, file) => {
      set((state) => ({
        assetFiles: {
          ...state.assetFiles,
          [name]: new File([file], file.name, {
            type: mediaType(name, file.type)
          })
        }
      }))
    },
    removeAssetFile: (name) => {
      set((state) => {
        const { [name]: _, ...rest } = state.assetFiles
        return { assetFiles: rest }
      })
    },
    setAssetsBaseUrl: (url) => set({ assetsBaseUrl: url }),
    clearAssetFiles: () => set({ assetFiles: {} })
  }
})
