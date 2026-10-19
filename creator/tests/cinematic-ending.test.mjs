import { SceneManager } from '../../engine/src/managers/SceneManager.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { endingTimeline, sampleEnding, characterEndingTime } from '../../engine/src/ui/cinematicEnding.js'
import { assertValidStory } from '../src/utils/storyDocument.ts'
import { normalizeStory } from '../src/utils/normalizeStory.ts'
const story=()=>JSON.parse(fs.readFileSync(new URL('../../examples/shadows-rebuilt/story.json',import.meta.url),'utf8'))
test('source cinematic timeline preserves text, quotes, video delay and final action timings',()=>{
 const ending=story().ending,t=endingTimeline(ending)
 assert.equal(t.textStart,6);assert.equal(t.textEnd,19);assert.equal(t.quoteStart,22);assert.equal(t.videoStart,23);assert.equal(t.duration,42)
 assert.deepEqual(t.quotes.map(q=>q.start),[22,29,35,38])
 assert.equal(sampleEnding(ending,2).overlayOpacity,.5)
 assert.equal(sampleEnding(ending,9).textOpacity,1)
 assert.equal(sampleEnding(ending,22).textOpacity,0)
 assert.equal(sampleEnding(ending,24).quoteIndex,0)
 assert.equal(sampleEnding(ending,36).quoteIndex,2)
 assert.equal(sampleEnding(ending,42).complete,true)
 assert.equal(sampleEnding(ending,42).videoVisible,false)
 // Seeking backwards must not retain the completed state or final quote.
 assert.equal(sampleEnding(ending,10).complete,false)
 assert.equal(sampleEnding(ending,10).quoteIndex,-1)
})
test('cinematic timing and device choices survive reopen and reject invalid durations',()=>{
 const s=story();assertValidStory(s);assert.deepEqual(JSON.parse(JSON.stringify(normalizeStory(JSON.parse(JSON.stringify(s))).ending)),s.ending)
 s.ending.cinematic.quoteTimings[0].hold=-1;assert.throws(()=>assertValidStory(s))
 s.ending.cinematic.quoteTimings[0].hold=3;s.ending.cinematic.videoOn='unsupported';assert.throws(()=>assertValidStory(s))
})
test('new endings need no custom timings and can complete without quotes',()=>{
 const ending={text:{en:'End'},quotes:[],cinematic:{fadeIn:0,textDelay:0,textDuration:2,textFade:0,actionsDelay:0}}
 assert.equal(endingTimeline(ending).duration,2);assert.equal(sampleEnding(ending,2).complete,true)
 assert.ok(Number.isFinite(sampleEnding(ending,0).textOpacity))
})

test('original fade opacity and six-second wait determine the ending on the chapter clock',()=>{
 const s=story(),c=s.scenes.at(-1).characters.find(c=>c.id===s.ending.triggerCharacterId)
 assert.equal(c.delay,30000)
 assert.ok(Math.abs(characterEndingTime(c,s.ending)-100.2857142857)<.000001)
 assert.equal(characterEndingTime(c,{triggerDelay:0,triggerOpacity:0}),99)
 assert.equal(characterEndingTime({...c,duration:0},s.ending),Infinity)
})

test('the scene clock waits for the fade delay and pauses without ending early',()=>{
 const s=story(),ending=s.ending,c=s.scenes.at(-1).characters.find(c=>c.id===ending.triggerCharacterId)
 let completed=0,sceneEnds=0
 const manager=new SceneManager({engine:{story:s,handleComplete:()=>completed++}})
 manager.currentScene={id:'scene4',isActive:true,characters:[c],videos:[],subtitles:[]};manager.currentSceneId='scene4'
 manager.characterSchedule=[{config:c,model:{visible:true,traverse(){}}}]
 manager.handleAudioTimeUpdate=()=>{};manager.handleSceneEnd=()=>sceneEnds++
 manager.elapsed=98;manager.update(1);assert.equal(completed,0);assert.equal(sceneEnds,0)
 manager.paused=true;manager.update(20);assert.equal(manager.elapsed,99);assert.equal(completed,0)
 manager.paused=false;manager.update(1.3);assert.equal(completed,1)
 manager.update(1);assert.equal(completed,1)
})
