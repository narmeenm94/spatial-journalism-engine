import test from 'node:test'
import assert from 'node:assert/strict'
import { characterOpacity, mediaAtTime, chapterDuration, flickerMultiplier } from '../src/utils/playback.ts'
import { useStore } from '../src/state/store.ts'

test('characters respect millisecond delay, fades and backwards scrubbing',()=>{
 const c={delay:2000,duration:5000,fadeIn:1000,fadeOut:1000,opacity:.8}
 for(const [t,value] of [[1,0],[2,0],[2.5,.4],[4,.8],[6.5,.4],[7,0],[2.5,.4]]) assert.ok(Math.abs(characterOpacity(c,t)-value)<1e-8)
 assert.equal(characterOpacity({...c,duration:0},1000),.8)
})
test('media seek offsets respect seconds, finite trims, intrinsic duration and loops',()=>{
 assert.deepEqual(mediaAtTime(1,2,0,10),{active:false,offset:0})
 assert.deepEqual(mediaAtTime(7,2,0,10),{active:true,offset:5})
 assert.equal(mediaAtTime(12,2,0,10).active,false)
 assert.equal(mediaAtTime(7,2,5,10,true).active,false)
 assert.deepEqual(mediaAtTime(25,2,0,10,true),{active:true,offset:3})
 assert.deepEqual(mediaAtTime(4,2,0,10),{active:true,offset:2})
})
test('chapter duration uses loaded media and camera completion; explicit duration wins',()=>{
 const s={subtitles:[],characters:[],audio:[{file:'a',delay:1000,duration:0}],videos:[{url:'v',triggerTime:5,duration:0}]}
 assert.equal(chapterDuration(s,[],{a:30,v:10}),31)
 assert.equal(chapterDuration(s,[{time:30,duration:4000}],{a:30,v:10}),34)
 assert.equal(chapterDuration({...s,duration:12},[],{a:30}),12)
})
test('flicker is reversible and restores normal brightness after its duration',()=>{
 const f={triggerTime:2,duration:1,patterns:[{duration:100,intensity:.1},{duration:100,intensity:.8}]}
 assert.equal(flickerMultiplier(1,f),1);assert.equal(flickerMultiplier(2.15,f),.8);assert.equal(flickerMultiplier(3,f),1);assert.equal(flickerMultiplier(2.05,f),.1)
})
test('playback, full audience view, pause and reset never mutate the story',()=>{
 const s=useStore.getState();s.resetStory();const before=JSON.stringify(useStore.getState().story)
 s.setIsPlaying(true);s.setTimelinePosition(3);s.setAudienceFullView(true)
 assert.equal(useStore.getState().showCameraPiP,true);assert.equal(useStore.getState().playbackPreview,true)
 s.setIsPlaying(false);assert.equal(useStore.getState().timelinePosition,3)
 s.stopPlayback();assert.equal(useStore.getState().timelinePosition,0);assert.equal(useStore.getState().playbackPreview,false);assert.equal(useStore.getState().audienceFullView,false)
 s.setIsPlaying(true);s.setActiveScene('scene1');assert.equal(useStore.getState().isPlaying,false)
 assert.equal(JSON.stringify(useStore.getState().story),before)
})
