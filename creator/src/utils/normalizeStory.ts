/**
 * Normalize an externally-loaded story.json into the internal StoryConfig format.
 * Handles differences between the engine's JSON schema and the editor's internal types.
 *
 * Key mappings:
 *  - scene.name → scene.title
 *  - audio.url → audio.file
 *  - video.triggerAt → video.triggerTime
 *  - subtitles: per-language array → merged multilingual objects
 *  - character.scale: number → [n, n, n]
 *  - scene.lighting.effects → flicker / walkingTour
 *  - scene.lighting.spotlight (singular) → spotlights[]
 */

import { resolveEndingTrigger } from '../../../engine/src/core/storyChecks.js'
import type { StoryConfig } from '../state/types'

export function normalizeStory(raw: any): StoryConfig {
  if (
    !raw ||
    typeof raw !== 'object' ||
    Array.isArray(raw) ||
    !raw.project ||
    typeof raw.project.title !== 'string' ||
    !Array.isArray(raw.scenes) ||
    raw.scenes.length === 0
  ) {
    throw new Error('Invalid story JSON')
  }

  const languages: string[] = raw.project?.languages?.length
    ? raw.project.languages
    : ['en']
  const ids = new Set<string>()
  for (const scene of raw.scenes) {
    if (
      !scene ||
      typeof scene.id !== 'string' ||
      !scene.id ||
      ids.has(scene.id)
    )
      throw new Error('Each chapter needs a unique ID.')
    ids.add(scene.id)
  }

  return {
    ...raw,
    formatVersion: '1.1',
    project: normalizeProject(raw.project),
    environment: normalizeEnvironment(raw.environment),
    camera: normalizeCamera(raw.camera),
    lighting: normalizeLighting(raw.lighting),
    rendering: normalizeRendering(raw.rendering),
    particles: normalizeParticles(raw.particles),
    scenes: (raw.scenes || []).map((s: any) => normalizeScene(s, languages)),
    ending: normalizeEnding(raw.ending, raw.formatVersion),
    ui: normalizeUI(raw.ui),
    interactableObjects: (raw.interactableObjects || []).map(
      normalizeInteractiveObject
    )
  }
}

// ── Project ──

function normalizeProject(raw: any) {
  return {
    ...raw,
    title: raw?.title || 'Untitled Story',
    version: raw?.version || '1.0',
    languages: raw?.languages || ['en'],
    defaultLanguage: raw?.defaultLanguage || 'en',
    modes: raw?.modes || ['3d'],
    assets: {
      ...raw?.assets,
      basePath: raw?.assets?.basePath ?? 'assets/',
      environment: raw?.assets?.environment || '',
      preload: raw?.assets?.preload || []
    }
  }
}

// ── Environment ──

function normalizeEnvironment(raw: any) {
  return {
    ...raw,
    scale: raw?.scale ?? 1,
    position: toVec3(raw?.position, [0, 0, 0])
  }
}

// ── Camera ──

function normalizeCamera(raw: any) {
  return {
    ...raw,
    initialPosition: toVec3(raw?.initialPosition, [0, 1.6, 3]),
    initialRotation: toVec3(raw?.initialRotation, [0, 0, 0]),
    moveSpeed: raw?.moveSpeed ?? 0.005,
    rotateSpeed: raw?.rotateSpeed ?? 0.003,
    bounds: raw?.bounds || {
      minX: -5,
      maxX: 5,
      minY: -1,
      maxY: 5,
      minZ: -5,
      maxZ: 5
    },
    buffer: raw?.buffer ?? 0.5,
    recenterPosition: toVec3(raw?.recenterPosition, [0, 1.6, 3]),
    recenterRotation: toVec3(raw?.recenterRotation, [0, 0, 0]),
    guided: raw?.guided || {}
  }
}

// ── Global Lighting ──

function normalizeLighting(raw: any) {
  return {
    ...raw,
    ambient: {
      ...raw?.ambient,
      color: raw?.ambient?.color || '0x404040',
      intensity: raw?.ambient?.intensity ?? 0.5
    },
    directional: {
      ...raw?.directional,
      color: raw?.directional?.color || '0xffffff',
      intensity: raw?.directional?.intensity ?? 0.8,
      position: toVec3(raw?.directional?.position, [5, 10, 5])
    },
    hemisphere: raw?.hemisphere
      ? {
          ...raw.hemisphere,
          skyColor: raw.hemisphere.skyColor || '0xffffff',
          groundColor: raw.hemisphere.groundColor || '0x444444',
          intensity: raw.hemisphere.intensity ?? 0.4
        }
      : undefined
  }
}

// ── Rendering ──

