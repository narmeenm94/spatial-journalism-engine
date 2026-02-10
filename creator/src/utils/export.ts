/**
 * Export/Import utilities for story.json files
 */
import type { StoryConfig } from '../state/types'
import { normalizeStory } from './normalizeStory'

/**
 * Export story config to a JSON file download
 */
export function exportStoryJSON(story: StoryConfig, filename = 'story.json') {
  const json = JSON.stringify(story, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Import a story.json file — automatically normalizes the external format
 * to the internal editor format.
 */
export function importStoryJSON(): Promise<StoryConfig> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return reject(new Error('No file selected'))
      try {
        const text = await file.text()
        const raw = JSON.parse(text)
        const story = normalizeStory(raw)
        resolve(story)
      } catch (err) {
        reject(err)
      }
    }
    input.click()
  })
}

/**
 * Export story + assets as a ZIP bundle (placeholder)
 */
export async function exportStoryBundle(story: StoryConfig, _assetFiles: Record<string, File>) {
  exportStoryJSON(story)
}

/**
 * Generate an object URL for a local asset file
 */
export function getAssetURL(assetFiles: Record<string, File>, path: string): string | null {
  const file = assetFiles[path]
  if (!file) return null
  return URL.createObjectURL(file)
}
