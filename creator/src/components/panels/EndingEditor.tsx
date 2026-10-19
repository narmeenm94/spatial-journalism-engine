import { EndingSequencePreview } from './EndingSequencePreview'
import { cinematicDefaults, type CinematicSettings } from '../../../../engine/src/ui/cinematicEnding.js'
import { ToolTemplates } from '../ToolTemplates'
/**
 * Ending Editor - Configure the ending sequence of the experience
 */
import { useStore } from '../../state/store'

export function EndingEditor() {
  const story = useStore((s) => s.story)
  const language = useStore((s) => s.language)
  const updateStory = useStore((s) => s.updateStory)

  const ending = story.ending

  return (
    <div style={{ padding: 12, overflow: 'auto', height: '100%' }}>
      <ToolTemplates tool="ending"/>
      <h4 style={{ color: 'var(--accent)', marginBottom: 12 }}>Ending Sequence</h4>

      <div className="segmented" aria-label="Ending presentation">{(['readable','cinematic'] as const).map(kind=><button key={kind} aria-pressed={(ending.presentation||'readable')===kind} onClick={()=>updateStory(d=>{d.ending.presentation=kind},'Choose ending presentation')}>{kind==='readable'?'Readable page':'Cinematic sequence'}</button>)}</div>
      {ending.presentation==='cinematic'&&<>
        <p className="form-hint">Fade to black, reveal your closing words, then let each quote have its moment.</p>
        <EndingSequencePreview/>
        <details className="designer-precision"><summary>Sequence timing</summary>
          {([['fadeIn','Fade to black'],['textDelay','Wait before text'],['textDuration','Read the closing text'],['textFade','Text fade'],['quoteFade','Quote fade'],['videoDelay','Video delay after text'],['actionsDelay','Wait before final buttons']] as const).map(([key,label])=><label className="form-group" key={key}>{label} (seconds)<input className="form-input" type="number" min="0" max="300" step="0.5" value={ending.cinematic?.[key]??cinematicDefaults[key]} onChange={e=>updateStory(d=>{d.ending.cinematic={...d.ending.cinematic,[key]:Math.max(0,Math.min(300,Number(e.target.value)))}})}/></label>)}
          <label className="form-group">Show ending film<select className="form-select" value={ending.cinematic?.videoOn||'all'} onChange={e=>updateStory(d=>{d.ending.cinematic={...d.ending.cinematic,videoOn:e.target.value as CinematicSettings['videoOn']}})}><option value="all">All screens</option><option value="mobile">Phone layout only</option><option value="none">Text and quotes only</option></select></label>
          <label><input type="checkbox" checked={ending.cinematic?.muted!==false} onChange={e=>updateStory(d=>{d.ending.cinematic={...d.ending.cinematic,muted:e.target.checked}})}/> Silent background film</label>
        </details>
      </>}
      {/* Trigger mode */}
      <div className="form-group">
        <label className="form-label">Trigger Mode</label>
        <select
          className="form-select"
          value={ending.triggerMode}
          onChange={(e) =>
            updateStory((d) => {
              d.ending.triggerMode = e.target.value as any
            }, 'Change ending trigger')
          }
        >
          <option value="lastVideo">When last video ends</option>
          <option value="audioEnd">When audio ends</option>
          <option value="characterFade">When character fades out</option>
        </select>
      </div>

      <div className="form-group"><label className="form-label">Ending chapter</label><select className="form-select" aria-label="Ending chapter" value={ending.triggerSceneId || story.scenes.at(-1)?.id || ''} onChange={e => updateStory(d => { d.ending.triggerSceneId=e.target.value; d.ending.triggerCharacterId=undefined }, 'Set ending chapter')}>
      {story.scenes.map(scene => <option key={scene.id} value={scene.id}>{scene.title[language] || scene.id}</option>)}</select></div>
      {ending.triggerMode==='characterFade' && <div className="form-group"><label className="form-label">Character to wait for</label><select className="form-select" aria-label="Ending character" value={ending.triggerCharacterId || ''} onChange={e => updateStory(d => { d.ending.triggerCharacterId=e.target.value }, 'Set ending character')}><option value="">Choose a character</option>{(story.scenes.find(s => s.id===(ending.triggerSceneId || story.scenes.at(-1)?.id))?.characters || []).map(c => <option key={c.id} value={c.id}>{c.id}</option>)}</select><p>Give this character a finite duration and fade-out in Properties. A character set to stay for the whole chapter cannot trigger its own ending.</p></div>}
      {ending.triggerMode==='characterFade'&&<details className="designer-precision"><summary>Fade trigger timing</summary><label className="form-group">Begin when opacity reaches<input className="form-input" aria-label="Ending opacity threshold" type="number" min="0" max="1" step=".01" value={ending.triggerOpacity||0} onChange={e=>updateStory(d=>{d.ending.triggerOpacity=Math.max(0,Math.min(1,Number(e.target.value)))})}/></label><label className="form-group">Wait after fade (seconds)<input className="form-input" aria-label="Ending trigger delay" type="number" min="0" max="300" step=".5" value={(ending.triggerDelay||0)/1000} onChange={e=>updateStory(d=>{d.ending.triggerDelay=Math.max(0,Math.min(300,Number(e.target.value)))*1000})}/></label></details>}
      {/* Video */}
      <div className="form-group">
        <label className="form-label">Ending Video (path)</label>
        <input
          className="form-input"
          value={ending.video}
          onChange={(e) =>
            updateStory((d) => {
              d.ending.video = e.target.value
            }, 'Set ending video')
          }
          placeholder="video/ending.mp4"
        />
      </div>

      {/* Text */}
      <div className="form-group">
        <label className="form-label">Ending Text ({language})</label>
        <textarea
          className="form-input"
          rows={3}
          value={ending.text[language] || ''}
          onChange={(e) =>
            updateStory((d) => {
              d.ending.text[language] = e.target.value
            }, 'Set ending text')
          }
          placeholder="Final message shown to the viewer…"
        />
      </div>

      {/* Quotes */}
      <hr style={{ borderColor: 'var(--border-color)', margin: '12px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h5 style={{ color: 'var(--text-secondary)', margin: 0 }}>Quotes ({ending.quotes.length})</h5>
        <button
          className="btn btn-sm"
          onClick={() =>
            updateStory((d) => {
              d.ending.quotes.push({ en: '' })
            }, 'Add quote')
          }
        >
          + Add
        </button>
      </div>
      {ending.quotes.map((quote, i) => (
        <div key={i} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
          <input
            className="form-input"
            style={{ flex: 1 }}
            value={quote[language] || ''}
            placeholder={`Quote ${i + 1} (${language})`}
            onChange={(e) =>
              updateStory((d) => {
                d.ending.quotes[i][language] = e.target.value
              })
            }
          />
          <button
            className="btn-icon btn-sm"
            onClick={() =>
              updateStory((d) => {
                d.ending.quotes.splice(i, 1);d.ending.cinematic?.quoteTimings?.splice(i,1)
              }, 'Remove quote')
            }
          >
            ×
          </button>
          {ending.presentation==='cinematic'&&<div style={{display:'flex',gap:4}}>{(['hold','gap'] as const).map(key=><label key={key} style={{fontSize:12}}>{key==='hold'?'Read':'Gap'}<input className="form-input" aria-label={'Quote '+(i+1)+' '+key+' seconds'} style={{width:70}} type="number" min={key==='hold'?.1:0} max="300" step=".5" value={ending.cinematic?.quoteTimings?.[i]?.[key]??(key==='hold'?4:2)} onChange={e=>updateStory(d=>{d.ending.cinematic={...d.ending.cinematic};const timings=d.ending.cinematic.quoteTimings||d.ending.quotes.map(()=>({hold:4,gap:2}));timings[i]={...(timings[i]||{hold:4,gap:2}),[key]:Math.max(key==='hold'?.1:0,Math.min(300,Number(e.target.value)))};d.ending.cinematic.quoteTimings=timings})}/></label>)}</div>}
        </div>
      ))}

      <label className="checkbox-label"><input type="checkbox" checked={!!ending.returnToTitle} onChange={e=>updateStory(d=>{d.ending.returnToTitle=e.target.checked})}/> Return to the title screen after the ending</label>
      {/* Buttons */}
      <hr style={{ borderColor: 'var(--border-color)', margin: '12px 0' }} />
      <h5 style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>Ending Buttons</h5>

      <div className="form-group">
        <label className="form-label">Learn More URL</label>
        <input
          className="form-input"
          value={ending.buttons?.learnMore?.url || ''}
          onChange={(e) =>
            updateStory((d) => {
              if (!d.ending.buttons) d.ending.buttons = {}
              if (!d.ending.buttons.learnMore) d.ending.buttons.learnMore = { url: '' }
              d.ending.buttons.learnMore.url = e.target.value
            })
          }
          placeholder="https://..."
        />
      </div>

      <div className="form-group">
        <label className="form-label">Learn More Label ({language})</label>
        <input
          className="form-input"
          value={ending.buttons?.learnMore?.[language] || ''}
          onChange={(e) =>
            updateStory((d) => {
              if (!d.ending.buttons) d.ending.buttons = {}
              if (!d.ending.buttons.learnMore) d.ending.buttons.learnMore = { url: '' }
              ;(d.ending.buttons.learnMore as any)[language] = e.target.value
            })
          }
          placeholder="Learn More"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Return Home Label ({language})</label>
        <input
          className="form-input"
          value={ending.buttons?.returnHome?.[language] || ''}
          onChange={(e) =>
            updateStory((d) => {
              if (!d.ending.buttons) d.ending.buttons = {}
              if (!d.ending.buttons.returnHome) d.ending.buttons.returnHome = {}
              d.ending.buttons.returnHome[language] = e.target.value
            })
          }
          placeholder="Return Home"
        />
      </div>
    </div>
  )
}
