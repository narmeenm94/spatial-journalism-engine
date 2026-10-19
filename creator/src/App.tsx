import { useEditorPlayback } from './hooks/useEditorPlayback'
import { useStoryFonts } from './hooks/useStoryFonts'
import { matchesExampleMedia } from './utils/exampleMedia'
import { mediaPaths } from './utils/media'
import { useEffect, useState } from 'react'
import { usePanelLayout } from './hooks/usePanelLayout'
import { PanelDivider } from './components/PanelDivider'
import { DEFAULT_PANELS } from './utils/panelLayout'
import { PanelControls } from './components/PanelControls'
import { Toolbar } from './components/panels/Toolbar'
import { SceneHierarchy } from './components/panels/SceneHierarchy'
import { PropertyInspector } from './components/panels/PropertyInspector'
import { Viewport3D } from './components/viewport/Viewport3D'
import { BottomPanel } from './components/panels/BottomPanel'
import { ARPreview } from './components/ar/ARPreview'
import { Icon } from './components/Icon'
import { useStore } from './state/store'
import { useDraft } from './hooks/useDraft'
import { importStoryJSON, exportStoryJSON } from './utils/export'
import { saveDraft, readDraft } from './utils/persistence'
import { Tutorial } from './components/Tutorial'
import { TemplateArt } from './components/TemplateArt'
import { normalizeStory } from './utils/normalizeStory'
import { assertValidStory } from './utils/storyDocument'
import {
  createStarter,
  starterTemplates,
  type StarterKind
} from './utils/starter'
export default function App() {
  useStoryFonts()
  useEditorPlayback()
  const { status, ready } = useDraft()
  const story = useStore((s) => s.story),
    mode = useStore((s) => s.transformMode)
  const [tab, setTab] = useState('timeline'),
    [preview, setPreview] = useState(false),
    [newDialog, setNewDialog] = useState(false)
  const [focusedPanel, setFocusedPanel] = useState<string | null>(null)
  const [hiddenPanels, setHiddenPanels] = useState<string[]>([])
  const layout = usePanelLayout(!hiddenPanels.includes('chapters'), !hiddenPanels.includes('details'))
  const resetLayout = () => {
    layout.reset(); setHiddenPanels([]); setFocusedPanel(null)
    try { localStorage.removeItem('sj-screen-panel-sizes-v1') } catch { /* Optional layout preference. */ }
    window.dispatchEvent(new Event('sj-reset-panel-layout'))
  }
  const revealPanel = (id: string) => { setHiddenPanels(p => p.filter(x => x !== id)); setFocusedPanel(null) }
  const togglePanel = (id: string) => { setHiddenPanels(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]); setFocusedPanel(null) }
  const panelControls = (id: string) => <PanelControls name={id} expanded={focusedPanel === id} collapsed={hiddenPanels.includes(id)} onExpand={() => {setHiddenPanels(p => p.filter(x => x !== id)); setFocusedPanel(p => p === id ? null : id)}} onCollapse={() => togglePanel(id)}/>
  useEffect(() => {
    const restore = (e: KeyboardEvent) => { if (e.key === 'Escape') setFocusedPanel(null) }
    const audience = () => { setFocusedPanel(null); setMobilePanel('canvas') }
    window.addEventListener('sj-audience-view', audience)
    window.addEventListener('keydown', restore)
    return () => { window.removeEventListener('keydown', restore); window.removeEventListener('sj-audience-view', audience) }
  }, [])
  const [toolRequest, setToolRequest] = useState(0)
  const openTool = (tool: string) => { revealPanel('tools'); if (tool === 'ui') setFocusedPanel('tools'); setTab(tool); setToolRequest(n => n + 1); setMobilePanel('canvas') }
  const [tutorial, setTutorial] = useState(false)
  const [previewCount, setPreviewCount] = useState(0), [exportCount, setExportCount] = useState(0)
  const showPreview = () => { useStore.getState().setIsPlaying(false); setPreview(true); setPreviewCount(n => n + 1) }
  const showTutorial = () => { revealPanel('details'); setTutorial(true); setMobilePanel('learn') }
  const closeTutorial = () => { setTutorial(false); setMobilePanel('canvas') }
  const [download, setDownload] = useState<{
    url: string
    filename: string
    size: number
  } | null>(null)
  useEffect(
    () => () => {
      if (download) URL.revokeObjectURL(download.url)
    },
    [download]
  )
  const [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [mobilePanel, setMobilePanel] = useState('canvas')
  const assetsBaseUrl = useStore(s=>s.assetsBaseUrl), assetFiles = useStore(s=>s.assetFiles)
  const referencedMedia = mediaPaths(story)
  const localMedia = referencedMedia.filter(p=>assetFiles[p]||story.embeddedAssets?.[p]||p.startsWith('data:')).length
  const mediaStatus = localMedia === referencedMedia.length ? 'Media included' : assetsBaseUrl ? 'Linked media' : 'Connect media'
  const empty =
    !story.project.assets.environment &&
    story.scenes.length === 1 &&
    !story.scenes[0].characters.length &&
    !story.scenes[0].videos.length &&
    !story.scenes[0].audio.length
  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setNotice('')
    try {
      await action()
      return true
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e))
      return false
    } finally {
      setBusy(false)
    }
  }
  const checkpoint = async () => {
    const s = useStore.getState()
    await saveDraft(
      {
        story: structuredClone(s.story),
        assetFiles: { ...s.assetFiles },
        assetsBaseUrl: s.assetsBaseUrl,
        savedAt: Date.now()
      },
      'previous'
    )
    setDownload(null)
  }
  const restore = () =>
    run(async () => {
      const d = await readDraft('previous')
      if (!d) throw new Error('No previous workspace is saved yet.')
      await checkpoint()
      useStore.getState().setStory(d.story)
      useStore.setState({
        assetFiles: d.assetFiles,
        assetsBaseUrl: d.assetsBaseUrl
      })
      setNewDialog(false)
      setTutorial(false)
      setMobilePanel('canvas')
    })
  const open = () =>
    run(async () => {
      const imported = await importStoryJSON()
      if (imported) {
        let linkedBase = ''
        if(import.meta.env.DEV) {
          try {
            const url = new URL('/examples/shadows-rebuilt/story.json', window.location.origin)
            const response=await fetch(url,{signal:AbortSignal.timeout(3000)})
            if(response.ok && matchesExampleMedia(imported, normalizeStory(await response.json()))) linkedBase=new URL('.',url).href
          } catch { /* Other stories can connect their media through the library. */ }
        }
        await checkpoint()
        useStore.getState().setStory(imported)
        if(linkedBase)useStore.getState().setAssetsBaseUrl(linkedBase)
        const missing=mediaPaths(imported).some(p=>!imported.embeddedAssets?.[p]&&!/^(https?:|data:|blob:)/.test(p))
        setNotice(linkedBase ? 'Your JSON opened. Its media is connected to the bundled Shadows folder.' : missing ? 'Story opened. Connect its media folder or add the referenced files in Media.' : 'Portable story opened with its included media.')
        setNewDialog(false)
        closeTutorial()
      }
    })
  const save = () =>
    run(async () => {
      const s = useStore.getState()
      const result = await exportStoryJSON(
        s.story,
        (s.story.project.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() ||
          'story') + '.json',
        s.assetFiles,
        s.assetsBaseUrl
      )
      setDownload(result)
      setExportCount(n => n + 1)
      setNotice('Story exported. Local media is included in the JSON file.')
    })
  const starter = (kind: StarterKind = 'gallery') =>
    run(async () => {
      await checkpoint()
      await createStarter(kind)
      setNewDialog(false)
      setTutorial(false)
      setMobilePanel('canvas')
      setTab('timeline')
    })
  const openShadows = () =>
    run(async () => {
      const url = new URL(
        '/examples/shadows-rebuilt/story.json',
        window.location.origin
      )
      const response = await fetch(url)
      if (!response.ok)
        throw new Error('The Shadows example is unavailable on this server.')
      const doc = await response.json()
      assertValidStory(doc)
      const imported = normalizeStory(doc)
      await checkpoint()
      useStore.getState().setStory(imported)
      useStore.getState().setAssetsBaseUrl(new URL('.', url).href)
      setNewDialog(false)
      setTutorial(false)
      setMobilePanel('canvas')
      setTab('timeline')
      setNotice('Shadows opened with its original linked media.')
    })
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target
      if (
        e.defaultPrevented ||
        e.isComposing ||
        (target instanceof HTMLElement &&
          (target.isContentEditable ||
            target.closest('input,textarea,select,[role="textbox"]')))
      )
        return
      const s = useStore.getState(),
        key = e.key.toLowerCase(),
        modifier = e.ctrlKey || e.metaKey
      if (modifier && key === 'z') {
        e.preventDefault()
        e.shiftKey ? s.redo() : s.undo()
        return
      }
      if (modifier && key === 'y') {
        e.preventDefault()
        s.redo()
        return
      }
      if (key === 'escape') {
        s.clearSelection()
        setPreview(false)
        setNewDialog(false)
      }
      // Screen editing must never delete or transform a selected 3D object.
      if ((e.target as HTMLElement)?.closest('.screen-designer,button')) return
      if (!modifier && !e.altKey) {
        if (key === 'w') s.setTransformMode('translate')
        if (key === 'e') s.setTransformMode('rotate')
        if (key === 'r') s.setTransformMode('scale')
      }
      if (key === 'f' && !modifier) {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('sj-focus-selected'))
      }
      if (key === 'delete' || key === 'backspace') {
        const { type, sceneId, itemId } = s.selection
        if (itemId) {
          e.preventDefault()
          if (type === 'character' && sceneId)
            s.removeCharacter(sceneId, itemId)
          if (type === 'video' && sceneId) s.removeVideo(sceneId, itemId)
          if (type === 'audio' && sceneId) s.removeAudio(sceneId, itemId)
          if (type === 'spotlight' && sceneId)
            s.removeSpotlight(sceneId, itemId)
          if (type === 'staticObject' && sceneId)
            s.updateStory((d) => {
              const c = d.scenes.find((c) => c.id === sceneId)
              if (c) c.objects = c.objects?.filter((o) => o.id !== itemId)
            }, 'Remove object')
          if (type === 'cameraKeyframe' && sceneId)
            s.removeCameraKeyframe(sceneId, itemId)
          if (type === 'sceneButton' && sceneId) s.updateStory(d => {
            const chapter = d.scenes.find(c => c.id === sceneId)
            if (chapter) chapter.sceneButtons = chapter.sceneButtons?.filter(b => b.id !== itemId)
          }, 'Remove scene button')
          if (type === 'interactiveObject') s.removeInteractiveObject(itemId)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
  useEffect(() => {
    if (!preview && !newDialog) return
    const previous = document.activeElement as HTMLElement | null
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')
    const background = document.querySelectorAll<HTMLElement>(
      '.studio-header,.workspace-nav,.editor-main,.studio-footer'
    )
    background.forEach((e) => (e.inert = true))
    const focusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input,select,textarea,iframe'
        ) || []
      ).filter((e) => e.getClientRects().length)
    focusable()[0]?.focus()
    const trap = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreview(false)
        setNewDialog(false)
        return
      }
      if (e.key !== 'Tab') return
      const items = focusable(),
        first = items[0],
        last = items.at(-1)
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last?.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first?.focus()
      }
    }
    document.addEventListener('keydown', trap)
    return () => {
      background.forEach((e) => (e.inert = false))
      document.removeEventListener('keydown', trap)
      previous?.focus()
    }
  }, [preview, newDialog])
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(''), 9000)
    return () => clearTimeout(t)
  }, [notice])
  return (
    <div style={layout.style} className={'editor-layout mobile-' + mobilePanel + (tutorial ? ' learning-open' : '') + (focusedPanel ? ' focus-' + focusedPanel : '') + hiddenPanels.map(id => ' hide-' + id).join('')}>
      <Toolbar
        onNew={() => setNewDialog(true)}
        onOpen={open}
        onExport={save}
        onPreview={showPreview}
        saving={status}
        busy={busy || !ready}
      />
      <nav className="workspace-nav" aria-label="Workspace">
        <div className="workspace-title">
          Workspace
        </div>
        <div className="mobile-navigation">
          {[
            ['chapters', 'Chapters'],
            ['canvas', 'Canvas'],
            ['details', 'Details']
          ].map(([id, label]) => (
            <button
              key={id}
              aria-pressed={mobilePanel === id}
              className={mobilePanel === id ? 'active' : ''}
              onClick={() => { revealPanel(id); setMobilePanel(id); if (id === 'details') setTutorial(false) }}
            >
              <Icon name={id==='chapters'?'chapters':id==='canvas'?'cube':'settings'} size={19}/>{label}
            </button>
          ))}
        </div>
        <span className="workspace-hint">Build a world. Invite people in.</span>
        <button className="btn quiet focus-canvas" aria-pressed={focusedPanel==='canvas'} onClick={()=>setFocusedPanel(p=>p==='canvas'?null:'canvas')}><Icon name="expand" size={15}/>{focusedPanel==='canvas'?'Back to studio':'Focus canvas'}</button><div className="layout-toggles" aria-label="Visible panels">{['chapters', 'details', 'tools'].map(id => <button key={id} aria-pressed={!hiddenPanels.includes(id)} onClick={() => togglePanel(id)}>{id === 'chapters' ? 'Chapters' : id === 'details' ? 'Details' : 'Tools'}</button>)}<button className="reset-layout" title="Reset panel sizes and visibility" onClick={resetLayout}>Reset layout</button></div>
        <button className="btn quiet btn-sm" onClick={showTutorial}>
          <Icon name="info" size={15} />
          Learn by doing
        </button>
      </nav>
      <main className="editor-main" ref={layout.mainRef}>
        <SceneHierarchy controls={panelControls('chapters')} onInspect={()=>{revealPanel('details');setMobilePanel('details');setTutorial(false)}} />
        {!focusedPanel && !hiddenPanels.includes('chapters') && <PanelDivider name="chapters panel" axis="vertical" value={layout.left} min={220} max={layout.leftMax} onChange={v => layout.change('left', v)} onReset={() => layout.change('left', DEFAULT_PANELS.left)}/>}
        <div className="editor-center" ref={layout.centerRef}>
          <div className="canvas-toolbar">
            <div className="segmented">
              {(
                [
                  ['translate', 'move', 'Move'],
                  ['rotate', 'rotate', 'Rotate'],
                  ['scale', 'scale', 'Scale']
                ] as const
              ).map(([id, icon, label]) => (
                <button
                  key={id}
                  className={mode === id ? 'active' : ''}
                  aria-pressed={mode === id}
                  onClick={() => useStore.getState().setTransformMode(id)}
                >
                  <Icon name={icon} size={15} />
                  {label}
                </button>
              ))}
            </div>
            <div className="canvas-options">
              <button
                className="btn-icon"
                aria-label="Toggle grid"
                title="Toggle grid"
                onClick={() => {
                  const s = useStore.getState()
                  s.setShowGrid(!s.showGrid)
                }}
              >
                <Icon name="grid" size={17} />
              </button>
              <button
                className="btn quiet btn-sm"
                onClick={() =>
                  window.dispatchEvent(new CustomEvent('sj-reset-view'))
                }
              >
                Reset view
              </button>
              <button
                className="btn quiet btn-sm"
                onClick={() => {
                  useStore.getState().setSelection({ type: 'environment' })
                  setMobilePanel('details')
                }}
              >
                Space settings
              </button>
            </div>
          </div>
          <div className="canvas-stage">
            <Viewport3D />
            {ready && empty && (
              <div className="welcome-card">
                <span className="eyebrow">YOUR NEXT STORY STARTS HERE</span>
                <h1>
                  Make a place
                  <br />
                  tell a story.
                </h1>
                <p>
                  Bring together spaces, voices and moments.
                  <br />
                  Shape the experience, one chapter at a time.
                </p>
                <button
                  className="btn btn-primary"
                  disabled={busy}
                  onClick={() => starter()}
                >
                  <Icon name="cube" size={17} />
                  {busy ? 'Creating your space…' : 'Explore a starter space'}
                  <Icon name="arrow" size={16} />
                </button>
                <div className="welcome-links">
                  <button
                    onClick={() => {
                      setTab('assets')
                      setNotice(
                        'Add your media below. Choose “Use as space” on a model to begin.'
                      )
                    }}
                  >
                    Add your own media
                  </button>
                  <span>·</span>
                  <button onClick={open}>Open a story</button>
                </div>
              </div>
            )}
          </div>
          {!focusedPanel && !hiddenPanels.includes('tools') && <PanelDivider name="tools panel" axis="horizontal" reverse value={layout.bottom} min={160} max={layout.bottomMax} onChange={v => layout.change('bottom', v)} onReset={() => layout.change('bottom', DEFAULT_PANELS.bottom)}/>}
          <BottomPanel onReveal={() => setHiddenPanels(p=>p.filter(id=>id!=='tools'))} controls={panelControls('tools')} key={tab + toolRequest} activeTab={tab} onTab={tool => {setHiddenPanels(p=>p.filter(id=>id!=='tools'));setTab(tool);if(tool==='ui')setFocusedPanel('tools')}} />
        </div>
        {!focusedPanel && !hiddenPanels.includes('details') && <PanelDivider name="details panel" axis="vertical" reverse value={layout.right} min={260} max={layout.rightMax} onChange={v => layout.change('right', v)} onReset={() => layout.change('right', DEFAULT_PANELS.right)}/>}
        {tutorial ? <Tutorial controls={panelControls('details')} onClose={closeTutorial} onTab={openTool} onPanel={setMobilePanel} onPreview={showPreview} onExport={save} previewCount={previewCount} exportCount={exportCount} busy={busy || !ready}/> : <PropertyInspector controls={panelControls('details')} onTool={openTool} onLearn={showTutorial}/ >}
      </main>
      <footer className="studio-footer">
        <span>
          <Icon name="check" size={13} />
          One story. One JSON file.
        </span>
        <span>
          {story.scenes.length} chapters
          <span className="footer-divider">/</span>
          {story.project.languages.length} language
          {story.project.languages.length === 1 ? '' : 's'}
        </span>
        <button onClick={() => openTool('assets')}>
          {mediaStatus} <Icon name="arrow" size={13} />
        </button>
      </footer>
      {download && (
        <a
          className="download-ready"
          href={download.url}
          download={download.filename}
        >
          Download JSON · {(download.size / 1024 / 1024).toFixed(1)} MB
        </a>
      )}
      {notice && (
        <div className="studio-notice" role="status">
          <Icon name="info" />
          <span>{notice}</span>
          <button
            className="btn-icon"
            aria-label="Dismiss message"
            onClick={() => setNotice('')}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
      {preview && (
        <div className="modal-backdrop">
          <section
            className="preview-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Story preview"
          >
            <div className="dialog-heading">
              <div>
                <span className="eyebrow">AUDIENCE VIEW</span>
                <h2>Experience your story</h2>
              </div>
              <button
                className="btn-icon"
                aria-label="Close preview"
                onClick={() => setPreview(false)}
              >
                <Icon name="close" />
              </button>
            </div>
            <ARPreview />
          </section>
        </div>
      )}
      {newDialog && (
        <div className="modal-backdrop">
          <section
            className="new-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="New story"
          >
            <button
              className="dialog-close btn-icon"
              aria-label="Close new story"
              onClick={() => setNewDialog(false)}
            >
              <Icon name="close" />
            </button>
            <span className="eyebrow">A NEW BEGINNING</span>
            <h2>What will your story be?</h2>
            <p>
              Your current workspace is kept as a recovery copy. Export a JSON
              file to keep it permanently.
            </p>
            <div className="starter-options">
              {starterTemplates.map((template) => (
                <button
                  key={template.id}
                  disabled={busy}
                  onClick={() => starter(template.id)}
                >
                  <TemplateArt kind={template.id} />
                  <span className="template-tag">{template.category}</span>
                  <strong>{template.title}</strong>
                  <span>{template.description}</span>
                </button>
              ))}
              {import.meta.env.DEV && (
                <button
                  className="template-plain"
                  disabled={busy}
                  onClick={openShadows}
                >
                  <Icon name="folder" size={24} />
                  <strong>Shadows of the Stabilisation Point</strong>
                  <span>
                    examples/shadows-rebuilt/story.json · Opens the documentary and connects its local media.
                  </span>
                </button>
              )}
              <button
                className="template-plain"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await checkpoint()
                    useStore.getState().resetStory()
                    setNewDialog(false)
                    closeTutorial()
                  })
                }
              >
                <Icon name="plus" size={26} />
                <strong>Blank story</strong>
                <span>Start with an empty chapter and your own media.</span>
              </button>
            </div>
            <button className="btn" onClick={save}>
              Export current story
            </button>
            <button className="btn quiet" disabled={busy} onClick={restore}>
              Restore previous workspace
            </button>
          </section>
        </div>
      )}
    </div>
  )
}
