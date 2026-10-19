import test from 'node:test'
import assert from 'node:assert/strict'
import { captionStyles, normalizeCaptionStyle } from '../../engine/src/ui/captionStyle.js'
import { useStore } from '../src/state/store.ts'
import { portableStory } from '../src/utils/export.ts'
import { normalizeStory } from '../src/utils/normalizeStory.ts'
import { assertValidStory } from '../src/utils/storyDocument.ts'
import { applyToolTemplate, toolTemplates } from '../src/utils/toolTemplates.ts'

test('caption appearance survives export and reopening, with responsive styling',async()=>{
 useStore.getState().resetStory();const s=structuredClone(useStore.getState().story)
 s.ui.captions={font:'Georgia, serif',fontSize:28,mobileFontSize:18,color:'#111111',backgroundColor:'#ffffff',backgroundOpacity:.9,position:'top',align:'left',padding:20,radius:0,width:85,offset:40}
 const out=await portableStory(s), reopened=normalizeStory(JSON.parse(JSON.stringify(out)))
 assertValidStory(reopened);assert.deepEqual(reopened.ui.captions,s.ui.captions)
 assert.equal(captionStyles(reopened.ui.captions).text.fontSize,'28px');assert.equal(captionStyles(reopened.ui.captions,'',true).text.fontSize,'18px')
 assert.equal(captionStyles(reopened.ui.captions).text.background,'rgba(255,255,255,0.9)')
 assert.equal(captionStyles(reopened.ui.captions).container.bottom,'auto')
})
test('old stories get readable defaults and invalid caption settings fail schema validation',()=>{
 assert.equal(normalizeCaptionStyle().fontSize,18)
 useStore.getState().resetStory();const s=structuredClone(useStore.getState().story);s.ui.captions={backgroundOpacity:3}
 assert.throws(()=>assertValidStory(s),/backgroundOpacity/)
 assert.equal(normalizeCaptionStyle({fontSize:NaN,width:1000,color:'url(bad)'}).color,'#ffffff')
})
test('every tool template creates valid editable JSON and camera templates append unique stops',()=>{
 useStore.getState().resetStory()
 for(const [tool,templates] of Object.entries(toolTemplates)) for(const template of templates){
  const s=structuredClone(useStore.getState().story)
  applyToolTemplate(s,'scene1',tool,template.id,'en')
  if(tool==='soundscape') { assert.throws(()=>assertValidStory(s),/Choose a file/); s.ambience[0].file='audio/author-recording.mp3' }
  assertValidStory(s)
  if(tool==='camera'){
    const first=structuredClone(s.camera.guided.scene1);applyToolTemplate(s,'scene1',tool,template.id,'en')
    assert.deepEqual(s.camera.guided.scene1.slice(0,first.length),first)
    assert.equal(new Set(s.camera.guided.scene1.map(k=>k.id)).size,s.camera.guided.scene1.length)
  }
 }
})

test('blank overlapping legacy captions cannot hide spoken text',async()=>{
 const {SubtitleManager}=await import('../../engine/src/managers/SubtitleManager.js')
 const manager=Object.create(SubtitleManager.prototype)
 manager.language='en';manager.subtitleElement={textContent:'',style:{}};manager.subtitles=new Map([['chapter',{en:[{start:0,end:4,text:''},{start:1,end:3,text:'Visible words'}]}]])
 manager.updateSubtitle('chapter',2);assert.equal(manager.subtitleElement.textContent,'Visible words')
 manager.updateSubtitle('chapter',3);assert.equal(manager.subtitleElement.textContent,'');assert.equal(manager.subtitleElement.style.display,'none')
})
