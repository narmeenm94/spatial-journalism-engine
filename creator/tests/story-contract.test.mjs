import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { normalizeStory } from '../src/utils/normalizeStory.ts'
import { storyDocument, assertValidStory } from '../src/utils/storyDocument.ts'
import { JSONParser } from '../../engine/src/core/JSONParser.js'
import { useStore } from '../src/state/store.ts'
for (const path of [
  'examples/shadows-rebuilt/story.json',
  'templates/interview/story.json',
  'templates/historical/story.json'
])
  test('round trip: ' + path, () => {
    const raw = JSON.parse(
      fs.readFileSync(new URL('../../' + path, import.meta.url))
    )
    const doc = storyDocument(normalizeStory(raw))
    assertValidStory(doc)
    const again = storyDocument(normalizeStory(JSON.parse(JSON.stringify(doc))))
    assert.deepEqual(again, doc)
    assert.deepEqual(doc.ui.controls.showSkip, raw.ui.controls.showSkip)
    assert.deepEqual(
      doc.scenes.map((s) => s.id),
      raw.scenes.map((s) => s.id)
    )
    const parser = new JSONParser()
    parser.storyBaseUrl = 'https://example.com/story/'
    const before = parser.normalize(raw),
      after = parser.normalize(doc)
    for (let i = 0; i < before.scenes.length; i++) {
      assert.deepEqual(
        after.scenes[i].audio.map((a) => a.url),
        before.scenes[i].audio.map((a) => a.url)
      )
      assert.deepEqual(
        after.scenes[i].videos.map((v) => v.triggerAt),
        before.scenes[i].videos.map((v) => v.triggerAt)
      )
      assert.deepEqual(
        after.scenes[i].lighting?.effects?.map((e) => e.type) || [],
        before.scenes[i].lighting?.effects?.map((e) => e.type) || []
      )
    }
  })
test('localized captions retain independent timing and unknown fields', () => {
  useStore.getState().resetStory()
  const raw = structuredClone(useStore.getState().story)
  raw.custom = { publisher: 'Example' }
  raw.scenes[0].custom = { value: 42 }
  raw.scenes[0].subtitles = {
    en: [
      { start: 0, end: 2, text: 'Hello' },
      { start: 3, end: 5, text: 'Again' }
    ],
    fi: [{ start: 1, end: 2.5, text: 'Hei' }]
  }
  const story = normalizeStory(raw)
  assert.equal(story.scenes[0].subtitles.length, 3)
  assert.deepEqual(
    story.scenes[0].subtitles.map((s) => [s.start, s.end]),
    [
      [0, 2],
      [1, 2.5],
      [3, 5]
    ]
  )
  const exported = storyDocument(story)
  assert.deepEqual(exported.custom, raw.custom)
  assert.deepEqual(exported.scenes[0].custom, raw.scenes[0].custom)
})
test('edited canonical values override old aliases and preserve zero timing', () => {
  useStore.getState().resetStory()
  const raw = structuredClone(useStore.getState().story)
  raw.scenes[0].name = 'Old'
  raw.scenes[0].title = { en: 'New' }
  raw.scenes[0].audio = [
    {
      id: 'a',
      file: 'new.mp3',
      url: 'old.mp3',
      volume: 0,
      delay: 0,
      loop: false,
      positional: false
    }
  ]
  raw.scenes[0].videos = [
    {
      id: 'v',
      url: 'movie.mp4',
      triggerAt: 12,
      triggerTime: 0,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      size: [2, 1],
      opacity: 1,
      loop: false,
      muted: true
    }
  ]
  const doc = storyDocument(normalizeStory(raw))
  const p = new JSONParser()
  p.storyBaseUrl = 'https://example.com/'
  const result = p.normalize(doc)
  assert.equal(result.scenes[0].name, 'New')
  assert.match(result.scenes[0].audio[0].url, /new.mp3$/)
  assert.equal(result.scenes[0].audio[0].volume, 0)
  assert.equal(result.scenes[0].videos[0].triggerAt, 0)
})
test('invalid chapters and caption timings are rejected before replacement', () => {
  useStore.getState().resetStory()
  const raw = structuredClone(useStore.getState().story)
  raw.scenes.push(structuredClone(raw.scenes[0]))
  assert.throws(() => assertValidStory(raw), /unique/)
  raw.scenes.pop()
  raw.scenes[0].subtitles = [
    { id: 's', start: 4, end: 2, text: { en: 'Invalid' } }
  ]
  assert.throws(() => assertValidStory(raw), /end after/)
})
test('local model MIME is retained for portable data URLs', () => {
  useStore.getState().resetStory()
  useStore
    .getState()
    .addAssetFile('models/room.glb', new File(['test'], 'room.glb'))
  assert.equal(
    useStore.getState().assetFiles['models/room.glb'].type,
    'model/gltf-binary'
  )
})

