import { storyChecks } from '../../../engine/src/core/storyChecks.js'
import Ajv from 'ajv'
import schema from '../../../engine/schema/story.schema.json' with { type: 'json' }
import type { StoryConfig } from '../state/types'
const validator = new Ajv({ allErrors: true, strict: false }).compile(schema)
export function storyDocument(story: StoryConfig): StoryConfig {
  const doc = structuredClone(story) as any
  doc.formatVersion = '1.1'
  for (const scene of doc.scenes) {
    delete scene.name
    for (const audio of scene.audio || []) delete audio.url
    for (const video of scene.videos || []) delete video.triggerAt
    const lighting = scene.lighting || {}
    delete lighting.spotlight
    lighting.effects = (lighting.effects || []).filter(
      (e: any) =>
        !(e.type === 'flicker' && lighting.flicker) &&
        !(e.type === 'walkingTour' && lighting.walkingTour)
    )
  }
  delete doc.ui?.homeScreen?.startButtonText
  delete doc.ending?.endingTrigger
  return doc
}
export function assertValidStory(story: unknown) {
  if (!validator(story))
    throw new Error(
      (validator.errors || [])
        .slice(0, 6)
        .map((e) => (e.instancePath || 'Story') + ': ' + e.message)
        .join('\n')
    )
  const errors = storyChecks(story)
  if (errors.length) throw new Error(errors.slice(0, 6).join('\n'))
}
