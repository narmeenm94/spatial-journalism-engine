import test from 'node:test'
import assert from 'node:assert/strict'
import { AudioManager } from '../engine/src/managers/AudioManager.js'
test('disposing unplayed object audio does not disconnect a null source',()=>{
 const manager=new AudioManager(null);let removed=0
 manager.sounds.set('unplayed',{isPlaying:false,source:null,parent:{remove:()=>removed++},disconnect:()=>{throw new Error('null source')}})
 manager.removeAudio('unplayed');manager.removeAudio('unplayed')
 assert.equal(removed,1);assert.equal(manager.sounds.size,0)
})
test('disposing active audio stops it and disconnects its nodes once',()=>{
 const manager=new AudioManager(null),calls=[]
 manager.sounds.set('active',{isPlaying:true,source:{},_connected:true,stop:()=>calls.push('stop'),disconnect:()=>calls.push('source'),panner:{disconnect:()=>calls.push('panner')},gain:{disconnect:()=>calls.push('gain')}})
 manager.dispose();assert.deepEqual(calls,['stop','source','panner','gain'])
})
