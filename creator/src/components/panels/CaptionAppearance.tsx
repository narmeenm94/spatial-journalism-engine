import { useState, type CSSProperties } from 'react'
import { useStore } from '../../state/store'
import { FontPicker } from '../FontPicker'
import { captionStyles, normalizeCaptionStyle, DEFAULT_CAPTION_STYLE, type CaptionStyle } from '../../../../engine/src/ui/captionStyle.js'

const presets: {id:string; name:string; style:CaptionStyle}[] = [
  { id:'classic', name:'Classic', style:{...DEFAULT_CAPTION_STYLE, radius:2} },
  { id:'clear', name:'Clear', style:{...DEFAULT_CAPTION_STYLE, backgroundOpacity:0, fontWeight:600, fontSize:22, mobileFontSize:18} },
  { id:'paper', name:'Paper', style:{...DEFAULT_CAPTION_STYLE, color:'#171717',backgroundColor:'#fffdf5',backgroundOpacity:.96,textShadow:false,align:'left',radius:2,padding:16} },
  { id:'cinema', name:'Cinema', style:{...DEFAULT_CAPTION_STYLE,backgroundOpacity:.85,fontSize:24,mobileFontSize:18,width:100,maxWidth:1600,offset:0,padding:20,radius:0} }
]
export function CaptionAppearance() {
  const story = useStore(s => s.story), sceneId = useStore(s => s.activeSceneId), language = useStore(s => s.language)
  const [mobile,setMobile] = useState(false)
  const style = normalizeCaptionStyle(story.ui.captions)
  const scene = story.scenes.find(s => s.id === sceneId)
  const sample = scene?.subtitles[0]?.text[language] || 'Every place has a story. Bring yours into focus.'
  const apply = (changes:CaptionStyle) => useStore.getState().updateStory(d => { d.ui.captions = {...d.ui.captions,...changes} }, 'Style captions')
  const css = captionStyles(style,story.ui.branding.font,mobile)
  const number = (key:keyof CaptionStyle,label:string,min:number,max:number,step=1) => <label>{label}<input className="form-input" aria-label={label} type="number" min={min} max={max} step={step} value={Number(style[key])} onChange={e => {if(e.target.value !== '' && Number.isFinite(Number(e.target.value))) apply({[key]:Math.max(min,Math.min(max,Number(e.target.value)))})}}/></label>
  return <div className="caption-appearance">
    <div className="caption-design-preview">
      <div className="caption-preview-toolbar"><strong>Caption design</strong><div><button className="btn btn-sm" aria-pressed={!mobile} onClick={()=>setMobile(false)}>Desktop</button><button className="btn btn-sm" aria-pressed={mobile} onClick={()=>setMobile(true)}>Mobile</button></div></div>
      <div className={'caption-sample-stage'+(mobile?' mobile':'')}><span className="caption-sample-scene">Your story, in view</span><div style={css.container as CSSProperties}><p style={css.text as CSSProperties}>{sample}</p></div></div>
      <button className="btn btn-sm" onClick={()=>{const s=useStore.getState();s.setIsPlaying(false);s.setTimelinePosition(scene?.subtitles[0]?.start || 0);s.setAudienceFullView(true);window.dispatchEvent(new Event('sj-audience-view'))}}>See in audience view</button>
    </div>
    <div className="caption-design-options">
      <div className="caption-presets" aria-label="Caption templates">{presets.map(p=><button key={p.id} aria-label={'Use '+p.name+' caption template'} onClick={()=>apply(p.style)}><span style={captionStyles(p.style).text as CSSProperties}>Aa</span><strong>{p.name}</strong></button>)}</div>
      <FontPicker label="Caption font" value={style.font || story.ui.branding.font} onChange={font=>apply({font})}/>
      <div className="caption-field-grid">{number('fontSize','Desktop text size',12,64)}{number('mobileFontSize','Mobile text size',12,40)}
        <label>Text colour<input aria-label="Caption text colour" type="color" value={style.color} onChange={e=>apply({color:e.target.value})}/></label>
        <label>Bar colour<input aria-label="Caption bar colour" type="color" value={style.backgroundColor} onChange={e=>apply({backgroundColor:e.target.value})}/></label>
      </div>
      <label className="caption-opacity">Bar opacity <output>{Math.round(style.backgroundOpacity*100)}%</output><input aria-label="Caption bar opacity" type="range" min="0" max="1" step=".01" value={style.backgroundOpacity} onChange={e=>apply({backgroundOpacity:Number(e.target.value)})}/></label>
      <details><summary>Placement & spacing</summary><div className="caption-field-grid">
        <label>Position<select className="form-select" value={style.position} onChange={e=>apply({position:e.target.value as 'top'|'bottom'})}><option value="bottom">Bottom</option><option value="top">Top</option></select></label>
        <label>Alignment<select className="form-select" value={style.align} onChange={e=>apply({align:e.target.value as 'left'|'center'|'right'})}><option value="left">Left</option><option value="center">Centre</option><option value="right">Right</option></select></label>
        {number('offset','Distance from edge',0,200)}{number('width','Bar width (%)',30,100)}{number('maxWidth','Maximum width',240,1600)}{number('padding','Bar padding',0,40)}{number('radius','Corner radius',0,40)}
      </div></details>
      <details><summary>Type details</summary><div className="caption-field-grid">{number('fontWeight','Font weight',100,900,100)}{number('lineHeight','Line spacing',1,2.5,.1)}<label><input type="checkbox" checked={style.textShadow} onChange={e=>apply({textShadow:e.target.checked})}/> Text shadow</label></div></details>
      <button className="btn btn-sm" onClick={()=>useStore.getState().updateStory(d=>{delete d.ui.captions},'Reset caption appearance')}>Use default caption style</button>
      <small>Applies to every chapter. Saved with your fonts in the story JSON.</small>
    </div>
  </div>
}
