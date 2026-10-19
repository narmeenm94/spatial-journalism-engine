import test from 'node:test'
import assert from 'node:assert/strict'
import { createMotionPermission } from '../engine/src/xr/MotionPermission.js'

test('iPhone motion and orientation requests begin in the same gesture and share a pending request', async () => {
  const calls = []
  let grant
  const pending = new Promise(resolve=>{grant=resolve})
  const permission = createMotionPermission({
    DeviceMotionEvent:{requestPermission(){calls.push('motion');return pending}},
    DeviceOrientationEvent:{requestPermission(){calls.push('orientation');return pending}}
  })
  assert.equal(permission.needsGesture(),true)
  const first=permission.request(), second=permission.request()
  assert.deepEqual(calls,['motion','orientation'])
  assert.equal(first,second)
  grant('granted'); await first
  assert.equal(permission.needsGesture(),false)
  await permission.request();assert.equal(calls.length,2)
})
test('denied motion access remains retryable and does not silently start AR', async () => {
  let answer='denied'
  const permission=createMotionPermission({DeviceMotionEvent:{requestPermission:()=>Promise.resolve(answer)}})
  await assert.rejects(permission.request(),/Allow motion/)
  assert.equal(permission.needsGesture(),true)
  answer='granted';await permission.request();assert.equal(permission.needsGesture(),false)
})
test('devices without explicit motion permission need no prompt', async()=>{
  const permission=createMotionPermission({})
  assert.equal(permission.needsGesture(),false);await permission.request()
})
