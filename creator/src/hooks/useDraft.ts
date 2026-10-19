import { useEffect, useState } from 'react'
import { useStore } from '../state/store'
import { readDraft, saveDraft } from '../utils/persistence'
export function useDraft() {
  const [status, setStatus] = useState('Opening workspace…')
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let alive = true,
      unsubscribe = () => {},
      timer: ReturnType<typeof setTimeout> | undefined
    let queue = Promise.resolve()
    let pending = false,
      revision = 0
    const persist = () => {
      const savedRevision = revision
      const s = useStore.getState()
      const snapshot = {
        story: structuredClone(s.story),
        assetFiles: { ...s.assetFiles },
        assetsBaseUrl: s.assetsBaseUrl,
        savedAt: Date.now()
      }
      queue = queue
        .then(() => saveDraft(snapshot))
        .then(() => {
          if (alive && savedRevision === revision) {
            pending = false
            setStatus('All changes saved on this device')
          }
        })
        .catch(() => {
          if (alive) {
            pending = true
            setStatus('Could not save locally · export a copy')
          }
        })
    }
    readDraft()
      .then((draft) => {
        if (!alive) return
        if (draft) {
          useStore.getState().setStory(draft.story)
          useStore.setState({
            assetFiles: draft.assetFiles,
            assetsBaseUrl: draft.assetsBaseUrl
          })
        }
        setStatus(draft ? 'Recovered from this device' : 'Saved on this device')
      })
      .catch(() => {
        if (alive) setStatus('Local recovery unavailable · export a copy')
      })
      .finally(() => {
        if (!alive) return
        setReady(true)
        unsubscribe = useStore.subscribe((s, prev) => {
          if (
            s.story === prev.story &&
            s.assetFiles === prev.assetFiles &&
            s.assetsBaseUrl === prev.assetsBaseUrl
          )
            return
          pending = true
          revision++
          setStatus('Saving…')
          clearTimeout(timer)
          timer = setTimeout(persist, 500)
        })
      })
    const unload = (e: BeforeUnloadEvent) => {
      if (pending) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', unload)
    return () => {
      alive = false
      clearTimeout(timer)
      unsubscribe()
      window.removeEventListener('beforeunload', unload)
    }
  }, [])
  return { status, ready }
}
