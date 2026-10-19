import test from 'node:test'
import assert from 'node:assert/strict'
import { SceneEffects } from '../engine/src/lighting/SceneEffects.js'
function harness() {
  let clock=0,id=0;const frames=new Map()
  globalThis.requestAnimationFrame=fn=>{frames.set(++id,fn);return id}
  globalThis.cancelAnimationFrame=id=>frames.delete(id)
  const lights={ambient:{intensity:1},directional:{intensity:2},hemisphere:{intensity:1}}
  const effects=new SceneEffects({lights,getTime:()=>clock})
  return {effects,lights,set:time=>{clock=time},tick:()=>{const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn())},cleanup:()=>{delete globalThis.requestAnimationFrame;delete globalThis.cancelAnimationFrame}}
}
test('light transitions freeze with chapter time and cannot overwrite a later chapter', async () => {
  const h=harness()
  try {
    const transition=h.effects.transitionLights({ambient:0,directional:0,hemisphere:0},2000)
    h.set(1);h.tick();assert.equal(h.lights.ambient.intensity,.5)
    h.tick();assert.equal(h.lights.ambient.intensity,.5)
    h.effects.stopWalkingTour();h.lights.ambient.intensity=3;h.set(2);h.tick()
    await transition;assert.equal(h.lights.ambient.intensity,3)
  } finally {h.cleanup()}
})
test('flicker honors chapter pause, configured duration and cleanup', () => {
  const h=harness()
  try {
    h.effects.initFlicker({duration:1,patterns:[{duration:100,intensity:.2},{duration:100,intensity:.8}]})
    h.effects.startFlicker();assert.equal(h.lights.ambient.intensity,.2)
    h.set(.15);h.tick();assert.equal(h.lights.ambient.intensity,.8)
    h.tick();assert.equal(h.lights.ambient.intensity,.8)
    h.set(.25);h.tick();assert.equal(h.lights.ambient.intensity,.2)
    h.set(1);h.tick();assert.equal(h.lights.ambient.intensity,1)
    h.effects.startFlicker();h.effects.stopFlicker();h.lights.ambient.intensity=3;h.set(2);h.tick();assert.equal(h.lights.ambient.intensity,3)
  } finally {h.cleanup()}
})
