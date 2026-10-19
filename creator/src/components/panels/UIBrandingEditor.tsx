import { FontPicker } from '../FontPicker'
import { useEffect, useMemo, useState } from 'react'
/**
 * UI & Branding Editor - Home screen, logo, fonts, colors, control labels
 */
import { prepareImageTarget } from '../../utils/imageTarget'
import { useStore } from '../../state/store'

export function UIBrandingEditor() {
  const story = useStore((s) => s.story)
  const [languageDraft, setLanguageDraft] = useState(
    story.project.languages.join(', ')
  )
  useEffect(
    () => setLanguageDraft(story.project.languages.join(', ')),
    [story.project.languages]
  )
  const language = useStore((s) => s.language)
  const updateStory = useStore((s) => s.updateStory)

  const [arError, setArError] = useState('')
  const [preparingTarget, setPreparingTarget] = useState(false)
  const files = useStore((s) => s.assetFiles)
  const targetPath = story.project.ar?.imageTargets?.[0]?.imagePath
  const targetPreview = useMemo(
    () =>
      targetPath && files[targetPath]
        ? URL.createObjectURL(files[targetPath])
        : targetPath
          ? story.embeddedAssets?.[targetPath]
          : undefined,
    [targetPath, files, story.embeddedAssets]
  )
  useEffect(
    () => () => {
      if (targetPreview?.startsWith('blob:')) URL.revokeObjectURL(targetPreview)
    },
    [targetPreview]
  )
  const ui = story.ui

  return (
    <div style={{ padding: 12, overflow: 'auto', height: '100%' }}>
      <details className="designer-precision"><summary>Player controls</summary>
        <label className="form-group">Recenter shortcut<select className="form-select" aria-label="Recenter shortcut" value={ui.controls.recenterPlacement||'menu'} onChange={e=>updateStory(d=>{d.ui.controls.recenterPlacement=e.target.value as 'menu'|'overlay'})}><option value="menu">Inside the player menu</option><option value="overlay">Visible corner button</option></select></label>
        {ui.controls.recenterPlacement==='overlay'&&<label className="form-group">Recenter icon<input aria-label="Upload recenter icon" type="file" accept="image/png,image/svg+xml,image/webp" onChange={e=>{const file=e.target.files?.[0];if(file){const path='ui/'+crypto.randomUUID().slice(0,8)+'-'+file.name;useStore.getState().addAssetFile(path,file);updateStory(d=>{d.ui.controls.recenterIcon=path})}e.target.value=''}}/></label>}
      </details>
      <h4 style={{ marginBottom: 12 }}>Phone AR</h4>
      <div className="form-group">
        <label className="form-label" htmlFor="ar-backend">
          Tracking engine
        </label>
        <select
          id="ar-backend"
          className="form-select"
          value={story.project.ar?.backend || 'auto'}
          onChange={(e) =>
            updateStory((d) => {
              d.project.ar = {
                ...d.project.ar,
                backend: e.target.value as 'auto' | 'webxr' | '8thwall'
              }
            })
          }
        >
          <option value="auto">
            Automatic · WebXR, with 8th Wall fallback
          </option>
          <option value="webxr">Native WebXR</option>
          <option value="8thwall">8th Wall</option>
        </select>
      </div>
      <p className="form-hint">
        World tracking places a story in the room. Image tracking anchors it to
        a printed photograph or exhibit label. Test on your phone over HTTPS.
      </p>
      <div className="form-group">
        <label className="form-label" htmlFor="ar-tracking">
          Story placement
        </label>
        <select
          id="ar-tracking"
          className="form-select"
          value={story.project.ar?.tracking || 'world'}
          onChange={(e) => {
            if (e.target.value === 'world')
              updateStory((d) => {
                d.project.ar = { ...d.project.ar, tracking: 'world' }
              })
            else
              setArError(
                'Choose a target image below to enable image tracking.'
              )
          }}
        >
          <option value="world">Place on a surface</option>
          <option value="image">Follow an image target</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="target-photo">
          Choose a target image
        </label>
        <input
          id="target-photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={preparingTarget}
          onChange={async (event) => {
            const input = event.currentTarget,
              file = input.files?.[0]
            if (!file) return
            setPreparingTarget(true)
            setArError('')
            try {
              const result = await prepareImageTarget(file)
              useStore
                .getState()
                .addAssetFile(result.target.imagePath, result.file)
              updateStory((d) => {
                d.project.ar = {
                  backend: '8thwall',
                  tracking: 'image',
                  imageTargets: [result.target]
                }
              }, 'Prepare image target')
            } catch (error) {
              setArError(
                error instanceof Error
                  ? error.message
                  : 'Could not prepare the image.'
              )
            } finally {
              setPreparingTarget(false)
              input.value = ''
            }
          }}
        />
        <p className="form-hint">
          {preparingTarget
            ? 'Preparing your target…'
            : 'Choose a detailed photograph or printed illustration. We prepare a centered portrait crop automatically. Avoid plain logos, repeating patterns and reflections.'}
        </p>
        {targetPreview && (
          <div
            style={{
              display: 'flex',
              gap: 14,
              alignItems: 'center',
              marginTop: 12
            }}
          >
            <img
              src={targetPreview}
              alt="Prepared AR image target"
              style={{
                width: 75,
                height: 100,
                objectFit: 'contain',
                border: '1px solid #ddd'
              }}
            />
            <div>
              <p className="form-hint">
                Print this target or display it on another screen. Point your
                phone at it to reveal the story.
              </p>
              <a
                className="btn btn-sm"
                href={targetPreview}
                download="story-image-target.jpg"
              >
                Download target image
              </a>
            </div>
          </div>
        )}
      </div>
      <details className="media-sources">
        <summary>Advanced image target import</summary>
        <p>
          Import the target JSON created by the 8th Wall image-target tool, then
          add its referenced image in Media library. A prepared target includes
          the tracking crop and geometry.
        </p>
        <label
          className="btn"
          style={{ display: 'inline-flex', cursor: 'pointer' }}
        >
          Import image target
          <input
            aria-label="Import image target"
            type="file"
            accept=".json,application/json"
            style={{ maxWidth: 190 }}
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              try {
                const target = JSON.parse(await file.text())
                if (
                  !target.imagePath ||
                  !['PLANAR', 'CYLINDER', 'CONICAL'].includes(target.type) ||
                  !target.properties ||
                  typeof target.properties !== 'object' ||
                  Array.isArray(target.properties)
                )
                  throw new Error(
                    'This is not a prepared 8th Wall image target JSON.'
                  )
                updateStory((d) => {
                  d.project.ar = {
                    backend: '8thwall',
                    tracking: 'image',
                    imageTargets: [target]
                  }
                }, 'Import image target')
                setArError('')
              } catch (error) {
                setArError(
                  error instanceof Error
                    ? error.message
                    : 'Could not import the target.'
                )
              }
              e.target.value = ''
            }}
          />
        </label>
        {story.project.ar?.imageTargets?.map((target) => (
          <label key={target.imagePath}>
            Target image path
            <input
              className="form-input"
              aria-label="Target image path"
              value={target.imagePath}
              onChange={(e) =>
                updateStory((d) => {
                  d.project.ar!.imageTargets![0].imagePath = e.target.value
                })
              }
            />
          </label>
        ))}
      </details>
      {arError && (
        <p role="alert" style={{ color: 'var(--danger)' }}>
          {arError}
        </p>
      )}
      <hr />
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
              style={{
                width: 32,
                height: 24,
                border: 'none',
                cursor: 'pointer'
              }}
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

      <FontPicker label="Story typeface" value={ui.branding.font} onChange={font=>updateStory(d=>{d.ui.branding.font=font;d.ui.branding.fontFiles={woff2:'',woff:''}})}/>
      <details className="lesson-reference"><summary>Existing font file references</summary><p>Older stories can continue using their original WOFF files.</p><label className="designer-field">WOFF2 path<input className="form-input" value={ui.branding.fontFiles.woff2} onChange={e=>updateStory(d=>{d.ui.branding.fontFiles.woff2=e.target.value})}/></label><label className="designer-field">WOFF path<input className="form-input" value={ui.branding.fontFiles.woff} onChange={e=>updateStory(d=>{d.ui.branding.fontFiles.woff=e.target.value})}/></label></details>
      {/* Controls & Mode Labels */}
      <hr style={{ borderColor: 'var(--border-color)', margin: '12px 0' }} />
      <h4 style={{ color: 'var(--accent)', marginBottom: 12 }}>
        Control Labels
      </h4>

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
      <h4 style={{ color: 'var(--accent)', marginBottom: 12 }}>
        Project Settings
      </h4>

      <div className="form-group">
        <label className="form-label">Languages (comma-separated)</label>
        <input
          className="form-input"
          value={languageDraft}
          onChange={(e) => setLanguageDraft(e.target.value)}
          onBlur={(e) =>
            updateStory((d) => {
              const langs = [
                ...new Set(
                  e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                )
              ]
              d.project.languages = langs.length ? langs : ['en']
              if (!d.project.languages.includes(d.project.defaultLanguage))
                d.project.defaultLanguage = d.project.languages[0]
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
        <label className="form-label">Audience experiences</label>
        {(
          [
            ['3d', 'Web 3D'],
            ['ar', 'Phone AR'],
            ['vr', 'Headset VR']
          ] as const
        ).map(([mode, label]) => (
          <label
            key={mode}
            style={{ display: 'flex', gap: 8, margin: '8px 0', fontSize: 12 }}
          >
            <input
              type="checkbox"
              checked={story.project.modes.includes(mode)}
              disabled={
                story.project.modes.length === 1 &&
                story.project.modes.includes(mode)
              }
              onChange={(e) =>
                updateStory((d) => {
                  d.project.modes = e.target.checked
                    ? [...d.project.modes, mode]
                    : d.project.modes.filter((m) => m !== mode)
                }, 'Change audience modes')
              }
            />
            {label}
          </label>
        ))}
        <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          AR and VR require a compatible device and HTTPS.
        </p>
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
