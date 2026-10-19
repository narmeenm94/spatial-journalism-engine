import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three-runtime'
import { CameraRigControls } from '../engine/src/controls/CameraRigControls.js'
import { GuidedCameraController } from '../engine/src/controls/GuidedCameraController.js'
import { trackedNavigation } from '../engine/src/controls/trackedNavigation.js'
import { createEighthWallScene } from '../engine/src/xr/EighthWall.js'

globalThis.THREE = THREE
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`)
function fixture(os = 'android', guided = false) {
  const camera = new THREE.PerspectiveCamera(), rig = new THREE.Object3D(), scene = new THREE.Scene()
  scene.add(rig); rig.add(camera)
  const controls = new CameraRigControls({ camera, scene, container: {}, tracked: true,
    trackingNavigation: trackedNavigation({ initialPosition: [1.5, 1.6, -1.5] }, { guided, device: { os } }),
    bounds: { minX: -10, maxX: 10, minY: -2, maxY: 5, minZ: -10, maxZ: 10 }, buffer: 0.5 })
  controls.cameraRig = rig
  const world = () => camera.getWorldPosition(new THREE.Vector3())
  const upright = () => assert.ok(new THREE.Vector3(0, 1, 0).applyQuaternion(rig.quaternion).distanceTo(new THREE.Vector3(0, 1, 0)) < 1e-6)
  return { camera, rig, controls, world, upright }
}

test('device and mode tracking policy matches original, with serializable height overrides', () => {
  for (const os of ['android', 'ios']) {
    assert.equal(trackedNavigation({}, { guided: false, device: { os } }).orientationOnly, false)
    assert.equal(trackedNavigation({}, { guided: true, device: { os } }).orientationOnly, true)
    assert.equal(trackedNavigation({ guidedTracking: 'world' }, { guided: true, device: { os } }).orientationOnly, false)
  }
  const app = trackedNavigation({}, { guided: true, device: { os: 'ios' }, isUsingApp: true })
  assert.equal(app.orientationOnly, false); assert.equal(app.fixedHeight, true)
  const json = JSON.parse(JSON.stringify({ trackedHeight: { android: 2, guided: 1.8 } }))
  assert.equal(trackedNavigation(json, { device: { os: 'android' } }).heights.android, 2)
})

test('tilted phone startup and recenter leave the rig upright and preserve device look direction', () => {
  const f = fixture()
  f.camera.position.set(.2, .15, -.3)
  f.camera.rotation.set(.6, .4, -.35)
  const localRotation = f.camera.quaternion.clone()
  f.controls.setPosition(new THREE.Vector3(2, 0, -1.5), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0)))
  f.controls.update(); f.upright()
  near(f.world().y, 1.4)
  assert.ok(f.camera.quaternion.equals(localRotation), 'rig cannot overwrite sensor orientation')
  const before = f.world()
  f.camera.position.x += .3
  f.controls.update(); near(f.world().distanceTo(before), .3)
  f.controls.moveCamera(20, 30); f.controls.update(); f.upright(); near(f.world().y, 1.4)
})

test('original Android and iOS Explore height policies apply after tracking changes', () => {
  for (const [os, height] of [['android', 1.25], ['ios', .5]]) {
    const f = fixture(os)
    f.camera.position.set(.1, .2, .3); f.controls.update()
    f.controls.preserveTrackingPose(true)
    f.camera.position.set(1, .2, 2); f.camera.rotation.set(.2, 1.2, .4)
    f.controls.update(); f.upright()
    near(f.world().y, height + .2)
    f.controls.preserveTrackingPose(false); f.controls.update(); f.upright(); near(f.world().y, height + .2)
  }
})

test('tracking recovery preserves the last view when coaching events arrive after XR update', async () => {
  const previousDocument = globalThis.document
  globalThis.document = { createElement: () => ({ style: {}, remove() {} }) }
  try { for (const os of ['android', 'ios']) {
    const f = fixture(os)
    let modules, sensorPose, rendered
    const events = []
    const tracking = active => events.push(() => modules.at(-1).listeners
      .find(l => l.event === `coaching-overlay.${active ? 'hide' : 'show'}`).process())
    const xr = {
      XrController: { configure() {}, pipelineModule: () => ({}) },
      GlTextureRenderer: { pipelineModule: () => ({}) },
      Threejs: {
        xrScene: () => ({ camera: f.camera, scene: f.rig.parent }),
        pipelineModule: () => ({ name: 'three',
          onUpdate() {
            f.camera.position.copy(sensorPose.position)
            f.camera.quaternion.copy(sensorPose.quaternion)
          },
          onRender() { rendered = { position: f.world(), quaternion: f.camera.getWorldQuaternion(new THREE.Quaternion()) } }
        })
      },
      XrConfig: { device: () => ({ ANY: 'any' }) },
      addCameraPipelineModules(m) { modules = m }, stop() {},
      run() { modules.at(-1).onStart() }
    }
    await createEighthWallScene(xr, {
      container: { prepend() {} }, updateBeforeRender: true,
      onUpdate: () => f.controls.update(),
      onTracking: detail => f.controls.preserveTrackingPose(detail.status === 'NORMAL')
    })
    const frame = () => {
      for (const module of modules) module.onUpdate?.()
      // XR8 flushes nested coaching notifications after all update callbacks.
      for (const event of events.splice(0)) event()
      for (const module of modules) module.onRender?.()
    }
    sensorPose = { position: new THREE.Vector3(.3, .2, -.4), quaternion: new THREE.Quaternion() }
    frame()
    for (const [active, x, z, yaw] of [[false, 3, -2, 1.2], [true, -4, 3, -.8], [false, 1, 4, .5], [true, 2, -3, -.3]]) {
      const before = rendered
      sensorPose = { position: new THREE.Vector3(x, .2, z), quaternion: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw) }
      tracking(active); frame()
      assert.ok(rendered.position.distanceTo(before.position) < 1e-6, `${os}: no translation jump on ${active ? 'recovery' : 'loss'}`)
      assert.ok(rendered.quaternion.angleTo(before.quaternion) < 1e-6, `${os}: no heading jump`)
      f.upright()
      const stable = rendered.position.clone()
      frame(); assert.ok(rendered.position.distanceTo(stable) < 1e-6, 'no delayed jump on the following frame')
    }
    const beforeMove = rendered.position.clone()
    sensorPose.position.x += .2; frame()
    near(rendered.position.distanceTo(beforeMove), .2)
  }} finally { globalThis.document = previousDocument }
})

test('guided travel solves against the current tracked pose and cannot tilt or lower the rig', () => {
  const f = fixture('android', true)
  f.camera.rotation.set(.4, .2, -.3)
  f.controls.prepareTrackedCamera()
  f.controls.setPosition(new THREE.Vector3(1.5, 1.5, -1.5), new THREE.Quaternion())
  f.controls.update()
  let time = 0
  let frames = []
  const previousRAF = globalThis.requestAnimationFrame, previousPerformance = globalThis.performance
  globalThis.requestAnimationFrame = fn => frames.push(fn)
  globalThis.performance = {now: () => time * 1000}
  const guide = new GuidedCameraController(f.camera, f.rig, { a: [{ time: 0, position: [0, 0, 0], rotation: [.5, 1, .2], duration: 2000 }] }, {
    animateTrackedPose: (position, quaternion, duration) => f.controls.animateTo(position, quaternion, duration)
  })
  try {
  guide.startSceneTracking('a', () => time)
  for (time = .25; time <= 2; time += .25) {
    for (const callback of frames.splice(0)) callback(time * 1000)
    // Simulate a new XR8 sensor pose each frame, including phone roll.
    f.camera.position.set(5, -3, 1); f.camera.rotation.set(.3 + time / 10, .2 + time / 5, -.4)
    f.controls.prepareFrame(); guide.update(); f.controls.update(true)
    f.upright(); near(f.world().y, 1.5)
  }
  assert.equal(guide.transition, null)
  const before = f.camera.getWorldQuaternion(new THREE.Quaternion())
  f.camera.rotation.x += .2; f.controls.update()
  assert.ok(before.angleTo(f.camera.getWorldQuaternion(new THREE.Quaternion())) > .1, 'physical look remains live')
  } finally { globalThis.requestAnimationFrame = previousRAF; globalThis.performance = previousPerformance }
})

test('phone guidance uses imported AR targets while desktop keeps its authored view', () => {
  const cue={time:0,position:[1,1.5,2],rotation:[-.2,1,0],arPosition:[3,0,4],arRotation:[0,.7,0],duration:2000}
  const camera=new THREE.PerspectiveCamera(),rig=new THREE.Object3D();rig.add(camera)
  let received
  const phone=new GuidedCameraController(camera,rig,{a:[cue]},{animateTrackedPose:(position,quaternion)=>{received={position,quaternion}}})
  phone.startSceneTracking('a',()=>0)
  assert.deepEqual(received.position.toArray(),cue.arPosition)
  assert.ok(received.quaternion.angleTo(new THREE.Quaternion().setFromEuler(new THREE.Euler(...cue.arRotation)))<1e-6)
  const desktop=new GuidedCameraController(camera,rig,{a:[cue]})
  desktop.startSceneTracking('a',()=>0)
  assert.deepEqual(desktop.transition.toPosition.toArray(),cue.position)
})

test('animated recenter remains above the floor throughout the move', () => {
  const f = fixture()
  f.camera.position.y = .1; f.camera.rotation.set(.5, .2, .3); f.controls.update()
  const frames = [], previous = globalThis.requestAnimationFrame
  globalThis.requestAnimationFrame = callback => frames.push(callback)
  try {
    const start = performance.now()
    f.controls.animateTo(new THREE.Vector3(2, 0, -1.5), new THREE.Quaternion(), 1000)
    for (let step = 0; frames.length && step < 12; step++) {
      f.camera.rotation.z += .01
      frames.shift()(start + step * 110)
      f.controls.update(); f.upright(); near(f.world().y, 1.35)
    }
    assert.equal(f.controls.isAnimating, false)
  } finally { globalThis.requestAnimationFrame = previous }
})
