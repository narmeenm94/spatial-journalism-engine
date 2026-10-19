import type { StoryConfig } from '../state/types'
import { mediaPaths } from './media.ts'
// Only reuse the bundled media for the same project and matching references.
// The imported story's authored settings are never replaced.
export function matchesExampleMedia(story:StoryConfig,example:StoryConfig) {
  const reference=new Set(mediaPaths(example)),paths=mediaPaths(story).filter(p=>!story.embeddedAssets?.[p]&&!p.startsWith('data:'))
  return story.project.title===example.project.title && story.project.assets.environment===example.project.assets.environment && story.project.assets.basePath===example.project.assets.basePath && paths.length>0 && paths.every(p=>reference.has(p))
}