function normalizeRendering(raw: any) {
  if (!raw) return undefined
  return {
    ...raw,
    toneMapping: raw.toneMapping || 'ACESFilmic',
    toneMappingExposure: raw.toneMappingExposure ?? 1.4,
    fog: raw.fog
      ? {
          ...raw.fog,
          type: raw.fog.type || 'exponential',
          color: raw.fog.color || '0xcccccc',
          density: raw.fog.density ?? 0.15
        }
      : undefined
  }
}

// ── Particles ──

function normalizeParticles(raw: any) {
  if (!raw) return undefined
  return {
    ...raw,
    enabled: raw.enabled !== false,
    count: raw.count ?? 2000,
    color: raw.color || '0xcccccc',
    size: raw.size ?? 0.005,
    opacity: raw.opacity ?? 0.3,
    blending: raw.blending || 'AdditiveBlending',
    area: normalizeParticleArea(raw.area),
    animation: {
      ...raw.animation,
      rotateY: raw.animation?.rotateY ?? raw.animation?.rotationSpeed ?? 0.0001,
      driftY: {
        ...raw.animation?.driftY,
        speed:
          raw.animation?.driftY?.speed ?? raw.animation?.driftSpeed ?? 0.0005,
        resetThreshold:
          raw.animation?.driftY?.resetThreshold ??
          raw.animation?.resetHeight ??
          3,
        resetPosition:
          raw.animation?.driftY?.resetPosition ??
          raw.animation?.resetToHeight ??
          1
      }
    }
  }
}

function normalizeParticleArea(raw: any) {
  if (!raw)
    return { minX: -2, maxX: 2, minY: -1.5, maxY: 1.5, minZ: 0, maxZ: 4 }
  // Old format: width/height/depth + offsets
  if (raw.width !== undefined && raw.minX === undefined) {
    const hw = raw.width / 2
    const hh = (raw.height || 1.5) / 2
    const hd = (raw.depth || 4) / 2
    const ox = raw.offsetX || 0
    const oy = raw.offsetY || 0
    const oz = raw.offsetZ || 0
    return {
      minX: ox - hw,
      maxX: ox + hw,
      minY: oy - hh * 2,
      maxY: oy,
      minZ: oz,
      maxZ: oz + hd * 2
    }
  }
  // New format with min/max
  return {
    ...raw,
    minX: raw.minX ?? -2,
    maxX: raw.maxX ?? 2,
    minY: raw.minY ?? -1.5,
    maxY: raw.maxY ?? 1.5,
    minZ: raw.minZ ?? 0,
    maxZ: raw.maxZ ?? 4
  }
}

// ── Scene ──

function normalizeScene(raw: any, languages: string[]) {
  // Audio: handle both single-object and array formats
  let audioArr: any[]
  if (Array.isArray(raw.audio)) {
    audioArr = raw.audio.map((a: any, i: number) =>
      normalizeAudio(a, `${raw.id}-${i}`)
    )
  } else if (raw.audio && (raw.audio.url || raw.audio.file)) {
    audioArr = [normalizeAudio(raw.audio, raw.id)]
  } else {
    audioArr = []
  }

  return {
    ...raw,
    id: raw.id || 'unknown',
    title: localize(
      raw.title ?? raw.name ?? raw.id ?? 'Untitled',
      languages[0]
    ),
    audio: audioArr,
    subtitles: normalizeSubtitles(raw.subtitles, languages),
    characters: (raw.characters || []).map(normalizeCharacter),
    videos: (raw.videos || []).map(normalizeVideo),
    lighting: normalizeSceneLighting(raw.lighting),
    activateInteractionOutlines: raw.activateInteractionOutlines,
    nextScene: raw.nextScene,
    objects: raw.objects?.map((o: any) => ({
      ...o,
      position: toVec3(o.position, [0, 0, 0]),
      rotation: toVec3(o.rotation, [0, 0, 0]),
      scale:
        typeof o.scale === 'number'
          ? [o.scale, o.scale, o.scale]
          : toVec3(o.scale, [1, 1, 1])
    }))
  }
}

// ── Audio ──

function normalizeAudio(raw: any, sceneId: string) {
  if (!raw)
    return {
      id: `audio-${sceneId}`,
      file: '',
      positional: false,
      volume: 1,
      loop: false
    }
  return {
    ...raw,
    id: raw.id || `audio-${sceneId}`,
    file: raw.file ?? raw.url ?? '',
    positional: raw.positional || false,
    volume: raw.volume ?? 1,
    loop: raw.loop || false,
    autoplay: raw.autoplay,
    delay: raw.delay,
    duration: raw.duration, // ms; undefined = play to end
    position: raw.position,
    refDistance: raw.refDistance,
    maxDistance: raw.maxDistance,
    waypoints: raw.waypoints
  }
}

