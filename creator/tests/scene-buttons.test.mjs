import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { useStore } from '../src/state/store.ts'
import { portableStory } from '../src/utils/export.ts'
import { normalizeStory } from '../src/utils/normalizeStory.ts'
import { assertValidStory } from '../src/utils/storyDocument.ts'
import { TestFileReader } from './file-reader.mjs'
globalThis.FileReader=TestFileReader

test('scene button artwork, models, timing, transforms and routes survive portable JSON reopening',async()=>{
  useStore.getState().resetStory();useStore.getState().addScene();useStore.getState().addSceneButton('scene1')
  const story=structuredClone(useStore.getState().story),button=story.scenes[0].sceneButtons[0]
  Object.assign(button,{appearance:'sprite',image:{en:'buttons/en.png',fi:'buttons/fi.png'},targetScene:story.scenes[1].id,showWhen:'chapterEnd'})
  story.scenes[1].sceneButtons=[{...button,id:'model-button',appearance:'model',model:'buttons/object.glb',targetScene:'scene1'}]
  const files=Object.fromEntries(['buttons/en.png','buttons/fi.png','buttons/object.glb'].map(path=>[path,new File([new Uint8Array([0,20,255,12])],path)]))
  const doc=await portableStory(story,files),reopened=normalizeStory(JSON.parse(JSON.stringify(doc)))
  assert.deepEqual(reopened.scenes.map(s=>s.sceneButtons),story.scenes.map(s=>s.sceneButtons))
  assertValidStory(reopened)
  const again=await portableStory(reopened)
  for(const path of Object.keys(files))assert.deepEqual(Buffer.from(again.embeddedAssets[path].split(',')[1],'base64'),Buffer.from([0,20,255,12]))
})

test('invalid scene-button destinations, missing artwork and negative reveal times are rejected',()=>{
  useStore.getState().resetStory();useStore.getState().addSceneButton('scene1')
  const story=structuredClone(useStore.getState().story),button=story.scenes[0].sceneButtons[0]
  button.targetScene='missing';assert.throws(()=>assertValidStory(story),/unknown chapter/)
  button.targetScene='scene1';button.appearance='sprite';assert.throws(()=>assertValidStory(story),/Choose an image/)
  button.appearance='text';button.showAt=-1;assert.throws(()=>assertValidStory(story),/showAt/)
})

test('adding and removing button destinations supports undo without breaking references',()=>{
  const s=useStore.getState();s.resetStory();s.addScene();s.addSceneButton('scene1')
  const id=useStore.getState().story.scenes[1].id
  s.updateStory(d=>{d.scenes[0].sceneButtons[0].targetScene=id},'Route button')
  s.removeScene(id);assert.equal(useStore.getState().story.scenes[0].sceneButtons[0].targetScene,undefined)
  s.undo();assert.equal(useStore.getState().story.scenes[0].sceneButtons[0].targetScene,id)
})

test('rebuilt Shadows contains all three original localized end-of-chapter sprite buttons',()=>{
  const story=JSON.parse(fs.readFileSync(new URL('../../examples/shadows-rebuilt/story.json',import.meta.url)))
  assertValidStory(story)
  story.scenes.slice(0,3).forEach((scene,index)=>{
    const button=scene.sceneButtons[0];assert.equal(button.showWhen,'chapterEnd');assert.equal(button.targetScene,story.scenes[index+1].id)
    for(const path of Object.values(button.image))assert.ok(fs.existsSync(new URL('../../examples/shadows-rebuilt/assets/'+path,import.meta.url)))
  })
})
