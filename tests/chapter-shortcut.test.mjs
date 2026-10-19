import test from 'node:test'
import assert from 'node:assert/strict'
import { chapterShortcutState } from '../engine/src/ui/chapterShortcut.js'
const base={index:0,total:4,transitioning:false,hasSceneButtons:false,completed:false,now:6000,readyAt:5000}
test('chapter shortcut waits, yields to scene buttons and disappears at the end',()=>{
  assert.deepEqual(chapterShortcutState(base),{visible:true,disabled:false})
  for(const change of [{now:4999},{transitioning:true},{hasSceneButtons:true}])assert.deepEqual(chapterShortcutState({...base,...change}),{visible:true,disabled:true})
  for(const change of [{index:3},{index:-1},{completed:true}])assert.deepEqual(chapterShortcutState({...base,...change}),{visible:false,disabled:true})
})
