import { useState } from 'react'
import { useStore } from '../state/store'
import { Icon } from './Icon'
import { applyToolTemplate, toolTemplates, type TemplateTool } from '../utils/toolTemplates'
export function ToolTemplates({ tool }: {tool:TemplateTool}) {
 const [message,setMessage] = useState('')
 return <div className="tool-templates"><div className="tool-template-heading"><strong>Start with a template</strong><small>Make it yours. Undo anytime.</small></div><div className="tool-template-cards">{toolTemplates[tool].map(template => <button key={template.id} onClick={()=>{
   const state=useStore.getState();state.updateStory(d=>applyToolTemplate(d,state.activeSceneId || '',tool,template.id,state.language),'Apply '+template.title+' template')
   setMessage(tool==='soundscape'?'Sound setup added. Choose or upload your audio below.':tool==='camera'?'Camera move added after your existing stops. Play to try it.':template.title+' applied. Every setting below is editable.')
 }}><div className={'tool-template-art '+tool+' '+template.id}><Icon name={template.icon} size={24}/><span/><span/><span/></div><strong>{template.title}</strong><small>{template.hint}</small></button>)}</div>{message && <p role="status">{message}</p>}</div>
}
