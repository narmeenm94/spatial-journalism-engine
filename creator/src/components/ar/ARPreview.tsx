import { useEffect, useRef, useState } from 'react'
import { useStore } from '../../state/store'
import { fileDataURL } from '../../utils/export'
import { assertValidStory, storyDocument } from '../../utils/storyDocument'
import { Icon } from '../Icon'
export function ARPreview() {
  const [mode, setMode] = useState('3d'),
    [revision, setRevision] = useState(0),
    [status, setStatus] = useState('Preparing preview…')
  const frame = useRef<HTMLIFrameElement>(null),
    popup = useRef<Window | null>(null)
  const base = new URL('./player/', window.location.href)
  const url =
    base.href +
    '?source=postMessage&mode=' +
    mode +
    '&parentOrigin=' +
    encodeURIComponent(window.location.origin) +
    '&revision=' +
    revision
  useEffect(() => {
    let cancelled = false
    const send = async (target: Window) => {
      try {
        setStatus('Loading story and media…')
        const s = useStore.getState(),
          doc = storyDocument(s.story)
        doc.embeddedAssets = { ...doc.embeddedAssets }
        for (const [path, file] of Object.entries(s.assetFiles))
          doc.embeddedAssets[path] = await fileDataURL(file)
        assertValidStory(doc)
        if (cancelled) return
        target.postMessage(
          {
            type: 'loadStory',
            story: doc,
            storyBaseUrl: new URL(s.assetsBaseUrl || './', window.location.href)
              .href
          },
          window.location.origin
        )
        setStatus('Story loaded · use the player below')
      } catch (e) {
        setStatus(
          'Preview could not load: ' +
            (e instanceof Error ? e.message : String(e))
        )
      }
    }
    const receive = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        ![frame.current?.contentWindow, popup.current].includes(
          event.source as Window
        )
      )
        return
      if (event.data?.type === 'engineReady') send(event.source as Window)
      if (event.data?.type === 'engineError')
        setStatus('Preview error: ' + event.data.message)
    }
    window.addEventListener('message', receive)
    const timer = setTimeout(
      () =>
        setStatus((s) =>
          s.startsWith('Preparing')
            ? 'Player has not connected. Build the player with npm run build:studio, then retry.'
            : s
        ),
      10000
    )
    return () => {
      cancelled = true
      clearTimeout(timer)
      window.removeEventListener('message', receive)
    }
  }, [mode, revision])
  return (
    <div className="preview-content">
      <div className="preview-controls">
        <div className="segmented">
          {[
            ['3d', 'Web 3D'],
            ['ar', 'Phone AR'],
            ['vr', 'Headset VR']
          ].map(([id, label]) => (
            <button
              key={id}
              className={mode === id ? 'active' : ''}
              onClick={() => {
                setStatus('Preparing preview…')
                setMode(id)
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          className="btn btn-sm"
          onClick={() => {
            setStatus('Preparing preview…')
            setRevision((r) => r + 1)
          }}
        >
          <Icon name="rotate" size={14} />
          Refresh story
        </button>
        <button
          className="btn btn-sm"
          onClick={() => {
            popup.current = window.open(
              url,
              'spatial-preview',
              'width=1100,height=800'
            )
            if (!popup.current)
              setStatus(
                'The new window was blocked. Allow pop-ups for this studio, or export your JSON and open it in the standalone player.'
              )
          }}
        >
          Open in new window
        </button>
      </div>
      <p className="preview-status" role="status">
        {status}
      </p>
      <iframe
        ref={frame}
        key={url}
        src={url}
        title="Story player"
        allow="camera; gyroscope; accelerometer; xr-spatial-tracking; autoplay; fullscreen"
        allowFullScreen
      />
      <p className="preview-footnote">
        {mode === '3d'
          ? 'Drag to look around. Use the player controls to move between chapters.'
          : mode === 'ar'
            ? 'Open in a new window for camera tracking. Use HTTPS on your phone. Set world or image tracking in Appearance.'
            : 'A supported headset browser is required. Enter VR starts a native WebXR session.'}
      </p>
    </div>
  )
}
