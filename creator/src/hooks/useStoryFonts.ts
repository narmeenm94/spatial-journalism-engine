import { useEffect } from 'react'
import { installStoryFonts, storyFontFaces } from '../../../engine/src/ui/storyFonts'
import { useStore } from '../state/store'

export function useStoryFonts() {
  const branding = useStore(s => s.story.ui.branding)
  const embedded = useStore(s => s.story.embeddedAssets)
  const files = useStore(s => s.assetFiles)
  const base = useStore(s => s.assetsBaseUrl)
  const basePath = useStore(s => s.story.project.assets.basePath)
  useEffect(() => {
    const urls: Record<string,string> = {}
    for (const face of storyFontFaces(branding)) if (files[face.src]) urls[face.src] = URL.createObjectURL(files[face.src])
    const dispose = installStoryFonts(branding, path => urls[path] || embedded?.[path] || (/^(data:|blob:|https?:)/.test(path) ? path : base ? new URL((basePath || '') + path, base.endsWith('/') ? base : base + '/').href : ''))
    return () => { dispose(); for (const url of Object.values(urls)) URL.revokeObjectURL(url) }
  }, [branding.fonts, branding.fontFiles, branding.font, embedded, files, base, basePath])
}
