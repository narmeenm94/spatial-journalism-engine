import { screenDesignMedia } from '../../../engine/src/ui/screenDesign.js'
import type { StoryConfig } from '../state/types'
export function mediaPaths(story: StoryConfig): string[] {
  const paths: unknown[] = [
    story.project.assets.environment,
    story.ui?.controls?.recenterIcon,
    story.ui?.controls?.skipIcon,
    ...screenDesignMedia(story.ui?.screenDesigner),
    ...(story.ambience || []).map(a => a.file),
    ...(story.project.ar?.imageTargets || []).map((target) => target.imagePath),
    ...(story.project.assets.preload || []),
    story.ending?.video,
    story.ui?.homeScreen?.backgroundImage,
    story.ui?.homeScreen?.backgroundImageDesktop,
    story.ui?.branding?.logo,
    ...(story.ui?.branding?.fonts || []).flatMap(font => font.files.map(file => file.src)),
    ...Object.values(story.ui?.branding?.fontFiles || {})
  ]
  for (const scene of story.scenes) {
    paths.push(
      ...(scene.sceneButtons || []).flatMap(b => [b.model, ...Object.values(b.image || {})]),
      ...scene.audio.map((a) => a.file),
      ...scene.characters.map((c) => c.model),
      ...(scene.objects || []).map((o) => o.model),
      ...scene.videos.map((v) => v.url)
    )
  }
  paths.push(...(story.interactableObjects || []).map((o) => o.model))
  return [
    ...new Set(
      paths.filter((p): p is string => typeof p === 'string' && p.length > 0)
    )
  ]
}
export function mediaType(path: string, fallback = 'application/octet-stream') {
  const ext = path.split('?')[0].split('.').pop()?.toLowerCase() || ''
  return (
    (
      {
        glb: 'model/gltf-binary',
        gltf: 'model/gltf+json',
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
        ogg: 'audio/ogg',
        mp4: 'video/mp4',
        webm: 'video/webm',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        svg: 'image/svg+xml',
        woff: 'font/woff',
        woff2: 'font/woff2',
        ttf: 'font/ttf',
        otf: 'font/otf'
      } as Record<string, string>
    )[ext] || fallback
  )
}