test('legacy Shadows ending uses its last-video trigger in both player and editor', () => {
  const raw = JSON.parse(
    fs.readFileSync(
      new URL('../../examples/shadows-rebuilt/story.json', import.meta.url)
    )
  )
  delete raw.formatVersion
  raw.ending.endingTrigger = 'lastVideo'
  const parser = new JSONParser()
  parser.storyBaseUrl = 'https://example.com/'
  assert.equal(parser.normalize(raw).ending.triggerMode, 'lastVideo')
  const doc = storyDocument(normalizeStory(raw))
  assert.equal(doc.ending.triggerMode, 'lastVideo')
  doc.ending.triggerMode = 'audioEnd'
  doc.ending.endingTrigger = 'lastVideo'
  assert.equal(normalizeStory(doc).ending.triggerMode, 'audioEnd')
  assert.equal(parser.normalize(doc).ending.triggerMode, 'audioEnd')
  assert.equal(parser.normalize(raw).scenes[0].localizedTitle.fi, 'Johdanto')
})

test('Shadows retains all 28 restored camera stops and their timing through export', () => {
  const raw = JSON.parse(
    fs.readFileSync(
      new URL('../../examples/shadows-rebuilt/story.json', import.meta.url)
    )
  )
  const reopened = normalizeStory(
    JSON.parse(JSON.stringify(storyDocument(normalizeStory(raw))))
  )
  assert.deepEqual(
    Object.values(reopened.camera.guided).map((stops) => stops.length),
    [2, 10, 13, 3]
  )
  assert.deepEqual(reopened.camera.guided, raw.camera.guided)
  assert.equal(reopened.camera.defaultMode, 'guided')
  assert.equal(reopened.camera.guided.scene3.at(-1).time, 208)
  assertValidStory(storyDocument(reopened))
  const bad = structuredClone(reopened)
  bad.camera.guided.scene1[1].time = 0
  assert.throws(
    () => assertValidStory(storyDocument(bad)),
    /different start times/
  )
})

// Exercise the raw-file validation path used by Open, before migration runs.
test('raw Shadows imports in editor and player without a false character-fade error', async () => {
  const raw = JSON.parse(fs.readFileSync(new URL('../../examples/shadows-rebuilt/story.json', import.meta.url)))
  delete raw.formatVersion
  raw.ending.endingTrigger = 'lastVideo'
  raw.scenes.find(s => s.id === raw.ending.triggerSceneId).characters.find(c => c.id === raw.ending.triggerCharacterId).duration = 0
  const original = structuredClone(raw)
  assertValidStory(raw)
  const parser = new JSONParser()
  await parser.loadSchema(JSON.parse(fs.readFileSync(new URL('../../engine/schema/story.schema.json', import.meta.url))))
  assert.equal(parser.validate(raw).isValid, true)
  assert.equal(normalizeStory(raw).ending.triggerMode, 'lastVideo')
  assert.deepEqual(raw, original, 'Validation must not mutate the supplied story')
  const canonical = storyDocument(normalizeStory(raw))
  canonical.ending.triggerMode = 'characterFade'
  canonical.ending.endingTrigger = 'lastVideo'
  assert.throws(() => assertValidStory(canonical), /finite duration/)
  assert.equal(parser.validate(canonical).isValid, false)
  const character = canonical.scenes.find(s => s.id === canonical.ending.triggerSceneId).characters.find(c => c.id === canonical.ending.triggerCharacterId)
  character.duration = 10000
  assertValidStory(canonical)
  assert.equal(parser.validate(canonical).isValid, true)
})
