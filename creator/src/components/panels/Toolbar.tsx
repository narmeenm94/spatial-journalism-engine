/**
 * Top toolbar with project controls, transform tools, and view toggles
 */
import { useState } from 'react'
import { useStore } from '../../state/store'
import { exportStoryJSON, importStoryJSON } from '../../utils/export'

export function Toolbar() {
  const story = useStore((s) => s.story)
  const dirty = useStore((s) => s.dirty)
  const transformMode = useStore((s) => s.transformMode)
  const setTransformMode = useStore((s) => s.setTransformMode)
  const showGrid = useStore((s) => s.showGrid)
  const showAxes = useStore((s) => s.showAxes)
  const showBounds = useStore((s) => s.showBounds)
  const showCameraPath = useStore((s) => s.showCameraPath)
  const setShowGrid = useStore((s) => s.setShowGrid)
  const setShowAxes = useStore((s) => s.setShowAxes)
  const setShowBounds = useStore((s) => s.setShowBounds)
  const setShowCameraPath = useStore((s) => s.setShowCameraPath)
  const setStory = useStore((s) => s.setStory)
  const resetStory = useStore((s) => s.resetStory)
  const undo = useStore((s) => s.undo)
  const redo = useStore((s) => s.redo)
  const updateStory = useStore((s) => s.updateStory)
  const assetsBaseUrl = useStore((s) => s.assetsBaseUrl)
  const setAssetsBaseUrl = useStore((s) => s.setAssetsBaseUrl)

  const [showUrlInput, setShowUrlInput] = useState(false)

  const handleImport = async () => {
    try {
      const imported = await importStoryJSON()
      setStory(imported)

      // Auto-detect a sensible assets base URL
      if (!assetsBaseUrl) {
        // Default for Shadows project served from engine dev server
        const defaultUrl = '/examples/shadows-rebuilt/'
        const url = window.prompt(
          'Set assets base URL (directory containing the story assets).\n\n' +
            'For the Shadows project served locally, use:\n' +
            defaultUrl,
          defaultUrl
        )
        if (url) setAssetsBaseUrl(url)
      }
    } catch (e) {
      console.error('Import failed:', e)
      alert('Import failed: ' + (e as Error).message)
    }
  }

  const handleExport = () => {
    exportStoryJSON(story)
  }

  return (
    <div className="editor-toolbar">
      {/* Logo */}
      <div className="toolbar-group">
        <span className="toolbar-title">SJ Creator</span>
      </div>

      {/* File operations */}
      <div className="toolbar-group">
        <button className="btn btn-sm" onClick={resetStory} title="New Story">
          New
        </button>
        <button className="btn btn-sm" onClick={handleImport} title="Open Story JSON">
          Open
        </button>
        <button className="btn btn-sm btn-primary" onClick={handleExport} title="Export Story JSON">
          Export{dirty ? ' *' : ''}
        </button>
      </div>

      {/* Undo/Redo */}
      <div className="toolbar-group">
        <button className="btn-icon" onClick={undo} title="Undo (Ctrl+Z)">
          ↶
        </button>
        <button className="btn-icon" onClick={redo} title="Redo (Ctrl+Y)">
          ↷
        </button>
      </div>

      {/* Transform tools */}
      <div className="toolbar-group">
        <button
          className={`btn-icon ${transformMode === 'translate' ? 'active' : ''}`}
          onClick={() => setTransformMode('translate')}
          title="Move (W)"
        >
          ✥
        </button>
        <button
          className={`btn-icon ${transformMode === 'rotate' ? 'active' : ''}`}
          onClick={() => setTransformMode('rotate')}
          title="Rotate (E)"
        >
          ↻
        </button>
        <button
          className={`btn-icon ${transformMode === 'scale' ? 'active' : ''}`}
          onClick={() => setTransformMode('scale')}
          title="Scale (R)"
        >
          ⤢
        </button>
      </div>

      {/* View toggles */}
      <div className="toolbar-group">
        <button
          className={`btn-icon ${showGrid ? 'active' : ''}`}
          onClick={() => setShowGrid(!showGrid)}
          title="Toggle Grid"
        >
          #
        </button>
        <button
          className={`btn-icon ${showAxes ? 'active' : ''}`}
          onClick={() => setShowAxes(!showAxes)}
          title="Toggle Axes"
        >
          +
        </button>
        <button
          className={`btn-icon ${showBounds ? 'active' : ''}`}
          onClick={() => setShowBounds(!showBounds)}
          title="Toggle Bounds"
        >
          ▢
        </button>
        <button
          className={`btn-icon ${showCameraPath ? 'active' : ''}`}
          onClick={() => setShowCameraPath(!showCameraPath)}
          title="Toggle Camera Paths"
        >
          ⌇
        </button>
      </div>

      {/* Assets base URL */}
      <div className="toolbar-group">
        <button
          className={`btn-icon ${assetsBaseUrl ? 'active' : ''}`}
          onClick={() => setShowUrlInput(!showUrlInput)}
          title={assetsBaseUrl ? `Assets: ${assetsBaseUrl}` : 'Set assets URL to load 3D models'}
        >
          🌐
        </button>
        {showUrlInput && (
          <input
            className="form-input"
            style={{ width: 200, fontSize: 11 }}
            placeholder="Assets base URL..."
            value={assetsBaseUrl}
            onChange={(e) => setAssetsBaseUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setShowUrlInput(false)
            }}
          />
        )}
      </div>

      {/* Project title */}
      <div className="toolbar-group" style={{ flex: 1, justifyContent: 'center' }}>
        <input
          className="form-input"
          style={{ maxWidth: 300, textAlign: 'center', background: 'transparent', border: 'none' }}
          value={story.project.title}
          onChange={(e) =>
            updateStory((d) => {
              d.project.title = e.target.value
            }, 'Rename project')
          }
        />
      </div>

      {/* Language selector */}
      <div className="toolbar-group">
        <select
          className="form-select"
          style={{ width: 60 }}
          value={useStore.getState().language}
          onChange={(e) => useStore.getState().setLanguage(e.target.value)}
        >
          {story.project.languages.map((l) => (
            <option key={l} value={l}>
              {l.toUpperCase()}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
