import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three-runtime'
import { sceneButtonVisible, sceneButtonTarget, localizedButtonValue } from '../engine/src/ui/sceneButtons.js'
import { SceneButtonManager } from '../engine/src/managers/SceneButtonManager.js'
import { CameraRigControls } from '../engine/src/controls/CameraRigControls.js'

test('scene buttons reveal at authored times or chapter completion and resolve explicit/next/replay routes', () => {
  const scenes = [{id:'a',nextScene:'c'},{id:'b'},{id:'c'}]
  assert.equal(sceneButtonVisible({showWhen:'chapterEnd'},99,false),false)
  assert.equal(sceneButtonVisible({showWhen:'chapterEnd'},3,true),true)
  assert.equal(sceneButtonVisible({showWhen:'time',showAt:5},4.9,false),false)
  assert.equal(sceneButtonVisible({showWhen:'time',showAt:5},5,false),true)
  assert.equal(sceneButtonTarget({},scenes,'a'),'c')
  assert.equal(sceneButtonTarget({targetScene:'a'},scenes,'a'),'a')
  assert.equal(sceneButtonTarget({targetScene:'missing'},scenes,'a'),null)
  assert.equal(sceneButtonTarget({},scenes,'c'),null)
  assert.equal(localizedButtonValue({en:'Continue',fi:'Jatka'},'fi'),'Jatka')
  assert.equal(localizedButtonValue({en:'Continue'},'sv'),'Continue')
})

test('mouse/controller rays activate only visible scene buttons and ignore repeated taps during transitions', () => {
  const camera=new THREE.PerspectiveCamera(), root=new THREE.Group(), sprite=new THREE.Sprite(new THREE.SpriteMaterial())
  root.userData.sceneButtonId='next'; root.position.z=-2; root.add(sprite); root.updateMatrixWorld(true)
  let calls=0
  const manager=Object.create(SceneButtonManager.prototype)
  manager.sceneId='a';manager.items=[{config:{id:'next'},root}]
  manager.engine={camera,story:{scenes:[{id:'a'},{id:'b'}]},sceneManager:{activateScene(id){assert.equal(id,'b');calls++;this.isTransitioning=true}}}
  const ray=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,0,-1))
  root.visible=false;assert.equal(manager.activateRay(ray),false)
  root.visible=true;assert.equal(manager.activateRay(ray),true)
  assert.equal(manager.activateRay(ray),false);assert.equal(calls,1)
  sprite.material.dispose()
})

test('non-AR recenter uses the authored eye-height pose; tracked AR retains its separate recenter pose', () => {
  globalThis.THREE=THREE
  const config={camera:new THREE.PerspectiveCamera(),scene:new THREE.Scene(),container:{},initialPosition:{x:1.5,y:1.5,z:-1.5},initialRotation:{x:-.2,y:1,z:0},recenterPosition:{x:2,y:0,z:-1.5},recenterRotation:{x:0,y:1.57,z:0}}
  for(const tracked of [false,true]) {
    const controls=new CameraRigControls({...config,tracked})
    controls.animateTo=(position,quaternion,duration)=>{assert.equal(position.y,tracked?0:1.5);assert.equal(duration,1000);assert.ok(quaternion.angleTo(new THREE.Quaternion().setFromEuler(new THREE.Euler(...Object.values(tracked?config.recenterRotation:config.initialRotation))))<1e-6)}
    controls.recenter()
  }
  delete globalThis.THREE
})
