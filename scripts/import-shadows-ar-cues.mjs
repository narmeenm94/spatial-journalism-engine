// Preserve original phone destinations separately from the existing Web 3D views.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import * as THREE from 'three-runtime'
const source=fs.readFileSync(path.resolve(process.argv[2],'src/guided-camera-controller.js'),'utf8')
const context=vm.createContext({THREE,console:{log(){}},navigator:{userAgent:''},window:{},globalState:{mode:'exploration'},document:{addEventListener(){}}})
vm.runInContext(source.replace(/^import .*$/gm,'').replace(/^export /gm,'')+'\nglobalThis.controller=new GuidedCameraController(new THREE.PerspectiveCamera(),new THREE.Object3D());',context)
const controller=context.controller
const storyPath=new URL('../examples/shadows-rebuilt/story.json',import.meta.url)
const story=JSON.parse(fs.readFileSync(storyPath,'utf8'))
let count=0
for(const [scene,cues] of Object.entries(story.camera.guided)) for(const cue of cues) {
  const original=controller.sceneCameraPositions[scene].find(item=>item.time===cue.time)
  assert.ok(original,`${scene}:${cue.time}`)
  const animation=controller.animations.find(item=>item.id===original.positionId)
  const position=new THREE.Vector3(1.5,0,-1.5).applyQuaternion(animation.quaternion).add(animation.position)
  const quaternion=animation.quaternion.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI/2))
  cue.arPosition=position.toArray()
  const e=new THREE.Euler().setFromQuaternion(quaternion)
  cue.arRotation=[e.x,e.y,e.z]
  count++
}
fs.writeFileSync(storyPath,JSON.stringify(story,null,2)+'\n')
console.log(`Imported ${count} original phone destinations.`)
