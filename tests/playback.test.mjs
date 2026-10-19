import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { SceneManager } from '../engine/src/managers/SceneManager.js'
import { AudioManager } from '../engine/src/managers/AudioManager.js'
import { JSONParser } from '../engine/src/core/JSONParser.js'
import { AssetLoader } from '../engine/src/core/AssetLoader.js'
import { createEndingPlayback } from '../engine/src/ui/endingPlayback.js'
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

test('narration clock freezes with the audio device instead of following wall time', () => {
  const manager = new AudioManager(null)
  const previousRAF = globalThis.requestAnimationFrame
  globalThis.requestAnimationFrame = () => 0
  const context = { currentTime: 20, state: 'running' }
  const sound = { context, buffer: { duration: 155 }, isPlaying: false,
    play() { this.isPlaying = true }, pause() { this.isPlaying = false } }
  manager.sounds.set('voice', sound)
  try {
    manager.play('voice'); context.currentTime = 30
    assert.equal(manager.getCurrentTime('voice'), 10)
    context.state = 'suspended'
    assert.equal(manager.getCurrentTime('voice'), 10)
    manager.pause('voice'); context.currentTime = 100
    assert.equal(manager.getCurrentTime('voice'), 10)
    context.state = 'running'; manager.play('voice'); context.currentTime = 103
    assert.equal(manager.getCurrentTime('voice'), 13)
    context.currentTime = 500
    assert.equal(manager.getCurrentTime('voice'), 155)
  } finally { globalThis.requestAnimationFrame = previousRAF }
})

async function narratedEnding() {
  const { manager, calls } = setup({ id: 'final', audio: [{ id: 'voice', url: 'voice.mp3' }],
    videos: [{ id: 'film', triggerAt: 27.5 }], characters: [] })
  let audioTime = 0, onEnded, completed = 0
  const video = new EventTarget()
  video.duration = 69.93
  const videos = new Map([['film', { element: video }]])
  manager.videoProjector = { videos, playVideo: async () => true, fadeOutVideo: async () => {},
    removeVideo: id => videos.delete(id), pause() {}, play() {} }
  manager.loadSceneVideos = async scene => manager.setupVideoTriggers(scene.videos)
  manager.audioManager.loadAudio = async (id, config) => { onEnded = config.onEnded; return { buffer: { duration: 155.06 } } }
  manager.audioManager.getCurrentTime = () => audioTime
  manager.engine.story.ending = { triggerMode: 'characterFade', triggerSceneId: 'final', triggerCharacterId: 'oleh', triggerOpacity: .05, triggerDelay: 6000 }
  manager.engine.handleComplete = () => { completed++; manager.pause() }
  await manager.activateScene('final')
  const config = { id: 'oleh', delay: 15000, duration: 69000, fadeIn: 3000, fadeOut: 66000, opacity: .7 }
  manager.currentScene.characters = [config]
  manager.characterSchedule = [{ config, model: { traverse() {} } }]
  return { manager, calls, video, setAudioTime: value => { audioTime = value }, endAudio: () => onEnded(), completed: () => completed }
}

test('Shadows fade at 85 seconds waits for all 155 seconds of narration and the final video', async () => {
  const f = await narratedEnding()
  f.manager.update(100)
  assert.equal(f.manager.elapsed, 0, 'a slow first frame cannot run ahead of narration startup')
  f.setAudioTime(40); f.manager.update(100)
  await Promise.resolve()
  assert.equal(f.manager.elapsed, 40)
  assert.equal(f.calls.captions.at(-1)[1], 40)
  f.setAudioTime(86); f.manager.update(100)
  assert.equal(f.completed(), 0)
  assert.equal(f.manager.paused, false)
  f.video.dispatchEvent(new Event('ended')); await Promise.resolve()
  f.setAudioTime(154); f.manager.update(100)
  assert.equal(f.completed(), 0, 'video completion must not cut narration')
  f.setAudioTime(155.06); f.endAudio(); f.manager.update(.016)
  assert.equal(f.completed(), 1)
  f.manager.update(10); assert.equal(f.completed(), 1)
})

test('ending waits for a buffering final video even after narration has ended', async () => {
  const f = await narratedEnding()
  f.manager.update(0)
  f.setAudioTime(86); f.manager.update(.016); await Promise.resolve()
  f.setAudioTime(155.06); f.endAudio(); f.manager.update(.016)
  f.manager.update(100)
  assert.equal(f.completed(), 0)
  assert.equal(f.manager.paused, false, 'chapter cannot pause the video it is waiting for')
  f.video.dispatchEvent(new Event('ended')); await Promise.resolve()
  f.manager.update(.016)
  assert.equal(f.completed(), 1)
})

