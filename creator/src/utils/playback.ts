import type { SceneConfig, CameraKeyframe, CharacterConfig } from '../state/types'

export function characterOpacity(c: CharacterConfig, time: number): number {
  const t = time * 1000 - (c.delay || 0)
  const duration = c.duration > 0 ? c.duration : Infinity
  const fadeIn = c.fadeIn ?? 1000, fadeOut = c.fadeOut ?? 1000
  return Math.max(0, Math.min(t < 0 ? 0 : fadeIn > 0 ? t / fadeIn : 1,
    t < duration - fadeOut ? 1 : fadeOut > 0 ? (duration - t) / fadeOut : t < duration ? 1 : 0)) * (c.opacity ?? .7)
}

export function mediaAtTime(time: number, start: number, duration: number, intrinsic: number, loop = false) {
  const elapsed = time - start
  const end = duration > 0 ? duration : !loop && intrinsic > 0 ? intrinsic : Infinity
  return { active: elapsed >= 0 && elapsed < end,
    offset: Math.max(0, loop && intrinsic > 0 ? elapsed % intrinsic : Math.min(elapsed, intrinsic > 0 ? intrinsic : Infinity)) }
}

export function chapterDuration(scene: SceneConfig | undefined, camera: CameraKeyframe[] = [], media: Record<string, number> = {}) {
  if (!scene) return 10
  if (scene.duration && scene.duration > 0) return scene.duration
  return Math.max(10,
    ...scene.subtitles.map(s => s.end),
    ...scene.characters.filter(c => c.duration > 0).map(c => ((c.delay || 0) + c.duration) / 1000),
    ...scene.audio.filter(a => a.autoplay !== false && !a.loop).map(a => (a.delay || 0) / 1000 + (a.duration ? a.duration / 1000 : media[a.file] || 0)),
    ...scene.videos.filter(v => !v.loop).map(v => (v.triggerTime || 0) + (v.duration || media[v.url] || 0)),
    ...camera.map(k => k.time + (k.duration || 0) / 1000))
}

export function flickerMultiplier(time: number, flicker?: {triggerTime: number; duration: number; patterns: {duration: number; intensity: number}[]}) {
  if (!flicker) return 1
  const patterns = flicker.patterns.filter(p => p.duration > 0)
  const cycle = patterns.reduce((sum, p) => sum + p.duration, 0)
  const elapsed = (time - flicker.triggerTime) * 1000
  if (!cycle || elapsed < 0 || elapsed >= (flicker.duration > 0 ? flicker.duration * 1000 : cycle)) return 1
  let cursor = elapsed % cycle
  for (const p of patterns) { if (cursor < p.duration) return p.intensity; cursor -= p.duration }
  return 1
}
