import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { SceneManager } from '../engine/src/managers/SceneManager.js'
import { AudioManager } from '../engine/src/managers/AudioManager.js'
import { JSONParser } from '../engine/src/core/JSONParser.js'
import { AssetLoader } from '../engine/src/core/AssetLoader.js'
const setup = (scene) => {
  const calls = { captions: [], ended: [], play: [], pause: [], removed: [] }
  const audio = {
    loadAudio: async () => ({ buffer: { duration: 8 } }),
    play: (id) => calls.play.push(id),
    pause: (id) => calls.pause.push(id),
    stop: () => {},
    removeAudio: (id) => calls.removed.push(id)
  }
  const manager = new SceneManager({
    audioManager: audio,
    subtitleManager: {
      onAudioTimeUpdate: (id, t) => calls.captions.push([id, t]),
      onAudioEnd: () => {}
    },
    engine: { story: { project: { assets: { basePath: '' } } } },
    onSceneEnd: (s) => calls.ended.push(s.id)
  })
  manager.loadScenes([scene])
  return { manager, calls }
}
test('silent chapters advance captions and end once, with pause freezing time', async () => {
  const { manager, calls } = setup({
    id: 'intro',
    duration: 5,
    audio: [],
    subtitles: { en: [{ start: 0, end: 4, text: 'Hello' }] }
  })
  await manager.activateScene('intro')
  manager.update(1)
  manager.pause()
  manager.update(10)
  assert.equal(manager.elapsed, 1)
  manager.resume()
  manager.update(4)
  manager.update(1)
  assert.deepEqual(calls.ended, ['intro'])
  assert.equal(calls.captions[0][1], 1)
})
test('all delayed audio tracks pause, resume and clean up by their real IDs', async () => {
  const { manager, calls } = setup({
    id: 'intro',
    audio: [
      { id: 'voice', url: 'voice.mp3', delay: 0 },
      { id: 'music', url: 'music.mp3', delay: 2000 }
    ],
    subtitles: {}
  })
  await manager.activateScene('intro')
  manager.update(1)
  assert.deepEqual(calls.play, ['voice'])
  manager.pause()
  manager.update(5)
  assert.deepEqual(calls.pause, ['voice'])
  assert.deepEqual(calls.play, ['voice'])
  manager.resume()
  manager.update(1.1)
  assert.deepEqual(calls.play, ['voice', 'voice', 'music'])
  await manager.deactivateScene('intro')
  assert.deepEqual(calls.removed, ['voice', 'music'])
})
test('configured audio duration stops playback at its end', async () => {
  const { manager } = setup({
    id: 'intro',
    audio: [{ id: 'voice', url: 'voice.mp3', duration: 2000 }],
    subtitles: {}
  })
  let stops = 0
  manager.audioManager.stop = () => stops++
  await manager.activateScene('intro')
  manager.update(1)
  manager.update(2)
  manager.update(2)
  assert.equal(stops, 1)
})
test('character lifetime includes fade-out and preserves zero opacity', async () => {
  const { manager } = setup({ id: 'intro', audio: [], characters: [] })
  await manager.activateScene('intro')
  const material = { opacity: 1 },
    model = { visible: true, traverse: (f) => f({ isMesh: true, material }) }
  manager.characterSchedule = [
    {
      config: {
        delay: 1000,
        duration: 3000,
        fadeIn: 1000,
        fadeOut: 1000,
        opacity: 0.8
      },
      model
    }
  ]
  manager.update(0.5)
  assert.equal(model.visible, false)
  manager.update(1)
  assert.equal(material.opacity, 0.4)
  manager.update(2)
  assert.equal(material.opacity, 0.4)
  manager.update(0.5)
  assert.equal(model.visible, false)
})
test('paused audio clocks do not advance and resume from their offset', () => {
  const manager = new AudioManager(null)
  let now = 1000
  const original = globalThis.performance
  globalThis.performance = { now: () => now }
  globalThis.requestAnimationFrame = () => 0
  try {
    const sound = {
      isPlaying: false,
      play() {
        this.isPlaying = true
      },
      pause() {
        this.isPlaying = false
      }
    }
    manager.sounds.set('a', sound)
    manager.play('a')
    now = 3000
    manager.pause('a')
    now = 10000
    assert.equal(manager.getCurrentTime('a'), 2)
    manager.play('a')
    now = 11000
    assert.equal(manager.getCurrentTime('a'), 3)
  } finally {
    globalThis.performance = original
    delete globalThis.requestAnimationFrame
  }
})
test('object previews validate and embedded models resolve before loading', async () => {
  const parser = new JSONParser()
  parser.storyBaseUrl = 'https://example.com/'
  await parser.loadSchema(
    JSON.parse(
      fs.readFileSync(
        new URL('../engine/schema/story.schema.json', import.meta.url)
      )
    )
  )
  await assert.rejects(
    parser.parse({ project: { title: 'Broken' }, scenes: [] }),
    /Invalid story/i
  )
  const raw = JSON.parse(
    fs.readFileSync(
      new URL('../templates/interview/story.json', import.meta.url)
    )
  )
  raw.embeddedAssets = {
    'models/room.glb': 'data:model/gltf-binary;base64,Z2xURg=='
  }
  raw.project.assets.environment = 'models/room.glb'
  const story = await parser.parse(raw)
  assert.match(
    parser.resolvePath(
      story.project.assets.environment,
      story.project.assets.basePath
    ),
    /^data:model/
  )
  assert.equal(
    new AssetLoader().getExtension(raw.embeddedAssets['models/room.glb']),
    'glb'
  )
})
