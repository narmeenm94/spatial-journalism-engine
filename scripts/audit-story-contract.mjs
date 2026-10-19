// Diagnostic: exits nonzero until all bundled stories survive Creator import/export
// against the player schema. This is intentionally separate from regression tests.
import fs from 'node:fs'
import Ajv from 'ajv'
import { normalizeStory } from '../creator/src/utils/normalizeStory.ts'

const root = new URL('../', import.meta.url)
const readJSON = (path) =>
  JSON.parse(fs.readFileSync(new URL(path, root), 'utf8'))
const validate = new Ajv({ allErrors: true }).compile(
  readJSON('engine/schema/story.schema.json')
)
let failures = 0

for (const path of [
  'examples/shadows-rebuilt/story.json',
  'templates/interview/story.json',
  'templates/historical/story.json'
]) {
  const original = readJSON(path)
  const originalValid = validate(original)
  const originalErrors = structuredClone(validate.errors || [])
  const exported = JSON.parse(JSON.stringify(normalizeStory(original)))
  const exportedValid = validate(exported)
  const exportErrors = (validate.errors || []).map(
    (error) => `${error.instancePath}: ${error.message}`
  )
  if (!originalValid || !exportedValid) failures++
  console.log(
    JSON.stringify(
      {
        path,
        originalValid,
        originalErrors,
        exportedValid,
        exportErrors,
        controlFlagsBefore: original.ui?.controls,
        controlFlagsAfter: exported.ui?.controls,
        runtimeEffectScenesBefore: original.scenes
          .filter((scene) => scene.lighting?.effects?.length)
          .map((scene) => scene.id),
        runtimeEffectScenesAfter: exported.scenes
          .filter((scene) => scene.lighting?.effects?.length)
          .map((scene) => scene.id)
      },
      null,
      2
    )
  )
}

console.log(
  `${failures} of 3 stories have schema failures. This audit does not prove semantic equivalence.`
)
process.exitCode = failures ? 1 : 0
