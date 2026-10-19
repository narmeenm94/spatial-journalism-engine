import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { normalizeStory } from '../creator/src/utils/normalizeStory.ts'
import { mediaPaths } from '../creator/src/utils/media.ts'
import { assertValidStory } from '../creator/src/utils/storyDocument.ts'

// Read-only verification against the rebuilt Shadows reference. No credentials.
const base = new URL(process.argv[2])
assert.equal(base.protocol, 'https:')
assert.ok(!base.username && !base.password)
const repo = fileURLToPath(new URL('../', import.meta.url))
const source = path.join(repo, 'examples/shadows-rebuilt')
const original = normalizeStory(JSON.parse(await fs.readFile(path.join(source, 'story.json'), 'utf8')))
async function get(relative) {
  const url = new URL(relative, base)
  assert.equal(url.origin, base.origin)
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(60000) })
  assert.ok(response.ok, relative + ': HTTP ' + response.status)
  return Buffer.from(await response.arrayBuffer())
}
const hash = data => createHash('sha256').update(data).digest('hex')
const hosted = normalizeStory(JSON.parse((await get('story.json')).toString()))
assertValidStory(hosted)
assert.deepEqual(hosted.camera, original.camera, 'Hosted story must contain the exact reference camera configuration')
assert.equal(hosted.ending.mediaBehavior, original.ending.mediaBehavior, 'Hosted ending preserves source narration overlap')
assert.equal(hosted.scenes.at(-1).characters.find(c=>c.id==='oleh-scene4').delay, original.scenes.at(-1).characters.find(c=>c.id==='oleh-scene4').delay, 'Hosted final character preserves the original effective delay')
const localPaths = mediaPaths(original), remotePaths = mediaPaths(hosted)
const localHashes = new Map()
for (const name of localPaths) localHashes.set(name, hash(await fs.readFile(path.join(source, 'assets', name))))
const knownHashes = new Set(localHashes.values()), receivedHashes = new Set()
let mediaBytes = 0
for (const name of remotePaths) {
  const actual = await get(name)
  const digest = hash(actual)
  assert.ok(knownHashes.has(digest), 'Media does not match a reference asset: ' + name)
  receivedHashes.add(digest)
  mediaBytes += actual.length
}
const manifest = JSON.parse((await get('player/player-manifest.json')).toString())
for (const file of manifest.files) {
  assert.ok(!file.path.split('/').includes('..'))
  assert.equal(hash(await get('player/' + file.path)), file.sha256, file.path)
  assert.equal(hash(await fs.readFile(path.join(repo, 'dist', file.path))), file.sha256, 'Local built player: ' + file.path)
}
console.log(JSON.stringify({ url: base.href, chapters: hosted.scenes.length, screens: hosted.ui.screenDesigner.screens.length, mediaHashesVerified: remotePaths.length, referenceMediaNotUsed: localPaths.filter(name => !receivedHashes.has(localHashes.get(name))), mediaBytes, playerHashesVerified: manifest.files.length, verifiedAt: new Date().toISOString() }, null, 2))
