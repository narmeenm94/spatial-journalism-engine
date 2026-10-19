import test from 'node:test'
import assert from 'node:assert/strict'
import { isMobileDevice, detectDevice, resolveExperienceMode } from '../engine/src/xr/device.js'
test('automatic AR recognises phones and iPads without treating touch laptops as phones',()=>{
  assert.equal(isMobileDevice({userAgent:'Mozilla Windows NT',platform:'Win32',maxTouchPoints:10}),false)
  assert.equal(isMobileDevice({userAgent:'Mozilla Macintosh',platform:'MacIntel',maxTouchPoints:0}),false)
  assert.equal(isMobileDevice({userAgent:'Mozilla Macintosh',platform:'MacIntel',maxTouchPoints:5}),true)
  assert.equal(isMobileDevice({userAgent:'Mozilla Android 14',platform:'Linux',maxTouchPoints:5}),true)
  assert.equal(isMobileDevice({userAgent:'Mozilla iPhone',platform:'iPhone',maxTouchPoints:5}),true)
})

const devices = [
  [{userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',platform:'Win32',maxTouchPoints:10},'desktop','windows'],
  [{userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',platform:'MacIntel',maxTouchPoints:0},'desktop','macos'],
  [{userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',platform:'MacIntel',maxTouchPoints:5},'tablet','ios'],
  [{userAgent:'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)',platform:'iPad',maxTouchPoints:5},'tablet','ios'],
  [{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',platform:'iPhone'},'phone','ios'],
  [{userAgent:'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36'},'phone','android'],
  [{userAgent:'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0 Safari/537.36'},'tablet','android'],
  [{userAgent:'Mozilla/5.0',userAgentData:{platform:'Android',mobile:true}},'phone','android'],
  [{userAgent:'Mozilla/5.0 (X11; Linux x86_64)',platform:'Linux x86_64'},'desktop','linux']
]
test('device identity distinguishes form factor and operating system, including desktop-style iPadOS',()=>{
  for(const [device,type,os] of devices) assert.deepEqual(detectDevice(device),{type,os,mobile:type!=='desktop'})
})
test('automatic and explicit Phone AR links use desktop 3D while preserving mobile AR and explicit VR',()=>{
  for(const [device,type] of devices) {
    for(const request of ['auto','ar',undefined]) assert.equal(resolveExperienceMode(request,['ar','3d'],device),type==='desktop'?'3d':'ar')
    assert.equal(resolveExperienceMode('3d',['ar','3d'],device),'3d')
    assert.equal(resolveExperienceMode('vr',['vr'],device),'vr')
    assert.equal(resolveExperienceMode('auto',['3d'],device),'3d')
  }
  assert.equal(resolveExperienceMode('ar',['ar'],devices[0][0]),'3d')
  assert.equal(resolveExperienceMode('auto',['vr'],devices[0][0]),'vr')
})
