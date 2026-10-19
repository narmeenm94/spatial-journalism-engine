import test from 'node:test'
import assert from 'node:assert/strict'
import { useStore } from '../src/state/store.ts'

test('adding a chapter after deleting a middle chapter keeps every ID unique', () => {
  const store = useStore.getState()
  store.resetStory()
  store.addScene()
  store.addScene()
  store.removeScene('scene2')
  store.addScene()
  const state = useStore.getState()
  const ids = state.story.scenes.map((scene) => scene.id)
  assert.deepEqual(ids, ['scene1', 'scene3', 'scene4'])
  assert.equal(new Set(ids).size, ids.length)
  assert.equal(state.activeSceneId, 'scene4')
})

test('chapter creation avoids imported ID collisions and remains undoable', () => {
  useStore.getState().resetStory()
  const story = structuredClone(useStore.getState().story)
  story.scenes[0].id = 'scene2'
  useStore.getState().setStory(story)
  useStore.getState().addScene()
  assert.deepEqual(
    useStore.getState().story.scenes.map((scene) => scene.id),
    ['scene2', 'scene3']
  )
  useStore.getState().undo()
  assert.deepEqual(
    useStore.getState().story.scenes.map((scene) => scene.id),
    ['scene2']
  )
  useStore.getState().redo()
  assert.deepEqual(
    useStore.getState().story.scenes.map((scene) => scene.id),
    ['scene2', 'scene3']
  )
})

test('captured camera views retain their pose and can be undone', () => {
  useStore.getState().resetStory()
  const pose = {
    time: 4,
    position: [2, 3, 4],
    rotation: [0.1, 0.2, 0.3],
    duration: 0
  }
  useStore.getState().addCameraKeyframe('scene1', pose)
  const k = useStore.getState().story.camera.guided.scene1[0]
  for (const [key, value] of Object.entries(pose))
    assert.deepEqual(k[key], value)
  useStore.getState().undo()
  assert.equal(useStore.getState().story.camera.guided?.scene1?.length || 0, 0)
})
