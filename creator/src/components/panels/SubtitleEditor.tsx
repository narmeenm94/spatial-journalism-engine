import { useState } from 'react'
import { CaptionAppearance } from './CaptionAppearance'
/**
 * Subtitle Editor - Inline editing of subtitle entries for the active scene
 */
import { useStore } from '../../state/store'

export function SubtitleEditor() {
  const [appearance, setAppearance] = useState(false)
  const story = useStore((s) => s.story)
  const activeSceneId = useStore((s) => s.activeSceneId)
  const language = useStore((s) => s.language)
  const addSubtitle = useStore((s) => s.addSubtitle)
  const removeSubtitle = useStore((s) => s.removeSubtitle)
  const updateSubtitle = useStore((s) => s.updateSubtitle)

  const activeScene = story.scenes.find((s) => s.id === activeSceneId)
  if (!activeScene) return null

  return (
    <div style={{ padding: 8, height: '100%', overflow: 'auto' }}>
      <div className="caption-editor-tabs"><button className="btn btn-sm" aria-pressed={!appearance} onClick={()=>setAppearance(false)}>Text & timing</button><button className="btn btn-sm" aria-pressed={appearance} onClick={()=>setAppearance(true)}>Appearance & templates</button></div>
      {appearance ? <CaptionAppearance/> : <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 8
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: 'var(--text-secondary)',
            fontWeight: 600
          }}
        >
          SUBTITLES ({activeScene.subtitles.length}) — {language.toUpperCase()}
        </span>
        <button
          className="btn btn-sm"
          onClick={() => addSubtitle(activeScene.id)}
        >
          + Add
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {activeScene.subtitles.map((sub, i) => (
          <div
            key={sub.id}
            style={{
              display: 'flex',
              gap: 4,
              alignItems: 'center',
              padding: '4px 0',
              borderBottom: '1px solid var(--border-color)'
            }}
          >
            <span
              style={{
                fontSize: 10,
                color: 'var(--text-muted)',
                width: 20,
                flexShrink: 0
              }}
            >
              {i + 1}
            </span>
            <input
              className="form-input"
              type="number"
              step={0.5}
              style={{ width: 50 }}
              value={sub.start}
              title="Start (seconds)"
              onChange={(e) =>
                updateSubtitle(activeScene.id, sub.id, {
                  start: Math.max(
                    0,
                    Math.min(sub.end - 0.1, parseFloat(e.target.value) || 0)
                  )
                })
              }
            />
            <input
              className="form-input"
              type="number"
              step={0.5}
              style={{ width: 50 }}
              value={sub.end}
              title="End (seconds)"
              onChange={(e) =>
                updateSubtitle(activeScene.id, sub.id, {
                  end: Math.max(
                    sub.start + 0.1,
                    parseFloat(e.target.value) || 0
                  )
                })
              }
            />
            <input
              className="form-input"
              style={{ flex: 1 }}
              value={sub.text[language] || ''}
              placeholder={`Subtitle text (${language})`}
              onChange={(e) =>
                updateSubtitle(activeScene.id, sub.id, {
                  text: { ...sub.text, [language]: e.target.value }
                })
              }
            />
            <button
              className="btn-icon btn-sm"
              onClick={() => removeSubtitle(activeScene.id, sub.id)}
              title="Remove subtitle"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {activeScene.subtitles.length === 0 && (
        <div
          style={{
            color: 'var(--text-muted)',
            fontSize: 11,
            textAlign: 'center',
            padding: 20
          }}
        >
          No subtitles yet. Click "+ Add" to create one.
        </div>
      )}
      </>}
    </div>
  )
}
