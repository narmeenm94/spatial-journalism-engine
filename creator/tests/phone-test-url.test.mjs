import test from 'node:test'
import assert from 'node:assert/strict'
import { phoneTestUrl } from '../src/utils/phoneTestUrl.ts'

test('phone links preserve hosted subpaths, story selection and language',()=>{
  const url='https://example.org/reports/clinic/player/?story=../story.json&lang=fi#intro'
  assert.equal(phoneTestUrl('  '+url+'  '),url)
})
test('phone links reject insecure addresses, loopback and studio-only sources',()=>{
  for(const value of ['not a URL','http://example.org','https://localhost/','https://localhost./','https://app.localhost/','https://127.0.0.1/','https://[::1]/','https://0.0.0.0/','javascript:alert(1)','https://user:password@example.org/','https://example.org/?source=postMessage','https://example.org/?story=blob:local','https://example.org/'+ 'x'.repeat(1800)])
    assert.throws(()=>phoneTestUrl(value),Error,value)
})
