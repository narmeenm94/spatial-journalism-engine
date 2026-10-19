import test from 'node:test'
import assert from 'node:assert/strict'
import { createScreenDesign, screenDesignMedia, clampScreenLayout, addIntroFlow, mergeLaunchChoice } from '../../engine/src/ui/screenDesign.js'
import { useStore } from '../src/state/store.ts'
import { storyDocument, assertValidStory } from '../src/utils/storyDocument.ts'
import { portableStory } from '../src/utils/export.ts'
import { normalizeStory } from '../src/utils/normalizeStory.ts'
import { TestFileReader } from './file-reader.mjs'
globalThis.FileReader=TestFileReader
function story(preset='editorial'){useStore.getState().resetStory();const s=structuredClone(useStore.getState().story);s.ui.screenDesigner=createScreenDesign(s.ui,'Test story',preset);return s}
for(const preset of ['editorial','cinema','choice','journey'])test(preset+' screens have reachable experience actions and survive round trip',()=>{
 const s=story(preset);assertValidStory(s);const d=storyDocument(normalizeStory(JSON.parse(JSON.stringify(s))));assert.deepEqual(d.ui.screenDesigner,s.ui.screenDesigner)
})
test('screen artwork, desktop video and mobile backgrounds travel in the single JSON',async()=>{
 const s=story(),screen=s.ui.screenDesigner.screens[0];screen.background.video='ui/opening.mp4';screen.mobileBackground.image='ui/mobile.png';screen.elements[3].src='ui/button.png';screen.elements[3].sprite={frames:8,fps:12};screen.elements[3].animation='rise';screen.elements[3].action={type:'start',mode:'3d',navigation:'explore'}
 const paths=screenDesignMedia(s.ui.screenDesigner),files=Object.fromEntries(paths.map(p=>[p,new File(['test-media-bytes'],p)]))
 const exported=await portableStory(s,files),reopened=normalizeStory(JSON.parse(JSON.stringify(exported)));assertValidStory(reopened)
 assert.deepEqual(reopened.ui.screenDesigner,s.ui.screenDesigner)
 for(const path of paths)assert.ok(reopened.embeddedAssets[path]?.startsWith('data:'),path)
})
test('broken button routes, unsafe links, disabled platforms and unreachable starts are rejected',()=>{
 let s=story();s.ui.screenDesigner.screens[0].elements[3].action.screenId='missing';assert.throws(()=>assertValidStory(s),/missing screen/)
 s=story();s.ui.screenDesigner.screens[0].elements[3].action={type:'link',url:'javascript:alert(1)'};assert.throws(()=>assertValidStory(s),/HTTP or HTTPS/)
 s=story();s.project.modes=['3d'];s.ui.screenDesigner.screens[1].elements[1].action.mode='vr';assert.throws(()=>assertValidStory(s),/platform/)
 s=story();s.ui.screenDesigner.screens[0].elements[3].action={type:'screen',screenId:'home'};assert.throws(()=>assertValidStory(s),/Start experience/)
 s=story();s.ui.screenDesigner.screens[0].elements[0].layout.width=99;assert.throws(()=>assertValidStory(s),/inside/)
})


test('direct manipulation keeps resized elements inside the artboard, including invalid numeric input',()=>{
 assert.deepEqual(clampScreenLayout({x:-5,y:101,width:28,height:10}),{x:0,y:90,width:28,height:10})
 assert.deepEqual(clampScreenLayout({x:80,y:80,width:120,height:120}),{x:0,y:0,width:100,height:100})
 assert.deepEqual(clampScreenLayout({x:NaN,y:Infinity,width:-10,height:NaN}),{x:0,y:0,width:1,height:10})
 const input={x:8,y:49,width:39,height:12};assert.deepEqual(clampScreenLayout(input),input)
 assert.notEqual(clampScreenLayout(input),input)
})

test('resized desktop elements keep their separate mobile layout and button actions after export',async()=>{
 const s=story(),element=s.ui.screenDesigner.screens[1].elements[1],mobile=structuredClone(element.mobileLayout)
 element.layout=clampScreenLayout({...element.layout,x:12,width:45,height:15})
 const reopened=normalizeStory(JSON.parse(JSON.stringify(await portableStory(s,{}))))
 assertValidStory(reopened)
 const restored=reopened.ui.screenDesigner.screens[1].elements[1]
 assert.deepEqual(restored.mobileLayout,mobile)
 assert.deepEqual(restored.layout,element.layout)
 assert.deepEqual(restored.action,{type:'start',mode:'auto',navigation:'guided'})
})

test('adding intro pages preserves existing layouts and carries navigation choices through tutorial and film',()=>{
 const s=story(),design=s.ui.screenDesigner,home=structuredClone(design.screens[0])
 const first=addIntroFlow(design)
 assert.deepEqual(design.screens[0],home)
 assert.equal(design.screens[1].elements[1].action.screenId,first)
 let choice={type:'start',mode:'auto'}
 choice=mergeLaunchChoice(choice,design.screens[1].elements[1].action)
 choice=mergeLaunchChoice(choice,{type:'screen',screenId:'intro-video'})
 choice=mergeLaunchChoice(choice,{type:'start',mode:'auto'})
 assert.equal(choice.navigation,'guided')
 const second=addIntroFlow(design);assert.notEqual(first,second)
 assert.equal(new Set(design.screens.map(s=>s.id)).size,design.screens.length)
 assertValidStory(s)
})

test('localized intro films and title artwork survive single-JSON export and automatic routes are validated',async()=>{
 const s=story('journey'),film=s.ui.screenDesigner.screens.find(s=>s.introVideo)
 film.introVideo.sources={en:'intro/en.mp4',fi:'intro/fi.mp4'}
 s.ui.screenDesigner.screens[0].elements[0].srcByLanguage={en:'title/en.png',fi:'title/fi.png'}
 const paths=screenDesignMedia(s.ui.screenDesigner).filter(p=>!p.startsWith('data:'))
 const files=Object.fromEntries(paths.map(p=>[p,new File(['intro-media'],p)]))
 const out=await portableStory(s,files),reopened=normalizeStory(JSON.parse(JSON.stringify(out)))
 assert.deepEqual(reopened.ui.screenDesigner,s.ui.screenDesigner)
 for(const path of paths)assert.equal(Buffer.from(reopened.embeddedAssets[path].split(',')[1],'base64').toString(),'intro-media')
 film.introVideo.onEnd={type:'screen',screenId:'missing'};assert.throws(()=>assertValidStory(s),/Intro video links/)
 film.introVideo.onEnd={type:'start',mode:'auto'};film.elements=[];assertValidStory(s)
})
