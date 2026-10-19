import test from 'node:test'
import assert from 'node:assert/strict'
import { createStarter, starterTemplates } from '../src/utils/starter.ts'
import { useStore } from '../src/state/store.ts'
import { portableStory } from '../src/utils/export.ts'
import { assertValidStory } from '../src/utils/storyDocument.ts'
import { normalizeStory } from '../src/utils/normalizeStory.ts'
import { TestFileReader } from './file-reader.mjs'
globalThis.FileReader = TestFileReader
for (const template of starterTemplates)
  test(template.id + ' is a playable, self-contained starter', async () => {
    await createStarter(template.id)
    const state = useStore.getState()
    const portable = await portableStory(state.story, state.assetFiles)
    const reopened = normalizeStory(JSON.parse(JSON.stringify(portable)))
    assertValidStory(reopened)
    assert.equal(reopened.scenes.length, 3)
    assert.equal(reopened.camera.chooseMode, true)
    assert.equal(Object.values(reopened.camera.guided).flat().length, 6)
    assert.ok(reopened.interactableObjects.length >= 1)
    assert.ok(reopened.scenes[2].lighting.walkingTour.waypoints.length >= 3)
    for (const object of reopened.interactableObjects) {
      assert.ok(reopened.embeddedAssets[object.model], 'Inspectable models travel with the JSON')
      assert.ok(object.hasInfoBox && object.infoBoxMessage.en)
    }
    assert.deepEqual(reopened.project.modes, ['3d', 'ar', 'vr'])
    const glb = Buffer.from(
      reopened.embeddedAssets[reopened.project.assets.environment].split(
        ','
      )[1],
      'base64'
    )
    assert.equal(glb.toString('ascii', 0, 4), 'glTF')
    assert.equal(glb.readUInt32LE(8), glb.length)
    const gltf = JSON.parse(glb.toString('utf8', 20, 20 + glb.readUInt32LE(12)))
    assert.ok(gltf.meshes.length >= 4)
    for (const scene of reopened.scenes) {
      assert.ok(scene.duration > 0)
      assert.ok(scene.subtitles[0].text.en)
    }
  })
