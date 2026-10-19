import { ToolTemplates } from '../ToolTemplates'
import { useStore } from '../../state/store'
import { Vec3Input } from './Vec3Input'
import type { StoryConfig } from '../../state/types'
export function SoundscapeEditor() {
  const story = useStore(s => s.story), files = useStore(s => s.assetFiles)
  const entries = story.ambience || []
  const paths = [...new Set([...Object.keys(files), ...Object.keys(story.embeddedAssets || {}), ...story.project.assets.preload, ...story.scenes.flatMap(s => s.audio.map(a => a.file)), ...entries.map(a => a.file)])].filter(p => /\.(mp3|wav|ogg|m4a)$/i.test(p))
  const edit = (fn: (d: StoryConfig) => void) => useStore.getState().updateStory(fn, 'Edit soundscape')
  return <div className="feature-editor">
      <ToolTemplates tool="soundscape"/><h3>Give the space a sound</h3><p>These sounds continue across chapters. Place ambience in the room, or connect a sound to an object that readers inspect. Positions use the environment model’s coordinates.</p>
    <button className="btn" onClick={() => edit(d => { (d.ambience ||= []).push({id:crypto.randomUUID(),file:paths[0] || '',volume:.3,loop:true,positional:true,autoplay:true,position:[0,1,0],refDistance:2,maxDistance:30,rolloffFactor:1}) })}>Add ambient sound</button>
    {!entries.length && <p>Add an audio file in Media library, then choose it here.</p>}
    {entries.map((entry,i) => { const update = (patch: Partial<typeof entry>) => edit(d => { Object.assign(d.ambience![i],patch) }); return <fieldset className="feature-item" key={entry.id}><legend>Sound {i+1}</legend>
      <label>Audio file<select className="form-select" aria-label={'Soundscape file '+(i+1)} value={entry.file} onChange={e => update({file:e.target.value})}><option value="">Choose audio</option>{paths.map(p => <option key={p}>{p}</option>)}</select></label>
      <label className="btn">Upload audio<input type="file" accept="audio/*" hidden onChange={e => { const f=e.target.files?.[0]; if(f) { const path='audio/'+f.name; useStore.getState().addAssetFile(path,f); update({file:path}) } }} /></label>
      <label>Play when<select className="form-select" value={entry.objectId || ''} onChange={e => update({objectId:e.target.value || undefined,autoplay:!e.target.value})}><option value="">The story is playing</option>{(story.interactableObjects || []).map(o => <option key={o.id} value={o.id}>{o.name[useStore.getState().language] || o.id} is inspected</option>)}</select></label>
      <label>Volume<input className="form-input" type="number" min="0" max="3" step="0.05" value={entry.volume} onChange={e => update({volume:Math.max(0,Math.min(3,Number(e.target.value)))})}/></label>
      <label><input type="checkbox" checked={entry.loop} onChange={e => update({loop:e.target.checked})}/> Loop</label>
      <label><input type="checkbox" checked={entry.positional} onChange={e => update({positional:e.target.checked})}/> Sound comes from a position</label>
      {entry.positional && <><Vec3Input label="Position in model" value={entry.position || [0,0,0]} onChange={position => update({position})}/><label>Full-volume distance<input className="form-input" type="number" min="0.1" step="0.5" value={entry.refDistance ?? 2} onChange={e => update({refDistance:Math.max(.1,Number(e.target.value))})}/></label><label>Distance falloff<input className="form-input" type="number" min="0" step="0.1" value={entry.rolloffFactor ?? 1} onChange={e => update({rolloffFactor:Math.max(0,Number(e.target.value))})}/></label></>}
      <button className="btn quiet" onClick={() => edit(d => { d.ambience!.splice(i,1) })}>Remove sound {i+1}</button>
    </fieldset> })}
  </div>
}
