import type { StoryConfig } from '../state/types'
import { normalizeStory } from './normalizeStory.ts'
import { mediaPaths, mediaType } from './media.ts'
import { storyDocument, assertValidStory } from './storyDocument.ts'

export async function portableStory(
  story: StoryConfig,
  assets: Record<string, File> = {},
  baseUrl = ''
) {
  const doc = storyDocument(story)
  const embedded = { ...doc.embeddedAssets }
  for (const [path, file] of Object.entries(assets))
    embedded[path] = await fileDataURL(
      new Blob([file], { type: mediaType(path, file.type) })
    )
  if (Object.keys(embedded).length) doc.embeddedAssets = embedded
  const missing: string[] = []
  for (const path of mediaPaths(doc)) {
    if (embedded[path] || path.startsWith('data:')) continue
    if (!baseUrl && !/^(https?:|blob:)/.test(path)) {
      missing.push(path)
      continue
    }
    try {
      const url = /^(https?:|blob:)/.test(path)
        ? path
        : new URL(
            (doc.project.assets.basePath || '') + path,
            baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'
          ).href
      const response = await fetch(url)
      if (!response.ok) throw new Error('HTTP ' + response.status)
      const file = await response.blob()
      embedded[path] = await fileDataURL(
        new Blob([file], { type: mediaType(path, file.type) })
      )
    } catch {
      missing.push(path)
    }
  }
  if (missing.length)
    throw new Error(
      'Missing media: ' +
        missing.slice(0, 6).join(', ') +
        (missing.length > 6 ? ' and ' + (missing.length - 6) + ' more' : '') +
        '. Add these files in Media library or set the media folder URL. Your workspace is unchanged.'
    )
  if (Object.keys(embedded).length) doc.embeddedAssets = embedded
  assertValidStory(doc)
  return doc
}
export async function exportStoryJSON(
  story: StoryConfig,
  filename = 'story.json',
  assets: Record<string, File> = {},
  baseUrl = ''
) {
  const doc = await portableStory(story, assets, baseUrl)
  const blob = new Blob([JSON.stringify(doc, null, 2)], {
    type: 'application/json'
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  return { url, filename, size: blob.size }
}
export function fileDataURL(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read media file.'))
    reader.readAsDataURL(file)
  })
}
export function importStoryJSON(): Promise<StoryConfig | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.hidden = true
    document.body.appendChild(input)
    input.oncancel = () => {
      input.remove()
      resolve(null)
    }
    input.onchange = async () => {
      const file = input.files?.[0]
      input.remove()
      if (!file) return resolve(null)
      try {
        const raw = JSON.parse(await file.text())
        assertValidStory(raw)
        resolve(normalizeStory(raw))
      } catch (error) {
        reject(error)
      }
    }
    input.click()
  })
}
export async function exportStoryBundle(
  story: StoryConfig,
  files: Record<string, File>
) {
  return exportStoryJSON(story, 'story.json', files)
}
export function getAssetURL(
  files: Record<string, File>,
  path: string
): string | null {
  return files[path] ? URL.createObjectURL(files[path]) : null
}
