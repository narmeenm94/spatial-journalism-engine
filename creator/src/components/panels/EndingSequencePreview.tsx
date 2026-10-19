import { useEffect, useMemo, useRef, useState } from 'react'
import { renderCinematicEnding } from '../../../../engine/src/ui/cinematicEnding.js'
import { useStore } from '../../state/store'

export function EndingSequencePreview() {
  const story=useStore(s=>s.story),language=useStore(s=>s.language),files=useStore(s=>s.assetFiles),base=useStore(s=>s.assetsBaseUrl)
  const [open,setOpen]=useState(false),[phone,setPhone]=useState(false),[revision,setRevision]=useState(0)
  const host=useRef<HTMLDivElement>(null)
  const urls=useMemo(()=>Object.fromEntries(Object.entries(files).map(([p,f])=>[p,URL.createObjectURL(f)])),[files])
  useEffect(()=>()=>Object.values(urls).forEach(URL.revokeObjectURL),[urls])
  useEffect(()=>{
    if(!open||!host.current)return
    const resolve=(p:string)=>urls[p]||story.embeddedAssets?.[p]||(/^(https?:|data:|blob:)/.test(p)?p:base?new URL((story.project.assets.basePath||'')+p,base.endsWith('/')?base:base+'/').href:'')
    return renderCinematicEnding(host.current,story.ending,{language,font:story.ui.branding.font,mobile:phone,resolveAsset:resolve,onReplay:()=>setRevision(n=>n+1)})
  },[open,phone,revision,story.ending,language,urls,base,story.embeddedAssets,story.ui.branding.font])
  return <div className="ending-preview"><div style={{display:'flex',gap:12,alignItems:'center',marginBottom:12}}><button className="btn" onClick={()=>setOpen(!open)}>{open?'Close ending preview':'Play ending here'}</button>{open&&<label><input type="checkbox" checked={phone} onChange={e=>setPhone(e.target.checked)}/> Phone layout</label>}</div>{open&&<div style={{height:phone?500:360,maxWidth:phone?380:undefined,margin:'auto',background:'#000'}}><div ref={host}/></div>}</div>
}
