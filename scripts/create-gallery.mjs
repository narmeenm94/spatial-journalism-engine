import fs from 'node:fs/promises'
import { TestFileReader } from '../creator/tests/file-reader.mjs'
import { createStarter } from '../creator/src/utils/starter.ts'
import { portableStory } from '../creator/src/utils/export.ts'
import { useStore } from '../creator/src/state/store.ts'
globalThis.FileReader = TestFileReader
await createStarter()
const state = useStore.getState(),
  doc = await portableStory(state.story, state.assetFiles)
await fs.mkdir(new URL('../examples/gallery/', import.meta.url), {
  recursive: true
})
await fs.writeFile(
  new URL('../examples/gallery/story.json', import.meta.url),
  JSON.stringify(doc, null, 2) + '\n'
)
console.log(
  'Gallery story generated with ' +
    Object.keys(doc.embeddedAssets).length +
    ' embedded model.'
)