// ── Subtitles ──
// External: { "en": [{start, end, text}], "fi": [{start, end, text}] }
// Internal: [{id, start, end, text: {en: "...", fi: "..."}}]

function normalizeSubtitles(raw: any, languages: string[]) {
  if (!raw) return []

  // Already in internal format (array)
  if (Array.isArray(raw)) {
    return raw.map((s: any, i: number) => ({
      id: s.id || `sub-${i}`,
      start: s.start || 0,
      end: s.end || 0,
      ...s,
      text: localize(s.text, languages[0])
    }))
  }

  const cues: any[] = []
  for (const [language, entries] of Object.entries(raw)) {
    if (!Array.isArray(entries))
      throw new Error('Captions must be a list for each language.')
    entries.forEach((entry: any, i: number) => {
      const existing = cues.find(
        (c) =>
          c.start === entry.start &&
          c.end === entry.end &&
          !(language in c.text)
      )
      if (existing) existing.text[language] = entry.text
      else
        cues.push({
          ...entry,
          id: 'sub-' + language + '-' + i,
          text: { [language]: entry.text }
        })
    })
  }
  return cues.sort((a, b) => a.start - b.start || a.end - b.end)
}

function localize(value: any, language = 'en') {
  return typeof value === 'string' ? { [language]: value } : value || {}
}

// ── Character ──

function normalizeCharacter(raw: any) {
  const scale =
    typeof raw.scale === 'number'
      ? ([raw.scale, raw.scale, raw.scale] as [number, number, number])
      : toVec3(raw.scale, [1, 1, 1])

  return {
    ...raw,
    id: raw.id || 'unnamed',
    model: raw.model || '',
    position: toVec3(raw.position, [0, 0, 0]),
    rotation: toVec3(raw.rotation, [0, 0, 0]),
    scale,
    animation: raw.animation || null,
    opacity: raw.opacity ?? 0.7,
    delay: raw.delay || 0,
    duration: raw.duration || 0, // 0 = until scene ends
    fadeIn: raw.fadeIn ?? raw.fadeInDuration ?? 3000,
    fadeOut: raw.fadeOut ?? raw.fadeOutDuration ?? 1000
  }
}

// ── Video ──

function normalizeVideo(raw: any) {
  return {
    ...raw,
    id: raw.id || 'unnamed',
    url: raw.url || '',
    position: toVec3(raw.position, [0, 0, -2]),
    rotation: toVec3(raw.rotation, [0, 0, 0]),
    size: (raw.size || [2, 1.5]) as [number, number],
    triggerTime: raw.triggerTime ?? raw.triggerAt ?? 0,
    duration: raw.duration ?? 0, // seconds; default 30 s
    opacity: raw.opacity,
    loop: raw.loop,
    muted: raw.muted,
    multiWall: raw.multiWall,
    walls: raw.walls
  }
}

// ── Scene Lighting ──

function normalizeSceneLighting(raw: any) {
  if (!raw) return {}
  const result: any = { ...raw }

  if (raw.modifiers) result.modifiers = raw.modifiers

  // Singular spotlight → spotlights array
  if (raw.spotlight && !raw.spotlights) {
    result.spotlights = [
      {
        ...raw.spotlight,
        legacyVolumetricOnly: true,
        id: `spot-main`,
        position: toVec3(raw.spotlight.position, [0, 3, 0]),
        target: toVec3(raw.spotlight.target, [0, 0, 0]),
        color: raw.spotlight.color || '0xffffff',
        intensity: raw.spotlight.intensity ?? 1,
        angle: raw.spotlight.angle ?? 0.5,
        penumbra: raw.spotlight.penumbra ?? 0.5,
        volumetric: raw.spotlight.volumetric || false
      }
    ]
  }
  if (raw.spotlights) result.spotlights = raw.spotlights

  // Effects array → flicker / walkingTour
  if (Array.isArray(raw.effects)) {
    for (const effect of raw.effects) {
      if (effect.type === 'flicker' && !raw.flicker) {
        result.flicker = {
          ...effect,
          triggerTime: effect.triggerTime ?? 0,
          duration: effect.duration ?? 5,
          patterns: effect.patterns || []
        }
      }
      if (effect.type === 'walkingTour' && !raw.walkingTour) {
        result.walkingTour = {
          ...effect,
          waypoints: (effect.waypoints || []).map((wp: any, i: number) => ({
            ...wp,
            id: wp.id || `wt-${i}`,
            time: wp.time,
            position: toVec3(wp.position, [0, 0, 0]),
            intensity: wp.intensity ?? 1
          })),
          dimLights: effect.dimLights || {
            ambient: 0.05,
            directional: 0.2,
            hemisphere: 0.02
          },
          endLights: effect.endLights || {
            ambient: 0.25,
            directional: 0.5,
            hemisphere: 0.05
          },
          guidanceText: effect.guidanceText
        }
      }
    }
  }

  // Already-normalized fields pass through
  if (raw.flicker && !result.flicker) result.flicker = raw.flicker
  if (raw.walkingTour && !result.walkingTour)
    result.walkingTour = raw.walkingTour

  return result
}

