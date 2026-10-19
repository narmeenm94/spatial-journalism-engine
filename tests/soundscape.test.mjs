import test from 'node:test'
import assert from 'node:assert/strict'
import { SoundscapeManager } from '../engine/src/managers/SoundscapeManager.js'
test('ambience persists through chapters, pauses, and object sounds follow inspection', async () => {
  const playing=new Set(),calls=[],sounds=new Map()
  const audio={sounds, async loadAudio(id,config){calls.push(['load',id,config]);const sound={buffer:{duration:4}};sounds.set(id,sound);return sound},play:id=>playing.add(id),pause:id=>playing.delete(id),stop:id=>playing.delete(id),isPlaying:id=>playing.has(id),getCurrentTime:()=>1,removeAudio:id=>{playing.delete(id);sounds.delete(id)}}
  const attached=[];const s=new SoundscapeManager(audio,{add:o=>attached.push(o)},p=>'resolved/'+p)
  await s.load([{id:'room',file:'room.mp3',loop:true},{id:'clock',file:'clock.mp3',loop:true,objectId:'clock'}])
  assert.equal(calls[0][2].url,'resolved/room.mp3');assert.equal(attached.length,2)
  s.update(false);assert.deepEqual([...playing],['soundscape:room'])
  s.toggleObject('clock',true);s.update(false);assert.equal(playing.size,2)
  s.update(true);assert.equal(playing.size,0)
  s.update(false);assert.equal(playing.size,2)
  s.toggleObject('clock',false);s.update(false);assert.deepEqual([...playing],['soundscape:room'])
  s.dispose();assert.equal(sounds.size,0);assert.equal(playing.size,0)
})
