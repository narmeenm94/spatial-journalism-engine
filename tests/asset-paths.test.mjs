import test from 'node:test'
import assert from 'node:assert/strict'
import { JSONParser } from '../engine/src/core/JSONParser.js'

test('remote stories keep their asset origin and signed URL parameters', () => {
  const parser = new JSONParser()
  parser.storyBaseUrl = 'https://stories.example.org/features/story/'
  assert.equal(
    parser.resolvePath('models/room.glb?version=2#mesh', 'assets/'),
    'https://stories.example.org/features/story/assets/models/room.glb?version=2#mesh'
  )
  assert.equal(
    parser.resolvePath(
      'room.glb?signature=abc',
      'https://cdn.example.org/media/'
    ),
    'https://cdn.example.org/media/room.glb?signature=abc'
  )
})

test('local preview assets and explicit URLs remain intact', () => {
  const parser = new JSONParser()
  parser.storyBaseUrl = 'https://stories.example.org/'
  parser.localAssetBlobUrls = { 'models/room.glb': 'blob:local-room' }
  assert.equal(
    parser.resolvePath('models/room.glb', 'assets/'),
    'blob:local-room'
  )
  for (const path of [
    '/media/room.glb',
    'https://cdn.example.org/room.glb',
    'blob:room',
    'data:text/plain,test'
  ]) {
    assert.equal(parser.resolvePath(path, 'assets/'), path)
  }
})

test('resolved scene asset URLs remain stable when resolved again by managers', () => {
  const parser = new JSONParser()
  parser.storyBaseUrl = 'https://stories.example.org/story/'
  const story = parser.normalize({
    project: { title: 'Portable story', assets: { basePath: 'assets/' } },
    scenes: [
      {
        id: 'intro',
        audio: { url: 'audio/intro.mp3' },
        characters: [{ model: 'models/person.glb' }]
      }
    ]
  })
  const audioUrl = story.scenes[0].audio[0].url
  assert.equal(
    audioUrl,
    'https://stories.example.org/story/assets/audio/intro.mp3'
  )
  assert.equal(parser.resolvePath(audioUrl, 'assets/'), audioUrl)
  assert.equal(
    story.scenes[0].characters[0].model,
    'https://stories.example.org/story/assets/models/person.glb'
  )
})

test('embedded remote media overrides its original URL for portable playback', () => {
  const parser = new JSONParser()
  parser.localAssetBlobUrls = {
    'https://cdn.example.org/room.glb': 'data:model/gltf-binary;base64,Z2xURg=='
  }
  assert.equal(
    parser.resolvePath('https://cdn.example.org/room.glb', 'assets/'),
    'data:model/gltf-binary;base64,Z2xURg=='
  )
})