// ── Ending ──

function normalizeEnding(raw: any, formatVersion?: string) {
  if (!raw)
    return {
      ...raw,
      video: '',
      text: { en: '' },
      quotes: [],
      buttons: {},
      triggerMode: 'audioEnd' as const
    }
  return {
    ...raw,
    video: raw.video || '',
    text: localize(raw.text),
    quotes: (raw.quotes || []).map((q: any) => localize(q)),
    buttons: raw.buttons || {},
    triggerMode: resolveEndingTrigger(raw, formatVersion),
    triggerCharacterId: raw.triggerCharacterId,
    triggerSceneId: raw.triggerSceneId,
    endingTrigger: raw.endingTrigger
  }
}

// ── UI ──

function normalizeUI(raw: any) {
  if (!raw) return defaultUI()
  return {
    ...raw,
    homeScreen: {
      ...raw.homeScreen,
      title: localize(raw.homeScreen?.title ?? 'Untitled'),
      subtitle: localize(raw.homeScreen?.subtitle),
      backgroundImage: raw.homeScreen?.backgroundImage || '',
      backgroundImageDesktop: raw.homeScreen?.backgroundImageDesktop || '',
      startButton: localize(
        raw.homeScreen?.startButton ??
          raw.homeScreen?.startButtonText ??
          'Begin'
      )
    },
    branding: {
      ...raw.branding,
      logo: raw.branding?.logo || '',
      primaryColor: raw.branding?.primaryColor || '#00B7FF',
      font: raw.branding?.font || 'sans-serif',
      fontFiles: raw.branding?.fontFiles || { woff2: '', woff: '' }
    },
    controls: {
      ...raw.controls,
      exploration:
        typeof raw.controls?.exploration === 'object'
          ? raw.controls.exploration
          : { en: 'Exploration' },
      guided:
        typeof raw.controls?.guided === 'object'
          ? raw.controls.guided
          : { en: 'Guided' }
    },
    modes: {
      ...raw.modes,
      exploration: raw.modes?.exploration || { en: 'Explore freely' },
      guided: raw.modes?.guided || { en: 'Guided tour' }
    }
  }
}

function defaultUI() {
  return {
    homeScreen: {
      title: { en: 'Untitled Story' },
      subtitle: { en: '' },
      backgroundImage: '',
      backgroundImageDesktop: '',
      startButton: { en: 'Begin Experience' }
    },
    branding: {
      logo: '',
      primaryColor: '#00B7FF',
      font: 'sans-serif',
      fontFiles: { woff2: '', woff: '' }
    },
    controls: { exploration: { en: 'Exploration' }, guided: { en: 'Guided' } },
    modes: {
      exploration: { en: 'Explore freely' },
      guided: { en: 'Guided tour' }
    }
  }
}

// ── Interactive Objects ──

function normalizeInteractiveObject(raw: any) {
  return {
    ...raw,
    id: raw.id || 'unnamed',
    name: localize(raw.name ?? raw.id),
    model: raw.model || '',
    original: {
      ...raw.original,
      position: toVec3(raw.original?.position, [0, 0, 0]),
      rotation: toVec3(raw.original?.rotation, [0, 0, 0]),
      scale: toVec3(raw.original?.scale, [1, 1, 1])
    },
    transformed: {
      ...raw.transformed,
      position: toVec3(raw.transformed?.position, [0, 1, 0]),
      rotation: toVec3(raw.transformed?.rotation, [0, 0, 0]),
      scale: toVec3(raw.transformed?.scale, [2, 2, 2])
    },
    hasInfoBox: raw.hasInfoBox || false,
    infoBoxMessage: localize(raw.infoBoxMessage),
    enableRotation: raw.enableRotation || false
  }
}

// ── Helpers ──

function toVec3(
  val: any,
  fallback: [number, number, number]
): [number, number, number] {
  if (!val) return fallback
  if (Array.isArray(val) && val.length >= 3) return [val[0], val[1], val[2]]
  return fallback
}
