import test from 'node:test'
import assert from 'node:assert/strict'
import { targetCrop } from '../src/utils/imageTarget.ts'
test('landscape photos become centered portrait targets without stretching',()=>{
 const crop=targetCrop(1920,1080)
 assert.equal(crop.width,810);assert.equal(crop.height,1080);assert.equal(crop.left,555);assert.equal(crop.top,0)
 assert.equal(crop.originalWidth,1920)
})
test('portrait photos crop vertically and reject insufficient resolution',()=>{
 const crop=targetCrop(600,1200)
 assert.equal(crop.width,600);assert.equal(crop.height,800);assert.equal(crop.top,200)
 assert.throws(()=>targetCrop(30,40),/larger image/)
 assert.throws(()=>targetCrop(NaN,400),/invalid/)
})
