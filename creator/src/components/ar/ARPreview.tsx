/**
 * AR Preview / Live Preview — Preview the experience in 3D or AR
 * Uses postMessage to send the story JSON to the engine iframe (avoids blob URL cross-origin issues).
 * Local asset files (added via the Asset Browser or file pickers) are serialized as ArrayBuffers
 * and sent alongside the story so the engine can create blob URLs on its own origin.
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import { useStore } from '../../state/store'
import { exportStoryJSON } from '../../utils/export'

/** Read all local asset files into transferable ArrayBuffers + MIME types */
async function serializeAssetFiles(
  assetFiles: Record<string, File>
): Promise<Record<string, { data: ArrayBuffer; type: string }>> {
  const result: Record<string, { data: ArrayBuffer; type: string }> = {}
  for (const [key, file] of Object.entries(assetFiles)) {
    try {
      result[key] = { data: await file.arrayBuffer(), type: file.type || 'application/octet-stream' }
    } catch {
      console.warn(`[Preview] Could not read file ${key}`)
    }
  }
  return result
}

export function ARPreview() {
  const story = useStore((s) => s.story)
  const assetFiles = useStore((s) => s.assetFiles)
  const assetsBaseUrl = useStore((s) => s.assetsBaseUrl)
  const [previewMode, setPreviewMode] = useState<'none' | '3d' | 'ar'>('none')
  const [engineUrl, setEngineUrl] = useState('http://localhost:8080')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const iframeContainerRef = useRef<HTMLDivElement>(null)
  /** Keep a ref to any popup window so we can send it updated stories */
  const popupRef = useRef<Window | null>(null)

  // Build the engine URL — no story in URL, story sent via postMessage
  const getPreviewUrl = useCallback(
    (mode: '3d' | 'ar') => `${engineUrl}?mode=${mode}&source=postMessage`,
    [engineUrl]
  )

  const buildStoryBaseUrl = useCallback(() => {
    return assetsBaseUrl
      ? new URL(assetsBaseUrl, engineUrl).href
      : engineUrl + '/'
  }, [assetsBaseUrl, engineUrl])

  /** Build the full payload including serialized local assets, then post it */
  const sendStoryToTarget = useCallback(
    async (target: Window) => {
      const localAssets = await serializeAssetFiles(assetFiles)
      const payload = {
        type: 'loadStory',
        story,
        storyBaseUrl: buildStoryBaseUrl(),
        localAssets, // { 'models/file.glb': { data: ArrayBuffer, type: 'model/gltf-binary' }, … }
      }
      target.postMessage(payload, '*')
    },
    [story, assetFiles, buildStoryBaseUrl]
  )

  // When the engine iframe/popup signals "ready", send the story + local assets
  useEffect(() => {
    if (previewMode === 'none') return

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'engineReady') return

      // From embedded iframe
      if (iframeRef.current?.contentWindow && event.source === iframeRef.current.contentWindow) {
        sendStoryToTarget(iframeRef.current.contentWindow)
      }
      // From popup window
      if (popupRef.current && event.source === popupRef.current) {
        sendStoryToTarget(popupRef.current)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [previewMode, sendStoryToTarget])

  // ── Actions ──

  const handlePreview3D = () => setPreviewMode('3d')

  const handlePreviewAR = () => {
    // AR must open in a new window (requires camera access)
    const popup = window.open(getPreviewUrl('ar'), '_blank', 'width=400,height=800')
    if (popup) popupRef.current = popup
    setPreviewMode('ar')
  }

  const handleOpenInNewWindow = () => {
    const popup = window.open(getPreviewUrl('3d'), '_blank', 'width=1024,height=768')
    if (popup) popupRef.current = popup
    // Keep the inline preview mode so the postMessage listener stays active for the popup
    if (previewMode === 'none') setPreviewMode('3d')
  }

  const handleToggleFullscreen = () => {
    if (!iframeContainerRef.current) return
    if (!document.fullscreenElement) {
      iframeContainerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  // Listen for fullscreen exit via Esc
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) setIsFullscreen(false)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const handleExport = () => exportStoryJSON(story, 'story.json')
  const handleClose = () => {
    setPreviewMode('none')
    setIsFullscreen(false)
  }

  return (
    <div style={{ padding: 12, height: '100%', overflow: 'auto' }}>
      {/* ── Action buttons ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <button className="btn btn-sm btn-primary" onClick={handlePreview3D}>
          ▶ Preview 3D
        </button>
        <button
          className="btn btn-sm"
          onClick={handlePreviewAR}
          title="Opens in new window for camera access"
        >
          📱 Preview AR
        </button>
        <button className="btn btn-sm" onClick={handleOpenInNewWindow} title="Open 3D preview in a new window">
          🪟 New Window
        </button>
        <button className="btn btn-sm" onClick={handleExport}>
          💾 Export JSON
        </button>
      </div>

      {/* ── Engine URL ── */}
      <div className="form-group">
        <label className="form-label">Engine Server URL</label>
        <input
          className="form-input"
          value={engineUrl}
          onChange={(e) => setEngineUrl(e.target.value)}
          placeholder="http://localhost:8080"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Assets Base URL</label>
        <input
          className="form-input"
          value={assetsBaseUrl}
          onChange={(e) => useStore.getState().setAssetsBaseUrl(e.target.value)}
          placeholder="/examples/shadows-rebuilt/"
        />
      </div>

      {/* ── Inline 3D preview ── */}
      {previewMode !== 'none' && (
        <div style={{ marginTop: 8 }} ref={iframeContainerRef}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 4,
            }}
          >
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              LIVE PREVIEW — {previewMode === 'ar' ? 'AR (in popup)' : '3D'}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn btn-sm" onClick={handleOpenInNewWindow} title="Pop out to new window">
                🪟
              </button>
              <button className="btn btn-sm" onClick={handleToggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
                {isFullscreen ? '⬜' : '⛶'}
              </button>
              <button className="btn btn-sm btn-danger" onClick={handleClose}>
                ✕
              </button>
            </div>
          </div>
          <iframe
            ref={iframeRef}
            src={getPreviewUrl('3d')}
            style={{
              width: '100%',
              height: isFullscreen ? '100%' : 300,
              border: '1px solid var(--border-color)',
              borderRadius: isFullscreen ? 0 : 'var(--radius)',
              background: '#000',
            }}
            title="3D Preview"
            allow="autoplay; fullscreen"
          />
        </div>
      )}

      {previewMode === 'none' && (
        <div
          style={{
            color: 'var(--text-muted)',
            fontSize: 11,
            textAlign: 'center',
            padding: 20,
          }}
        >
          Click "Preview 3D" to see a live preview, or "New Window" to open it in a separate window.
          <br />
          Make sure the engine server is running at the URL above.
        </div>
      )}
    </div>
  )
}
