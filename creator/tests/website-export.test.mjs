import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { unzipSync, strFromU8 } from 'fflate'
import { normalizeStory } from '../src/utils/normalizeStory.ts'
import { websiteStory, websiteFiles, exportWebsite, safePlayerPath } from '../src/utils/websiteExport.ts'
import { mediaPaths } from '../src/utils/media.ts'
import { assertValidStory } from '../src/utils/storyDocument.ts'

const original=JSON.parse(fs.readFileSync(new URL('../../examples/shadows-rebuilt/story.json',import.meta.url),'utf8'))
function fixture() {
  const story=normalizeStory(original)
  story.embeddedAssets=Object.fromEntries(mediaPaths(story).map(path=>[path,'data:application/octet-stream;base64,AQID']))
  return story
}
test('website packaging retains Shadows screens, routes and tracking, without mutating its JSON',async()=>{
  const story=fixture(), before=JSON.stringify(story), files=new Map()
  const doc=await websiteStory(story,(name,data)=>files.set(name,data))
  assert.equal(JSON.stringify(story),before)
  assert.equal(doc.embeddedAssets,undefined)
  assert.equal(doc.ui.screenDesigner.screens.length,9)
  assert.deepEqual(doc.project.ar,story.project.ar)
  assert.deepEqual(doc.camera,story.camera)
  assert.equal(doc.scenes.length,4)
  assert.equal(doc.project.assets.basePath,'./')
  for(const path of mediaPaths(doc))assert.ok(files.has(path),path)
  for(const data of files.values())assert.deepEqual([...data],[1,2,3])
  assertValidStory(doc)
})
test('website packaging fails on missing media instead of producing a broken deployment',async()=>{
  const story=fixture();delete story.embeddedAssets[mediaPaths(story)[0]]
  await assert.rejects(websiteStory(story,()=>{}),/media is missing/)
})
test('website ZIP includes player licenses, relative launch route and media, and rejects a stale player',async()=>{
  const realFetch=globalThis.fetch
  const index=new TextEncoder().encode('<html>Player</html>'), license=new TextEncoder().encode('Vendor license')
  const file=(path,data)=>({path,sha256:createHash('sha256').update(data).digest('hex')})
  const manifest={version:1,files:[file('index.html',index),file('vendor/LICENSE',license)]}
  let stale=false
  globalThis.fetch=async value=>{
    const url=String(value)
    if(url.startsWith('data:'))return realFetch(value)
    if(url.endsWith('player-manifest.json'))return Response.json(manifest)
    if(url.endsWith('index.html'))return new Response(stale?'changed':index)
    return new Response(license)
  }
  try {
    const progress=[]
    const zip=await exportWebsite(fixture(),{},'https://example.org/story/','https://example.org/studio/player/',message=>progress.push(message))
    const files=unzipSync(new Uint8Array(await zip.arrayBuffer()))
    const direct=await websiteFiles(fixture(),{},'https://example.org/story/','https://example.org/studio/player/',()=>{})
    assert.deepEqual(Object.keys(direct).sort(),Object.keys(files).sort())
    for(const [name,data] of Object.entries(direct))assert.deepEqual(data,files[name],name)
    assert.equal(strFromU8(files['player/vendor/LICENSE']),'Vendor license')
    assert.ok(strFromU8(files['index.html']).includes('../story.json'))
    assert.ok(files['.nojekyll'])
    assert.ok(files['START-HERE.txt'])
    const doc=JSON.parse(strFromU8(files['story.json']))
    for(const path of mediaPaths(doc))assert.ok(files[path])
    assert.ok(progress.some(p=>p.startsWith('Packing player')))
    stale=true
    await assert.rejects(exportWebsite(fixture(),{},'https://example.org/','https://example.org/player/',()=>{}),/changed during export/)
  }finally{globalThis.fetch=realFetch}
})

test('cancelled website preparation never requests media or produces an upload payload',async()=>{
  const controller=new AbortController();controller.abort()
  await assert.rejects(websiteFiles(fixture(),{},'https://example.org/','https://example.org/player/',()=>{},controller.signal),{name:'AbortError'})
})
test('player manifest paths cannot escape the player folder',()=>{
  for(const name of ['../story.json','/index.html','https://other.test/x','vendor/../../x','vendor\\x','vendor/%2e%2e/x'])assert.equal(safePlayerPath(name),false,name)
  assert.equal(safePlayerPath('vendor/8thwall-slam/resources/media-worker.js'),true)
})
