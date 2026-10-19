import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { resolveScreenTarget, screenChoice, mergeLaunchChoice, addModeChooser, createScreenDesign } from '../../engine/src/ui/screenDesign.js'
import { assertValidStory } from '../src/utils/storyDocument.ts'
import { normalizeStory } from '../src/utils/normalizeStory.ts'
const source=()=>JSON.parse(fs.readFileSync(new URL('../../examples/shadows-rebuilt/story.json',import.meta.url),'utf8'))
test('Shadows Guided skips walking, Explore includes it, and both reach the film with their choice',()=>{
 const d=source().ui.screenDesigner
 for(const navigation of ['guided','explore']) {
  let choice=mergeLaunchChoice({type:'start',mode:'3d'},{type:'choice',navigation})
  let id='tutorial-0',visited=[]
  while(id!=='intro-film') {
   const s=resolveScreenTarget(d,id,choice.navigation);assert.ok(s);visited.push(s.id)
   const next=s.elements.find(e=>e.id==='next').action
   choice=mergeLaunchChoice(choice,next);id=next.screenId
  }
  assert.equal(visited.includes('tutorial-1'),navigation==='explore')
  choice=mergeLaunchChoice(choice,d.screens.find(s=>s.id===id).introVideo.onEnd)
  assert.equal(choice.navigation,navigation);assert.equal(choice.mode,'3d')
 }
})
test('a page without choices does not override the next page default or a reader selection',()=>{
 assert.equal(screenChoice({},{}).navigation,undefined)
 assert.equal(screenChoice({defaultNavigation:'guided'},{}).navigation,'guided')
 assert.equal(screenChoice({defaultNavigation:'guided'},{navigation:'explore'}).navigation,'explore')
})
test('missing conditional targets, conditional loops and invalid languages are rejected',()=>{
 let s=source(),lesson=s.ui.screenDesigner.screens.find(s=>s.id==='tutorial-1');lesson.skipTo='missing'
 assert.throws(()=>assertValidStory(s),/skip destination|visible screen/)
 s=source();s.ui.screenDesigner.screens.find(s=>s.id==='tutorial-1').skipTo='tutorial-1'
 assert.throws(()=>assertValidStory(s),/cycle/)
 s=source();s.ui.screenDesigner.screens[0].elements.find(e=>e.id==='english').action.language='xx'
 assert.throws(()=>assertValidStory(s),/story language/)
})
test('mode chooser works in an existing design with a custom home id',()=>{
 const d=createScreenDesign({},'Test');d.homeScreenId='custom-home';d.screens[0].id='custom-home'
 const id=addModeChooser(d),page=d.screens.find(s=>s.id===id)
 assert.equal(page.elements.find(e=>e.id==='back').action.screenId,'custom-home')
 assert.equal(page.elements.find(e=>e.id==='continue').action.type,'start')
 assert.equal(page.elements.filter(e=>e.action?.type==='choice').length,2)
})
test('source-based intro retains layered gestures, localized credits, delayed skip and luminous scene buttons through normalization',()=>{
 const s=source();assertValidStory(s)
 const reopened=normalizeStory(JSON.parse(JSON.stringify(s)));assertValidStory(reopened)
 assert.deepEqual(reopened.ui.screenDesigner,s.ui.screenDesigner)
 const d=s.ui.screenDesigner
 assert.equal(d.screens.find(s=>s.id==='choose').background.video,'bg-video.mp4')
 assert.equal(d.screens.find(s=>s.id==='tutorial-3').elements.filter(e=>e.type==='image').length,3)
 assert.equal(d.screens.find(s=>s.id==='intro-film').elements[0].showAfter,2)
 assert.match(d.screens.find(s=>s.id==='info').elements.find(e=>e.scrollable).text.en,/Narmeen Marji/)
 assert.equal(s.ui.controls.recenterPlacement,'overlay')
 assert.ok(s.scenes.slice(0,3).every(s=>s.sceneButtons[0].glow))
})
