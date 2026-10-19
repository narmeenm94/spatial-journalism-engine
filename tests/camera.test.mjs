import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three-runtime'
import { sampleCameraPath } from '../engine/src/controls/cameraPath.js'
import { CameraRigControls } from '../engine/src/controls/CameraRigControls.js'
import { GuidedCameraController } from '../engine/src/controls/GuidedCameraController.js'
const initial = { position: [0, 1.5, 0], rotation: [0, 0, 0] }
const stop = (time, x, duration = 2000) => ({
  id: 'at-' + time,
  time,
  position: [x, 1.5, 0],
  rotation: [0, Math.PI / 2, 0],
  duration,
  easing: 'quadratic'
})
test('camera sampling sorts times, interpolates, holds and respects zero-duration cuts', () => {
  const path = [stop(10, 20, 0), stop(0, 10)]
  assert.deepEqual(sampleCameraPath(path, 1, initial).position, [5, 1.5, 0])
  assert.deepEqual(sampleCameraPath(path, 5, initial).position, [10, 1.5, 0])
  assert.deepEqual(sampleCameraPath(path, 10, initial).position, [20, 1.5, 0])
  assert.deepEqual(
    sampleCameraPath(path, 0, initial).position,
    initial.position
  )
})
test('overlapping moves begin at the current interpolated pose', () => {
  assert.deepEqual(
    sampleCameraPath([stop(0, 10, 4000), stop(2, 20)], 3, initial).position,
    [12.5, 1.5, 0]
  )
})
test('guided cues start at the actual view, release at arrival, and preserve physical movement', () => {
  globalThis.THREE = THREE
  const camera=new THREE.PerspectiveCamera(), rig=new THREE.Object3D(); rig.add(camera)
  camera.position.set(1,1.5,0)
  let clock=0
  const controller=new GuidedCameraController(camera,rig,{a:[stop(0,10),stop(10,20)]})
  const position=()=>camera.getWorldPosition(new THREE.Vector3())
  controller.startSceneTracking('a',()=>clock)
  assert.equal(position().x,1)
  clock=1;controller.update(); assert.ok(Math.abs(position().x-5.5)<1e-6)
  const baseline=position();camera.position.z+=.5;controller.update()
  assert.ok(position().distanceTo(baseline)>.49, 'tracking movement survives guidance')
  clock=2;controller.update();assert.equal(controller.transition,null)
  rig.position.x+=2;const manual=position();clock=5;controller.update()
  assert.ok(position().distanceTo(manual)<1e-6, 'no pinning between cues')
  clock=10;controller.update();assert.ok(position().distanceTo(manual)<1e-6, 'next move begins here')
  clock=12;controller.update();assert.ok(position().distanceTo(new THREE.Vector3(20,1.5,0))<1e-6)
  controller.destroy();delete globalThis.THREE
})
test('manual navigation interrupts a move; pause, resume and seeking never snap the view', () => {
  globalThis.THREE=THREE
  const camera=new THREE.PerspectiveCamera(),rig=new THREE.Object3D();rig.add(camera)
  let clock=0;const c=new GuidedCameraController(camera,rig,{a:[stop(0,10),stop(10,20)]})
  c.startSceneTracking('a',()=>clock);clock=1;c.update();const frozen=rig.position.clone()
  c.update();assert.ok(rig.position.equals(frozen))
  c.interrupt();rig.position.x=7;clock=5;c.update();assert.equal(rig.position.x,7)
  clock=10;c.update();assert.equal(rig.position.x,7)
  clock=11;c.update();assert.ok(rig.position.x>7)
  const before=rig.position.clone();clock=0;c.update();assert.ok(rig.position.equals(before))
  c.stopSceneTracking();clock=2;c.update();assert.ok(rig.position.equals(before))
  c.startSceneTracking('a',()=>clock);assert.ok(c.recenter());c.destroy();delete globalThis.THREE
})
test('a tracking reset rebases the rig without a jump, preserving the last world view', () => {
  globalThis.THREE=THREE
  const camera=new THREE.PerspectiveCamera(),scene=new THREE.Scene(),rig=new THREE.Object3D();scene.add(rig);rig.add(camera)
  const controls=new CameraRigControls({camera,scene,container:{},bounds:{minX:-100,maxX:100,minY:-100,maxY:100,minZ:-100,maxZ:100}})
  controls.cameraRig=rig;rig.position.set(3,1.5,2);camera.rotation.y=.4;controls.update()
  const before=camera.getWorldPosition(new THREE.Vector3()), rotation=camera.getWorldQuaternion(new THREE.Quaternion())
  controls.preserveTrackingPose();camera.position.set(30,-4,12);camera.rotation.y=2;controls.update()
  assert.ok(camera.getWorldPosition(new THREE.Vector3()).distanceTo(before)<1e-6)
  assert.ok(camera.getWorldQuaternion(new THREE.Quaternion()).angleTo(rotation)<1e-6)
  delete globalThis.THREE
})
