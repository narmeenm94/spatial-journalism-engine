import { localizedButtonValue } from './sceneButtons.js'

export function disposeButtonVisual(group) {
  const resources = new Set()
  group.traverse(object => {
    if (object.geometry) resources.add(object.geometry)
    for (const material of [].concat(object.material || [])) {
      resources.add(material)
      for (const value of Object.values(material)) if (value?.isTexture) resources.add(value)
    }
  })
  resources.forEach(resource => resource.dispose())
  group.clear()
}

/** Inject THREE so the studio and XR player use their own compatible runtime. */
export function createButtonVisual(T, config, { language = 'en', resolve = p => p, loadModel, onError = () => {} } = {}) {
  const group = new T.Group()
  let disposed = false
  const canvas = document.createElement('canvas')
  canvas.width = 768; canvas.height = 256
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = config.backgroundColor || '#f3d85e'
  ctx.fillRect(0, 0, 768, 256)
  ctx.fillStyle = config.color || '#171717'
  ctx.font = '500 54px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(localizedButtonValue(config.label, language) || 'Continue', 384, 128, 704)
  const texture = new T.CanvasTexture(canvas)
  const material = new T.SpriteMaterial({ map: texture, transparent: true, depthTest: config.depthTest !== false, depthWrite: false })
  material.toneMapped = false
  const sprite = new T.Sprite(material)
  sprite.scale.set(3, 1, 1)
  group.add(sprite)
  const setColorSpace = t => { if (T.SRGBColorSpace) t.colorSpace = T.SRGBColorSpace; else t.encoding = T.sRGBEncoding }
  setColorSpace(texture)
  const path = localizedButtonValue(config.image, language)
  const ready = (async () => {
    if (config.appearance === 'model' && config.model) {
      const model = await loadModel(resolve(config.model))
      if (disposed) { disposeButtonVisual(model); return }
      disposeButtonVisual(group); group.add(model)
    } else if (config.appearance === 'sprite' && path) {
      const image = await new T.TextureLoader().loadAsync(resolve(path))
      if (disposed) { image.dispose(); return }
      setColorSpace(image)
      texture.dispose(); material.map = image; material.needsUpdate = true
      if(config.glow){const glow=new T.Sprite(new T.SpriteMaterial({map:image,transparent:true,blending:T.AdditiveBlending,depthTest:config.depthTest!==false,depthWrite:false}));glow.material.toneMapped=false;glow.scale.set((image.image.width/image.image.height)*1.008,1.017,1);group.add(glow)}
      sprite.scale.set((image.image.width || 3) / (image.image.height || 1), 1, 1)
    }
  })().catch(error => { if (!disposed) onError(error) })
  return { group, ready, dispose() { disposed = true; disposeButtonVisual(group) } }
}
