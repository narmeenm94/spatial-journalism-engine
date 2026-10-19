import { useRef } from 'react'
import { useStore } from '../../state/store'
import type { SceneButtonConfig } from '../../state/types'
import { Vec3Input } from './Vec3Input'
import { chapterDuration } from '../../utils/playback'
import { Icon } from '../Icon'

export function SceneButtonProps() {
  const story = useStore(s => s.story), selection = useStore(s => s.selection), language = useStore(s => s.language)
  const assets = useStore(s => s.assetFiles)
  const fileInput = useRef<HTMLInputElement>(null)
  const chapter = story.scenes.find(s => s.id === selection.sceneId)
  const button = chapter?.sceneButtons?.find(b => b.id === selection.itemId)
  if (!button || !chapter) return null
  const update = (patch: Partial<SceneButtonConfig>) => useStore.getState().updateStory(d => {
    const b = d.scenes.find(s => s.id === chapter.id)?.sceneButtons?.find(b => b.id === button.id)
    if (b) Object.assign(b, patch)
  }, 'Edit scene button')
  const model = button.appearance === 'model'
  const paths = [...new Set([...Object.keys(story.embeddedAssets || {}), ...Object.keys(assets), ...(story.project.assets.preload || [])])].filter(p => model ? /\.glb$/i.test(p) : /\.(png|jpe?g|webp|svg)$/i.test(p))
  return <div className="scene-button-properties">
    <h3>Scene button</h3>
    <p className="form-hint">Place it in your space. Readers tap it to change chapters.</p>
    <div className="scene-button-presets" aria-label="Scene button appearance">
      {([['text','text','Text'],['sprite','image','Image'],['model','cube','3D model']] as const).map(([value,icon,label]) => <button key={value} className="btn" aria-pressed={button.appearance === value} onClick={() => update({appearance:value})}><Icon name={icon} size={24}/>{label}</button>)}
    </div>
    <label className="form-group">Label ({language})<input className="form-input" value={button.label[language] || ''} onChange={e => update({ label: {...button.label, [language]:e.target.value} })}/></label>
    {button.appearance !== 'text' && <div className="form-group">
      <label>{model ? 'Button model' : `Button image (${language})`}<select className="form-select" value={model ? button.model || '' : button.image?.[language] || ''} onChange={e => update(model ? {model:e.target.value} : {image:{...button.image,[language]:e.target.value}})}>
        <option value="">Choose media</option>
        {[...new Set([...paths, model ? button.model : button.image?.[language]])].filter(Boolean).map(path => <option key={path} value={path}>{path?.split('/').pop()}</option>)}
      </select></label>
      <button className="btn" onClick={() => fileInput.current?.click()}><Icon name="folder"/> Upload {model ? 'GLB model' : 'image'}</button>
      <input ref={fileInput} hidden type="file" accept={model ? '.glb' : 'image/png,image/jpeg,image/webp,image/svg+xml'} onChange={e => {
        const file = e.target.files?.[0]; if (!file) return
        const path = 'buttons/' + crypto.randomUUID() + '-' + file.name
        useStore.getState().addAssetFile(path, file)
        update(model ? {model:path} : {image:{...button.image,[language]:path}})
        e.target.value = ''
      }}/>
    </div>}
    <label className="form-group">Go to chapter<select className="form-select" value={button.targetScene || ''} onChange={e => update({targetScene:e.target.value || undefined})}>
      <option value="">Next chapter</option>{story.scenes.map(s => <option key={s.id} value={s.id}>{s.title[language] || s.id}{s.id === chapter.id ? ' (replay)' : ''}</option>)}
    </select></label>
    <label className="form-group">Show button<select className="form-select" value={button.showWhen} onChange={e => update({showWhen:e.target.value as SceneButtonConfig['showWhen']})}>
      <option value="start">From the start</option><option value="chapterEnd">When the chapter ends</option><option value="time">At a set time</option>
    </select></label>
    {button.showWhen === 'time' && <label className="form-group">Show at (seconds)<input className="form-input" type="number" min="0" step="0.1" value={button.showAt || 0} onChange={e => update({showAt:Math.max(0,Number(e.target.value))})}/></label>}
    {button.appearance === 'text' && <div className="scene-button-colors"><label>Text<input type="color" value={button.color || '#171717'} onChange={e => update({color:e.target.value})}/></label><label>Background<input type="color" value={button.backgroundColor || '#f3d85e'} onChange={e => update({backgroundColor:e.target.value})}/></label></div>}
    <label className="checkbox-label"><input type="checkbox" checked={!!button.pulse} onChange={e => update({pulse:e.target.checked})}/> Gentle pulse</label>
    {button.appearance==='sprite'&&<label className="checkbox-label"><input type="checkbox" checked={!!button.glow} onChange={e=>update({glow:e.target.checked})}/> Luminous image glow</label>}
    <details open><summary>Placement</summary><Vec3Input label="Position" value={button.position} onChange={position => update({position})}/>{model && <Vec3Input label="Rotation" value={button.rotation} step={0.1} onChange={rotation => update({rotation})}/>}<Vec3Input label="Scale" value={button.scale} step={0.1} onChange={scale => update({scale})}/></details>
    <button className="btn btn-primary" onClick={() => {
      const state = useStore.getState()
      state.setIsPlaying(false)
      state.setTimelinePosition(button.showWhen === 'chapterEnd' ? chapterDuration(chapter, story.camera.guided?.[chapter.id], state.mediaDurations) : button.showWhen === 'time' ? button.showAt || 0 : 0)
      state.setAudienceFullView(true)
      window.dispatchEvent(new Event('sj-audience-view'))
    }}><Icon name="play"/> Try in audience camera</button>
    <button className="btn" onClick={() => {
      useStore.getState().updateStory(d => { const c=d.scenes.find(s=>s.id===chapter.id); if(c)c.sceneButtons=c.sceneButtons?.filter(b=>b.id!==button.id) }, 'Remove scene button')
      useStore.getState().clearSelection()
    }}><Icon name="trash"/> Remove button</button>
  </div>
}
