import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
import { normalizeStory } from '../creator/src/utils/normalizeStory.ts'
import { mediaPaths } from '../creator/src/utils/media.ts'
import { portableStory } from '../creator/src/utils/export.ts'
import { assertValidStory } from '../creator/src/utils/storyDocument.ts'
import { TestFileReader } from '../creator/tests/file-reader.mjs'
globalThis.FileReader = TestFileReader
const root = new URL('../examples/shadows-rebuilt/', import.meta.url)
const story = normalizeStory(
  JSON.parse(fs.readFileSync(new URL('story.json', root)))
)
const files = {},
  report = []
for (const name of mediaPaths(story)) {
  const data = fs.readFileSync(new URL('assets/' + name, root))
  files[name] = new File([data], name)
  report.push({
    path: name,
    bytes: data.length,
    sha256: crypto.createHash('sha256').update(data).digest('hex')
  })
}
const portable = await portableStory(story, files)
const json = JSON.stringify(portable)
const reopened = normalizeStory(JSON.parse(json))
assertValidStory(reopened)
assert.deepEqual(reopened.camera, story.camera, 'Single JSON round trip preserves tracked heights and every phone destination')
assert.equal(reopened.ending.mediaBehavior, story.ending.mediaBehavior, 'Single JSON preserves ending narration behavior')
assert.deepEqual(reopened.scenes.at(-1).characters, story.scenes.at(-1).characters, 'Single JSON preserves final character timing')
for (const item of report) {
  const bytes = Buffer.from(
    reopened.embeddedAssets[item.path].split(',')[1],
    'base64'
  )
  assert.equal(
    crypto.createHash('sha256').update(bytes).digest('hex'),
    item.sha256,
    item.path
  )
}
assert.equal(reopened.scenes.length, 4)
assert.deepEqual(reopened.project.languages, ['en', 'fi'])
const result = {
  title: story.project.title,
  chapters: 4,
  cameraStops: Object.values(reopened.camera.guided).flat().length,
  ambientSources: reopened.ambience.length,
  navigation: reopened.camera.navigation,
  languages: story.project.languages,
  referencedFiles: report.length,
  missingFiles: 0,
  portableBytes: Buffer.byteLength(json),
  verifiedMediaHashes: report.length,
  files: report
}
if (process.argv[2]) {
  const destination = path.resolve(process.argv[2])
  fs.mkdirSync(destination, { recursive: true })
  fs.writeFileSync(path.join(destination, 'shadows-portable.json'), json)
  fs.writeFileSync(
    path.join(destination, 'verification.json'),
    JSON.stringify(result, null, 2)
  )
  console.log('Saved verified export to ' + destination)
}
console.log(JSON.stringify({ ...result, files: undefined }, null, 2))
