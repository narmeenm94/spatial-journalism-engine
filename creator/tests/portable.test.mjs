import test from 'node:test'
import assert from 'node:assert/strict'
import { portableStory } from '../src/utils/export.ts'
import { useStore } from '../src/state/store.ts'
import { normalizeStory } from '../src/utils/normalizeStory.ts'
import { TestFileReader } from './file-reader.mjs'
globalThis.FileReader = TestFileReader

test('export embeds binary media exactly and reopening needs no local file', async () => {
  useStore.getState().resetStory()
  const raw = structuredClone(useStore.getState().story)
  raw.project.assets.environment = 'models/room.glb'
  const bytes = new Uint8Array([103, 108, 84, 70, 0, 255, 42])
  const doc = await portableStory(raw, {
    'models/room.glb': new File([bytes], 'room.glb', {
      type: 'model/gltf-binary'
    })
  })
  assert.deepEqual(
    Buffer.from(doc.embeddedAssets['models/room.glb'].split(',')[1], 'base64'),
    Buffer.from(bytes)
  )
  const reopened = normalizeStory(JSON.parse(JSON.stringify(doc)))
  const again = await portableStory(reopened)
  assert.equal(
    again.embeddedAssets['models/room.glb'],
    doc.embeddedAssets['models/room.glb']
  )
})
test('missing media fails export without changing the workspace', async () => {
  useStore.getState().resetStory()
  const raw = structuredClone(useStore.getState().story)
  raw.project.assets.environment = 'missing.glb'
  const before = JSON.stringify(raw)
  await assert.rejects(portableStory(raw), /Missing media: missing.glb/)
  assert.equal(JSON.stringify(raw), before)
})

test('files with missing browser MIME still export as playable media', async () => {
  useStore.getState().resetStory()
  const story = structuredClone(useStore.getState().story)
  story.project.assets.environment = 'models/room.glb'
  const doc = await portableStory(story, {
    'models/room.glb': new File(['glTF'], 'room.glb')
  })
  assert.ok(
    doc.embeddedAssets['models/room.glb'].startsWith(
      'data:model/gltf-binary;base64,'
    )
  )
})
