/** Portable typography, shared by the studio and the player. */
export function storyFontFaces(branding = {}) {
  const faces = (branding.fonts || []).flatMap(font => (font.files || []).map(file => ({ ...file, family: font.family })))
  const legacy = branding.fontFiles?.woff2 || branding.fontFiles?.woff
  if (legacy) faces.push({ family: (branding.font || 'CustomFont').split(',')[0].replace(/^["']|["']$/g, ''), src: legacy, weight: '400', style: 'normal' })
  return faces
}
export function installStoryFonts(branding, resolveAsset = path => path, onError = () => {}) {
  const installed = []
  let disposed = false
  if (typeof FontFace === 'undefined' || !document.fonts) return () => {}
  for (const config of storyFontFaces(branding)) {
    try {
      const src = resolveAsset(config.src)
      if (!src) continue
      const face = new FontFace(config.family, `url(${JSON.stringify(src)})`, {
        weight: config.weight || '400', style: config.style || 'normal', display: 'swap',
        ...(config.unicodeRange ? { unicodeRange: config.unicodeRange } : {})
      })
      document.fonts.add(face)
      installed.push(face)
      face.load().catch(() => { if (!disposed) onError(config.family) })
    } catch { onError(config.family) }
  }
  return () => { disposed = true; for (const face of installed) document.fonts.delete(face) }
}
