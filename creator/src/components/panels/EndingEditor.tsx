/**
 * Ending Editor - Configure the ending sequence of the experience
 */
import { useStore } from '../../state/store'

export function EndingEditor() {
  const story = useStore((s) => s.story)
  const language = useStore((s) => s.language)
  const updateStory = useStore((s) => s.updateStory)

  const ending = story.ending

  return (
    <div style={{ padding: 12, overflow: 'auto', height: '100%' }}>
      <h4 style={{ color: 'var(--accent)', marginBottom: 12 }}>Ending Sequence</h4>

      {/* Trigger mode */}
      <div className="form-group">
        <label className="form-label">Trigger Mode</label>
        <select
          className="form-select"
          value={ending.triggerMode}
          onChange={(e) =>
            updateStory((d) => {
              d.ending.triggerMode = e.target.value as any
            }, 'Change ending trigger')
          }
        >
          <option value="lastVideo">When last video ends</option>
          <option value="audioEnd">When audio ends</option>
          <option value="characterFade">When character fades out</option>
        </select>
      </div>

      {/* Video */}
      <div className="form-group">
        <label className="form-label">Ending Video (path)</label>
        <input
          className="form-input"
          value={ending.video}
          onChange={(e) =>
            updateStory((d) => {
              d.ending.video = e.target.value
            }, 'Set ending video')
          }
          placeholder="video/ending.mp4"
        />
      </div>

      {/* Text */}
      <div className="form-group">
        <label className="form-label">Ending Text ({language})</label>
        <textarea
          className="form-input"
          rows={3}
          value={ending.text[language] || ''}
          onChange={(e) =>
            updateStory((d) => {
              d.ending.text[language] = e.target.value
            }, 'Set ending text')
          }
          placeholder="Final message shown to the viewer…"
        />
      </div>

      {/* Quotes */}
      <hr style={{ borderColor: 'var(--border-color)', margin: '12px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h5 style={{ color: 'var(--text-secondary)', margin: 0 }}>Quotes ({ending.quotes.length})</h5>
        <button
          className="btn btn-sm"
          onClick={() =>
            updateStory((d) => {
              d.ending.quotes.push({ en: '' })
            }, 'Add quote')
          }
        >
          + Add
        </button>
      </div>
      {ending.quotes.map((quote, i) => (
        <div key={i} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
          <input
            className="form-input"
            style={{ flex: 1 }}
            value={quote[language] || ''}
            placeholder={`Quote ${i + 1} (${language})`}
            onChange={(e) =>
              updateStory((d) => {
                d.ending.quotes[i][language] = e.target.value
              })
            }
          />
          <button
            className="btn-icon btn-sm"
            onClick={() =>
              updateStory((d) => {
                d.ending.quotes.splice(i, 1)
              }, 'Remove quote')
            }
          >
            ×
          </button>
        </div>
      ))}

      {/* Buttons */}
      <hr style={{ borderColor: 'var(--border-color)', margin: '12px 0' }} />
      <h5 style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>Ending Buttons</h5>

      <div className="form-group">
        <label className="form-label">Learn More URL</label>
        <input
          className="form-input"
          value={ending.buttons?.learnMore?.url || ''}
          onChange={(e) =>
            updateStory((d) => {
              if (!d.ending.buttons) d.ending.buttons = {}
              if (!d.ending.buttons.learnMore) d.ending.buttons.learnMore = { url: '' }
              d.ending.buttons.learnMore.url = e.target.value
            })
          }
          placeholder="https://..."
        />
      </div>

      <div className="form-group">
        <label className="form-label">Learn More Label ({language})</label>
        <input
          className="form-input"
          value={ending.buttons?.learnMore?.[language] || ''}
          onChange={(e) =>
            updateStory((d) => {
              if (!d.ending.buttons) d.ending.buttons = {}
              if (!d.ending.buttons.learnMore) d.ending.buttons.learnMore = { url: '' }
              ;(d.ending.buttons.learnMore as any)[language] = e.target.value
            })
          }
          placeholder="Learn More"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Return Home Label ({language})</label>
        <input
          className="form-input"
          value={ending.buttons?.returnHome?.[language] || ''}
          onChange={(e) =>
            updateStory((d) => {
              if (!d.ending.buttons) d.ending.buttons = {}
              if (!d.ending.buttons.returnHome) d.ending.buttons.returnHome = {}
              d.ending.buttons.returnHome[language] = e.target.value
            })
          }
          placeholder="Return Home"
        />
      </div>
    </div>
  )
}
