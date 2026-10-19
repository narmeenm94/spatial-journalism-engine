import type { StoryConfig } from '../state/types'
type Draft = {
  story: StoryConfig
  assetFiles: Record<string, File>
  assetsBaseUrl: string
  savedAt: number
}
const open = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('spatial-journalism-studio', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('projects')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
export async function saveDraft(draft: Draft, key = 'current') {
  const db = await open()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('projects', 'readwrite')
      tx.objectStore('projects').put(draft, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () =>
        reject(tx.error || new Error('Saving was interrupted.'))
    })
  } finally {
    db.close()
  }
}
export async function readDraft(key = 'current'): Promise<Draft | undefined> {
  const db = await open()
  try {
    return await new Promise((resolve, reject) => {
      const request = db
        .transaction('projects')
        .objectStore('projects')
        .get(key)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}