test('last-video ending waits for narration and its delay freezes when paused', async () => {
  const f = await narratedEnding()
  f.manager.engine.story.ending.triggerMode = 'lastVideo'
  f.manager.update(0)
  f.setAudioTime(40); f.manager.update(.016); await Promise.resolve()
  f.video.dispatchEvent(new Event('ended')); await Promise.resolve()
  f.manager.pause(); f.manager.update(100)
  assert.equal(f.manager.elapsed, 40)
  assert.equal(f.completed(), 0)
  f.manager.resume(); f.setAudioTime(60); f.manager.update(.016)
  assert.equal(f.completed(), 0)
  f.setAudioTime(155.06); f.endAudio(); f.manager.update(.016)
  assert.equal(f.completed(), 1)
})

test('ordinary chapter completion cannot pause a video still buffering after narration', async () => {
  const f = await narratedEnding()
  f.manager.engine.story.ending = undefined
  f.manager.update(0)
  f.setAudioTime(40); f.manager.update(.016); await Promise.resolve()
  f.setAudioTime(155.06); f.endAudio(); f.manager.update(20)
  assert.deepEqual(f.calls.ended, [])
  assert.equal(f.manager.paused, false)
  f.video.dispatchEvent(new Event('ended')); await Promise.resolve()
  f.manager.update(.016)
  assert.deepEqual(f.calls.ended, ['final'])
})

test('original Shadows overlap shows the ending without stopping narration and completes only after media', async () => {
  const f = await narratedEnding()
  const source = JSON.parse(fs.readFileSync(new URL('../examples/shadows-rebuilt/story.json', import.meta.url)))
  f.manager.engine.story.ending = { ...source.ending, triggerSceneId: 'final', triggerCharacterId: 'oleh' }
  const originalCharacter = source.scenes.at(-1).characters.find(c => c.id === 'oleh-scene4')
  assert.equal(originalCharacter.delay, 30000, 'the original applies the 15-second delay in both the scene and character loader')
  Object.assign(f.manager.characterSchedule[0].config, originalCharacter, { id: 'oleh' })
  let shown = 0
  f.manager.engine.showEnding = () => shown++
  f.manager.onSceneEnd = () => f.manager.engine.handleComplete()
  f.manager.update(0)
  f.setAudioTime(86); f.manager.update(.016); await Promise.resolve()
  assert.equal(shown, 0, 'old 85-second trigger must not show the overlay')
  f.video.dispatchEvent(new Event('ended')); await Promise.resolve()
  f.setAudioTime(101); f.manager.update(.016)
  assert.equal(shown, 1)
  assert.equal(f.completed(), 0)
  assert.equal(f.manager.paused, false)
  f.setAudioTime(140); f.manager.update(.016)
  assert.equal(shown, 1)
  assert.equal(f.completed(), 0)
  f.setAudioTime(155.06); f.endAudio(); f.manager.update(.016)
  assert.equal(f.completed(), 1)
})

test('ending pause reaches narration and projected video and resumes the shared chapter clock', async () => {
  const f = await narratedEnding()
  f.manager.engine.story.ending.mediaBehavior = 'continue'
  f.manager.engine.showEnding = () => {}
  f.manager.update(0)
  f.setAudioTime(101); f.manager.update(.016); await Promise.resolve()
  const videoCalls = []
  f.manager.videoProjector.pause = id => videoCalls.push(['pause', id])
  f.manager.videoProjector.play = id => videoCalls.push(['play', id])
  const playback = createEndingPlayback({ sceneManager: f.manager,
    pause: () => f.manager.pause(), resume: () => f.manager.resume() })
  playback.setPaused(true)
  assert.equal(f.calls.pause.at(-1), 'voice')
  assert.deepEqual(videoCalls.at(-1), ['pause', 'film'])
  f.manager.update(60)
  assert.equal(f.manager.elapsed, 101)
  assert.equal(playback.sample(60).elapsed, 0)
  playback.setPaused(false)
  assert.equal(f.calls.play.at(-1), 'voice')
  assert.deepEqual(videoCalls.at(-1), ['play', 'film'])
  f.setAudioTime(102); f.manager.update(60)
  assert.equal(f.manager.elapsed, 102)
  assert.equal(playback.sample(60).elapsed, 1)
})
