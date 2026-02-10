/**
 * UI & Branding Editor - Home screen, logo, fonts, colors, control labels
 */
import { useStore } from '../../state/store'

export function UIBrandingEditor() {
  const story = useStore((s) => s.story)
  const language = useStore((s) => s.language)
  const updateStory = useStore((s) => s.updateStory)

  const ui = story.ui

  return (
    <div style={{ padding: 12, overflow: 'auto', height: '100%' }}>
      {/* Home Screen */}
      <h4 style={{ color: 'var(--accent)', marginBottom: 12 }}>Home Screen</h4>

      <div className="form-group">
        <label className="form-label">Title ({language})</label>
        <input
          className="form-input"
          value={ui.homeScreen.title[language] || ''}
          onChange={(e) =>
            updateStory((d) => {
              d.ui.homeScreen.title[language] = e.target.value
            })
          }
        />
      </div>

      <div className="form-group">
        <label className="form-label">Subtitle ({language})</label>
        <input
          className="form-input"
          value={ui.homeScreen.subtitle[language] || ''}
          onChange={(e) =>
            updateStory((d) => {
              d.ui.homeScreen.subtitle[language] = e.target.value
            })
          }
        />
      </div>

      <div className="form-group">
        <label className="form-label">Start Button Text ({language})</label>
        <input
          className="form-input"
          value={ui.homeScreen.startButton[language] || ''}
          onChange={(e) =>
            updateStory((d) => {
              d.ui.homeScreen.startButton[language] = e.target.value
            })
          }
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Background (Mobile)</label>
          <input
            className="form-input"
            value={ui.homeScreen.backgroundImage}
            onChange={(e) =>
              updateStory((d) => {
                d.ui.homeScreen.backgroundImage = e.target.value
              })
            }
            placeholder="images/bg.jpg"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Background (Desktop)</label>
          <input
            className="form-input"
            value={ui.homeScreen.backgroundImageDesktop}
            onChange={(e) =>
              updateStory((d) => {
                d.ui.homeScreen.backgroundImageDesktop = e.target.value
              })
            }
            placeholder="images/bg_desktop.png"
          />
        </div>
      </div>

      {/* Branding */}
      <hr style={{ borderColor: 'var(--border-color)', margin: '12px 0' }} />
      <h4 style={{ color: 'var(--accent)', marginBottom: 12 }}>Branding</h4>

      <div className="form-group">
        <label className="form-label">Logo Path</label>
        <input
          className="form-input"
          value={ui.branding.logo}
          onChange={(e) =>
            updateStory((d) => {
              d.ui.branding.logo = e.target.value
            })
          }
          placeholder="logos/logo.png"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Primary Color</label>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <input
              type="color"
              value={ui.branding.primaryColor}
              onChange={(e) =>
                updateStory((d) => {
                  d.ui.branding.primaryColor = e.target.value
                })
              }
              style={{ width: 32, height: 24, border: 'none', cursor: 'pointer' }}
            />
            <input
              className="form-input"
              value={ui.branding.primaryColor}
              onChange={(e) =>
                updateStory((d) => {
                  d.ui.branding.primaryColor = e.target.value
                })
              }
              style={{ flex: 1 }}
            />
          </div>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Font Family</label>
        <input
          className="form-input"
          value={ui.branding.font}
          onChange={(e) =>
            updateStory((d) => {
              d.ui.branding.font = e.target.value
            })
          }
          placeholder="sans-serif"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Font WOFF2</label>
          <input
            className="form-input"
            value={ui.branding.fontFiles.woff2}
            onChange={(e) =>
              updateStory((d) => {
                d.ui.branding.fontFiles.woff2 = e.target.value
              })
            }
            placeholder="fonts/font.woff2"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Font WOFF</label>
          <input
            className="form-input"
            value={ui.branding.fontFiles.woff}
            onChange={(e) =>
              updateStory((d) => {
                d.ui.branding.fontFiles.woff = e.target.value
              })
            }
            placeholder="fonts/font.woff"
          />
        </div>
      </div>

      {/* Controls & Mode Labels */}
      <hr style={{ borderColor: 'var(--border-color)', margin: '12px 0' }} />
      <h4 style={{ color: 'var(--accent)', marginBottom: 12 }}>Control Labels</h4>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Exploration ({language})</label>
          <input
            className="form-input"
            value={ui.controls.exploration[language] || ''}
            onChange={(e) =>
              updateStory((d) => {
                d.ui.controls.exploration[language] = e.target.value
              })
            }
          />
        </div>
        <div className="form-group">
          <label className="form-label">Guided ({language})</label>
          <input
            className="form-input"
            value={ui.controls.guided[language] || ''}
            onChange={(e) =>
              updateStory((d) => {
                d.ui.controls.guided[language] = e.target.value
              })
            }
          />
        </div>
      </div>

      {/* Project Settings */}
      <hr style={{ borderColor: 'var(--border-color)', margin: '12px 0' }} />
      <h4 style={{ color: 'var(--accent)', marginBottom: 12 }}>Project Settings</h4>

      <div className="form-group">
        <label className="form-label">Languages (comma-separated)</label>
        <input
          className="form-input"
          value={story.project.languages.join(', ')}
          onChange={(e) =>
            updateStory((d) => {
              d.project.languages = e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
            }, 'Update languages')
          }
          placeholder="en, fi"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Default Language</label>
        <select
          className="form-select"
          value={story.project.defaultLanguage}
          onChange={(e) =>
            updateStory((d) => {
              d.project.defaultLanguage = e.target.value
            })
          }
        >
          {story.project.languages.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Supported Modes (comma-separated)</label>
        <input
          className="form-input"
          value={story.project.modes.join(', ')}
          onChange={(e) =>
            updateStory((d) => {
              d.project.modes = e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
            }, 'Update modes')
          }
          placeholder="ar, 3d"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Assets Base Path</label>
        <input
          className="form-input"
          value={story.project.assets.basePath}
          onChange={(e) =>
            updateStory((d) => {
              d.project.assets.basePath = e.target.value
            })
          }
          placeholder="assets/"
        />
      </div>
    </div>
  )
}
