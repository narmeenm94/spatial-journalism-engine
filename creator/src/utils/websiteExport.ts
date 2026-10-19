import { Zip, ZipPassThrough } from 'fflate'
import type { StoryConfig } from '../state/types.ts'
import { portableStory } from './export.ts'
import { assertValidStory } from './storyDocument.ts'
import { mediaPaths, mediaType } from './media.ts'

const bytes = (text: string) => new TextEncoder().encode(text)
export function safePlayerPath(path: string) {
  return /^(?:[a-zA-Z0-9_.-]+\/)*[a-zA-Z0-9_.-]+$/.test(path) && !path.split('/').some(part => part === '..' || part === '.')
}

// Website media stays separate so hosts can stream video and accept large
// stories. The authored document is preserved; portable JSON is still the
// editable, single-file export and can be reconstructed from this folder.
export async function websiteStory(story: StoryConfig, add: (path: string, data: Uint8Array) => void | Promise<void>) {
  const embedded = story.embeddedAssets || {}
  const { embeddedAssets: _embeddedAssets, ...content } = story
  const replacements = new Map<string, string>()
  let index = 0
  for (const path of mediaPaths(story)) {
    const source = embedded[path] || (path.startsWith('data:') ? path : '')
    if (!source.startsWith('data:')) throw new Error('Website media is missing: ' + path)
    const response = await fetch(source)
    const blob = await response.blob()
    const type = mediaType(path, blob.type)
    const extensions: Record<string, string> = {
      'model/gltf-binary':'glb', 'model/gltf+json':'gltf', 'image/png':'png', 'image/jpeg':'jpg', 'image/webp':'webp',
      'image/svg+xml':'svg', 'audio/mpeg':'mp3', 'audio/wav':'wav', 'audio/ogg':'ogg', 'video/mp4':'mp4', 'video/webm':'webm',
      'font/woff':'woff', 'font/woff2':'woff2', 'font/ttf':'ttf', 'font/otf':'otf'
    }
    const name = 'media/' + String(++index).padStart(4, '0') + '.' + (extensions[type] || 'bin')
    replacements.set(path, name)
    await add(name, new Uint8Array(await blob.arrayBuffer()))
  }
  const rewrite = (value: unknown): unknown => {
    if (typeof value === 'string') return replacements.get(value) || value
    if (Array.isArray(value)) return value.map(rewrite)
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rewrite(item)]))
    return value
  }
  const doc = rewrite(content) as StoryConfig
  doc.project.assets.basePath = './'
  assertValidStory(doc)
  return doc
}

export async function websiteFiles(story: StoryConfig, assets: Record<string, File>, mediaBase: string, playerBase: string, progress: (text: string) => void, signal?: AbortSignal) {
  signal?.throwIfAborted()
  progress('Gathering your story and media…')
  const portable = await portableStory(story, assets, mediaBase, signal)
  signal?.throwIfAborted()
  const manifestResponse = await fetch(new URL('player-manifest.json', playerBase), { signal })
  if (!manifestResponse.ok) throw new Error('Build the current player with npm run build:studio, then export again.')
  const manifest = await manifestResponse.json() as { version: number; files: Array<{path: string; sha256: string}> }
  if (manifest.version !== 1 || !Array.isArray(manifest.files) || !manifest.files.some(file => file.path === 'index.html'))
    throw new Error('The player manifest is incomplete. Rebuild the player.')
  const files: Record<string, Uint8Array> = Object.create(null)
  const add = (name: string, data: Uint8Array) => {
    signal?.throwIfAborted()
    files[name] = data
  }
  let count = 0
  const doc = await websiteStory(portable, async (name, data) => {
    progress('Packing media ' + (++count) + '…')
    add(name, data)
    // Let status updates paint during large documentary exports.
    await new Promise(resolve => setTimeout(resolve, 0))
  })
  count = 0
  for (const file of manifest.files) {
    if (!safePlayerPath(file.path)) throw new Error('Invalid player file path.')
    progress('Packing player ' + (++count) + ' / ' + manifest.files.length + '…')
    signal?.throwIfAborted()
    const response = await fetch(new URL(file.path, playerBase), { signal })
    if (!response.ok) throw new Error('Missing player file: ' + file.path)
    const data = new Uint8Array(await response.arrayBuffer())
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', data)), n => n.toString(16).padStart(2, '0')).join('')
    if (digest !== file.sha256) throw new Error('The player changed during export. Refresh the studio and try again.')
    add('player/' + file.path, data)
  }
  add('player/player-manifest.json', bytes(JSON.stringify(manifest, null, 2)))
  add('story.json', bytes(JSON.stringify(doc, null, 2)))
  add('.nojekyll', bytes(''))
  add('index.html', bytes(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Spatial story</title><p>Opening story…</p><script>const url=new URL('./player/',location.href);url.search=location.search;url.searchParams.set('story','../story.json');location.replace(url.href)</script><noscript>Enable JavaScript to open this experience.</noscript></html>`))
  add('START-HERE.txt', bytes(`SPATIAL JOURNALISM WEBSITE

1. Extract this ZIP. Publish the entire folder to an HTTPS static host.
2. Open its index.html address in Safari on iPhone or Chrome on Android.
3. Choose Guided or Explore and allow camera and motion access.

For GitHub Pages, upload the extracted contents to the published folder.
Keep player/, media/, story.json and .nojekyll together. A file:// address or
an HTTP address on your local network cannot start camera AR.

This contains the exact built player used by studio Preview, verified against
player/player-manifest.json. No upload or deployment happens during export.

story.json retains all authored screens, actions, tracking choices and chapters.
Media is separate here for streaming and hosting limits. For a single editable
file, use the studio's Export story command. To reopen this hosted version,
open its story.json in the studio and set Media folder URL to this website root.

Check both modes, permissions, tracking recovery, recenter, chapter buttons,
object interactions, narration, captions, device rotation and the ending on
real devices before publication. Desktop preview does not verify SLAM quality.

Third-party runtime license files are included under player/vendor/.
`))
  return files
}

export async function exportWebsite(story: StoryConfig, assets: Record<string, File>, mediaBase: string, playerBase: string, progress: (text: string) => void) {
  const files = await websiteFiles(story, assets, mediaBase, playerBase, progress)
  const chunks: BlobPart[] = []
  let zipError: Error | null = null
  const archive = new Zip((error, data) => {
    if (error) zipError = error
    else chunks.push(new Uint8Array(data).buffer)
  })
  for (const [name, data] of Object.entries(files)) {
    const file = new ZipPassThrough(name)
    archive.add(file)
    file.push(data, true)
  }
  archive.end()
  if (zipError) throw zipError
  return new Blob(chunks, { type: 'application/zip' })
}
