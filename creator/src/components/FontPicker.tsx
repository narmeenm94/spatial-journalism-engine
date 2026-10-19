import { useEffect, useRef, useState } from 'react'
import { installStoryFonts, type StoryFont } from '../../../engine/src/ui/storyFonts'
import { fontCatalog, type CatalogFont } from '../utils/fontCatalog'
import { fileDataURL } from '../utils/export'
import { useStore } from '../state/store'
import { Icon } from './Icon'

const EMPTY_FONTS: StoryFont[] = []
const systemFonts = ['Arial, sans-serif','Georgia, serif','Verdana, sans-serif','Tahoma, sans-serif','Trebuchet MS, sans-serif','Times New Roman, serif','Courier New, monospace','system-ui, sans-serif']
export function FontPicker({ value, onChange, label = 'Typeface' }: {value:string;onChange:(font:string)=>void;label?:string}) {
  const fonts = useStore(s => s.story.ui.branding.fonts || EMPTY_FONTS)
  const [open,setOpen] = useState(false), [search,setSearch] = useState(''), [error,setError] = useState(''), [busy,setBusy] = useState('')
  const [customName,setCustomName] = useState(''), [variant,setVariant] = useState('400')
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => {
    if (!open) return
    return installStoryFonts({fonts:fontCatalog.map(font => ({...font,files:font.files.filter(file => file.path.endsWith('-latin-wght-normal.woff2'))}))})
  }, [open])
  const install = async (font: CatalogFont) => {
    setBusy(font.id);setError('')
    try {
      const known = useStore.getState().story.ui.branding.fonts?.find(f => f.id === font.id)
      if (!known) {
        const assets = await Promise.all(font.files.map(async file => {
          const response = await fetch(file.src)
          if (!response.ok) throw new Error('This font could not be loaded. Please try again.')
          return [file.path, await fileDataURL(new Blob([await response.arrayBuffer()],{type:'font/woff2'}))] as const
        }))
        if (!alive.current) return
        const record:StoryFont = {id:font.id,name:font.name,family:font.family,license:font.license,files:font.files.map(({path,src,...descriptors}) => ({...descriptors,src:path}))}
        useStore.getState().updateStory(story => {
          story.ui.branding.fonts = [...(story.ui.branding.fonts || []),record]
          story.embeddedAssets = {...story.embeddedAssets,...Object.fromEntries(assets)}
        },'Add '+font.name+' font')
      }
      if (alive.current) { onChange(JSON.stringify(font.family));setOpen(false) }
    } catch (e) { if(alive.current)setError(e instanceof Error ? e.message : String(e)) }
    finally { if(alive.current)setBusy('') }
  }
  const upload = async (file: File) => {
    setBusy('upload');setError('')
    try {
      const extension = file.name.split('.').pop()?.toLowerCase()
      if (!['woff2','woff','ttf','otf'].includes(extension || '')) throw new Error('Choose a WOFF2, WOFF, TTF or OTF font file.')
      if (file.size > 20*1024*1024) throw new Error('Choose a font file smaller than 20 MB.')
      const id = crypto.randomUUID(), family = 'StoryFont-' + id
      const weight = variant==='variable' ? '100 900' : variant==='italic' ? '400' : variant
      const style = variant==='italic' ? 'italic' : 'normal'
      const bytes = await file.arrayBuffer()
      await new FontFace(family,bytes,{weight,style}).load()
      const src = 'fonts/'+id+'.'+extension
      const data = await fileDataURL(new Blob([bytes],{type:'font/'+extension}))
      const name = customName.trim() || file.name.replace(/\.[^.]+$/,'').replace(/[-_]/g,' ')
      if (!alive.current) return
      useStore.getState().updateStory(story => {
        story.ui.branding.fonts = [...(story.ui.branding.fonts || []),{id,name,family,files:[{src,weight,style}]}]
        story.embeddedAssets = {...story.embeddedAssets,[src]:data}
      },'Import '+name+' font')
      onChange(JSON.stringify(family));setOpen(false);setCustomName('')
    } catch (e) { if(alive.current)setError(e instanceof Error ? e.message : 'This font could not be read.') }
    finally { if(alive.current)setBusy('') }
  }
  const currentKnown = systemFonts.includes(value) || fonts.some(font => JSON.stringify(font.family)===value)
  return <div className="font-picker">
    <label className="designer-field">{label}<select className="form-select" aria-label={label} value={value} onChange={e=>onChange(e.target.value)}>
      {!currentKnown&&<option value={value}>{value || 'Story default'}</option>}
      {!!fonts.length&&<optgroup label="Included in this story">{fonts.map(font=><option key={font.id} value={JSON.stringify(font.family)}>{font.name}</option>)}</optgroup>}
      <optgroup label="System fonts · appearance varies by device">{systemFonts.map(font=><option key={font} value={font}>{font.split(',')[0]}</option>)}</optgroup>
    </select></label>
    <button className="btn font-library-toggle" aria-expanded={open} onClick={()=>setOpen(!open)}><Icon name="text" size={18}/>{open?'Close font library':'Browse fonts & upload'}</button>
    {open&&<div className="font-library">
      <input className="form-input" placeholder="Search fonts" aria-label="Search fonts" value={search} onChange={e=>setSearch(e.target.value)}/>
      <div className="font-library-grid">{fontCatalog.filter(font=>(font.name+' '+font.category).toLowerCase().includes(search.toLowerCase())).map(font=><button key={font.id} disabled={!!busy} onClick={()=>install(font)} title={'Add '+font.name+' to the story JSON'}><span style={{fontFamily:JSON.stringify(font.family)}}>Aa</span><strong>{font.name}</strong><small>{busy===font.id?'Adding…':font.category}</small></button>)}</div>
      {!fontCatalog.some(font=>(font.name+' '+font.category).toLowerCase().includes(search.toLowerCase()))&&<p>No matching font.</p>}
      <details className="font-upload-options"><summary>Upload your own font</summary>
        <label className="designer-field">Display name<input className="form-input" placeholder="Use file name" value={customName} onChange={e=>setCustomName(e.target.value)}/></label>
        <label className="designer-field">Font file style<select className="form-select" value={variant} onChange={e=>setVariant(e.target.value)}><option value="400">Regular</option><option value="700">Bold</option><option value="italic">Italic</option><option value="variable">Variable weight</option></select></label>
        <label className="designer-upload">{busy==='upload'?'Reading font…':'Choose font file'}<input disabled={!!busy} aria-label="Upload custom font" type="file" accept=".woff2,.woff,.ttf,.otf" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void upload(file)}}/></label>
        <p>Use a font you have permission to embed and share.</p>
      </details>
      <p>Library and uploaded fonts are included in your JSON. No font-service account is needed.</p>
    </div>}
    {error&&<p className="font-error" role="alert">{error}</p>}
  </div>
}
