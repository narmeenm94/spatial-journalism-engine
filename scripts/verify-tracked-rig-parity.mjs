// Run the original rig, unmodified apart from module imports, beside the port.
// Usage: node scripts/verify-tracked-rig-parity.mjs <reference repository>
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import * as THREE from 'three-runtime'
import { CameraRigControls } from '../engine/src/controls/CameraRigControls.js'
import { trackedNavigation } from '../engine/src/controls/trackedNavigation.js'

const sourcePath = path.resolve(process.argv[2], 'src/camera-rig-controls.js')
const source = fs.readFileSync(sourcePath, 'utf8')
const executable = source.replace(/^import .*$/gm, '').replace(/^export /gm, '')
globalThis.THREE = THREE
const results = []
for (const os of ['android', 'ios', 'unknown']) for (const guided of [false, true]) for (const isUsingApp of os === 'ios' ? [false, true] : [false]) {
  let now = 0, originalFrames = [], portFrames = []
  const originalCamera = new THREE.PerspectiveCamera(), originalScene = new THREE.Scene()
  originalCamera.position.set(1.5, 1.6, -1.5); originalCamera.rotation.y = Math.PI / 2; originalScene.add(originalCamera)
  const mouseEvents = new Map()
  const canvas = {addEventListener:(name, fn)=>mouseEvents.set(name,fn)}
  const context = vm.createContext({THREE, console:{log(){}}, recenterIcon:'',
    performance:{now:()=>now}, requestAnimationFrame:fn=>originalFrames.push(fn), setTimeout:fn=>fn(),
    document:{addEventListener(){},getElementById:()=>canvas,createElement:()=>({style:{},appendChild(){},addEventListener(){}}),body:{appendChild(){}}},
    globalState:{mobile:true,android:os==='android',ios:os==='ios',isUsingApp,orientation:true,mode:guided?'guided':'exploration'},
    XR8:{Threejs:{xrScene:()=>({camera:originalCamera,scene:originalScene})}}
  })
  vm.runInContext(executable + '\nglobalThis.reference = { pipeline: initCameraRigControls(), animateCamera, rig: () => cameraRig };',context)
  const reference = context.reference
  reference.pipeline.onStart()
  const camera = new THREE.PerspectiveCamera(), scene = new THREE.Scene()
  camera.position.copy(originalCamera.position); camera.quaternion.copy(originalCamera.quaternion);scene.add(camera)
  const port = new CameraRigControls({camera,scene,container:{},tracked:true,trackingNavigation:trackedNavigation({}, {guided,device:{os},isUsingApp})})
  port.setupControls=()=>{};port.createRecenterButton=()=>{};port.init()
  const previousRAF=globalThis.requestAnimationFrame, previousPerformance=globalThis.performance
  globalThis.requestAnimationFrame=fn=>portFrames.push(fn)
  globalThis.performance={now:()=>now}
  let maxPositionError=0, maxQuaternionError=0
  const compare = label => {
    const a=reference.rig(), b=port.cameraRig
    const p=a.position.distanceTo(b.position), q=1-Math.abs(a.quaternion.dot(b.quaternion))
    maxPositionError=Math.max(maxPositionError,p);maxQuaternionError=Math.max(maxQuaternionError,q)
    assert.ok(p<1e-8 && q<1e-8, `${os}/${guided}/${isUsingApp} ${label}: position=${p} quaternion=${q}`)
    assert.ok(originalCamera.position.distanceTo(camera.position)<1e-8, 'camera local height policy')
    assert.ok(1-Math.abs(originalCamera.quaternion.dot(camera.quaternion))<1e-8, 'camera local orientation')
  }
  try {
    for(let frame=0;frame<240;frame++) {
      now=frame*16
      for(const fn of originalFrames.splice(0)) fn(now)
      for(const fn of portFrames.splice(0)) fn(now)
      // Same changing sensor frame, including pitch, roll, height and large
      // translations that cross room boundaries and coaching transitions.
      const p=new THREE.Vector3(1.5+Math.sin(frame*.023)*2,1.6+Math.sin(frame*.03)*.3,-1.5+Math.cos(frame*.017)*2)
      const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(.3*Math.sin(frame*.02),1.1+frame*.004,.25*Math.cos(frame*.03)))
      // Abrupt coordinate changes at loss/recovery, not only smooth movement.
      const epoch=[30,90,150,180].filter(f=>frame>=f).length
      const reset=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),epoch*.7)
      p.applyQuaternion(reset).add(new THREE.Vector3(epoch*1.3,0,-epoch*.8))
      q.premultiply(reset)
      originalCamera.position.copy(p);camera.position.copy(p)
      originalCamera.quaternion.copy(q);camera.quaternion.copy(q)
      if([30,90,150,180].includes(frame)) {
        const active=frame!==90
        reference.pipeline.listeners.find(l=>l.event===`coaching-overlay.${active?'hide':'show'}`).process()
        port.preserveTrackingPose(active)
      }
      if(frame===45 || frame===170) {
        const target=new THREE.Vector3(frame===45?1.5:2,0,-1.5), rotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,Math.PI/2,0))
        reference.animateCamera(1000,target,rotation)
        port.animateTo(target,rotation,1000)
      }
      if(frame===120) {
        mouseEvents.get('mousedown')({clientX:100,clientY:100})
        mouseEvents.get('mousemove')({clientX:120,clientY:90})
        mouseEvents.get('mouseup')()
        port.moveCamera(10,20)
      }
      reference.pipeline.onRender();port.update();compare('frame '+frame)
    }
  } finally {globalThis.requestAnimationFrame=previousRAF;globalThis.performance=previousPerformance}
  results.push({os,mode:guided?'guided':'explore',isUsingApp,frames:240,maxPositionError,maxQuaternionError})
}
console.log(JSON.stringify({reference:sourcePath,sha256:createHash('sha256').update(source).digest('hex'),results},null,2))
