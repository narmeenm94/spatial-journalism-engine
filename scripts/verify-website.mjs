import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { normalizeStory } from '../creator/src/utils/normalizeStory.ts'
import { mediaPaths } from '../creator/src/utils/media.ts'
import { exportWebsite } from '../creator/src/utils/websiteExport.ts'
import { assertValidStory } from '../creator/src/utils/storyDocument.ts'
import { TestFileReader } from '../creator/tests/file-reader.mjs'

// Exercise the same ZIP builder as Preview using actual media and built files.
globalThis.FileReader = TestFileReader
const repo = fileURLToPath(new URL('../', import.meta.url))
const destination = path.resolve(process.argv[2] || path.join(repo, '../verified-exports/reference-parity'))
const source = path.join(repo, 'examples/shadows-rebuilt')
const story = normalizeStory(JSON.parse(fs.readFileSync(path.join(source, 'story.json'), 'utf8')))
const files = Object.fromEntries(mediaPaths(story).map(name => [name, new File([fs.readFileSync(path.join(source, 'assets', name))], name)]))
const realFetch = globalThis.fetch
const playerBase = pathToFileURL(path.join(repo, 'dist') + path.sep)
globalThis.fetch = async input => {
  const url = new URL(input)
  if (url.protocol !== 'file:') return realFetch(input)
  const data = fs.readFileSync(fileURLToPath(url))
  return new Response(data)
}
const zip = await exportWebsite(story, files, '', playerBase.href, text => { if(text.startsWith('Packing player 1 /')) console.log(text) })
fs.mkdirSync(destination, { recursive: true })
fs.writeFileSync(path.join(destination, 'shadows-website.zip'), Buffer.from(await zip.arrayBuffer()))
const { unzipSync } = await import('../creator/node_modules/fflate/esm/index.mjs')
const unpacked = unzipSync(new Uint8Array(await zip.arrayBuffer()))
const hosted = normalizeStory(JSON.parse(new TextDecoder().decode(unpacked['story.json'])))
assertValidStory(hosted)
assert.deepEqual(hosted.camera, story.camera, 'Website export preserves the complete tracked camera configuration')
const originalPaths = mediaPaths(story), hostedPaths = mediaPaths(hosted)
assert.equal(originalPaths.length, hostedPaths.length)
const hash = data => crypto.createHash('sha256').update(data).digest('hex')
for (let i = 0; i < originalPaths.length; i++) {
  assert.equal(hash(unpacked[hostedPaths[i]]), hash(fs.readFileSync(path.join(source, 'assets', originalPaths[i]))), originalPaths[i])
}
const manifest = JSON.parse(new TextDecoder().decode(unpacked['player/player-manifest.json']))
for(const file of manifest.files) assert.equal(hash(unpacked['player/' + file.path]), file.sha256, file.path)
for(const [name, bytes] of Object.entries(unpacked)) {
  const out = path.resolve(destination, 'website', name)
  assert.ok(out.startsWith(path.join(destination, 'website') + path.sep))
  fs.mkdirSync(path.dirname(out), {recursive:true})
  fs.writeFileSync(out, bytes)
}
const report = {chapters:hosted.scenes.length, screens:hosted.ui.screenDesigner.screens.length, mediaHashesVerified:hostedPaths.length, playerHashesVerified:manifest.files.length, zipBytes:zip.size, runtime:hosted.project.ar.runtime, output:destination}
fs.writeFileSync(path.join(destination,'website-verification.json'), JSON.stringify(report,null,2))
console.log(JSON.stringify(report,null,2))
