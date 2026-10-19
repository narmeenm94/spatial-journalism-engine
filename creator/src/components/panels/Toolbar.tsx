import { useStore } from '../../state/store'
import { Icon } from '../Icon'
type Props = {
  onNew: () => void
  onOpen: () => void
  onExport: () => void
  onPreview: () => void
  saving: string
  busy: boolean
}
export function Toolbar({
  onNew,
  onOpen,
  onExport,
  onPreview,
  saving,
  busy
}: Props) {
  const title = useStore((s) => s.story.project.title)
  const language = useStore((s) => s.language)
  const languages = useStore((s) => s.story.project.languages)
  const past = useStore((s) => s._history.past.length)
  const future = useStore((s) => s._history.future.length)
  return (
    <header className="studio-header">
      <a
        className="studio-brand"
        href="#"
        onClick={(e) => e.preventDefault()}
        aria-label="Spatial Journalism Studio"
      >
        <span className="brand-mark">
          <Icon name="cube" size={22} />
        </span>
        <span>
          Spatial<span className="brand-sub">Journalism studio</span>
        </span>
      </a>
      <div className="document-heading">
        <input
          aria-label="Story title"
          value={title}
          onChange={(e) =>
            useStore.getState().updateStory((d) => {
              d.project.title = e.target.value
            }, 'Rename story')
          }
        />
        <span className="save-state" role="status">
          <span
            className={
              saving.includes('saved') ? 'status-dot' : 'status-dot pending'
            }
          />
          {saving}
        </span>
      </div>
      <div className="header-actions">
        <button className="btn quiet" disabled={busy} onClick={onNew}>
          New
        </button>
        <button className="btn quiet" disabled={busy} onClick={onOpen}>
          <Icon name="folder" size={16} />
          Open
        </button>
        <span className="action-divider" />
        <button
          className="btn-icon"
          title="Undo"
          aria-label="Undo"
          disabled={!past}
          onClick={() => useStore.getState().undo()}
        >
          <Icon name="undo" />
        </button>
        <button
          className="btn-icon"
          title="Redo"
          aria-label="Redo"
          disabled={!future}
          onClick={() => useStore.getState().redo()}
        >
          <Icon name="redo" />
        </button>
        <select
          aria-label="Editing language"
          className="language-select"
          value={language}
          onChange={(e) => useStore.getState().setLanguage(e.target.value)}
        >
          {languages.map((l) => (
            <option key={l} value={l}>
              {l.toUpperCase()}
            </option>
          ))}
        </select>
        <button className="btn" disabled={busy} onClick={onPreview}>
          <Icon name="play" size={15} />
          Preview
        </button>
        <button className="btn btn-primary" disabled={busy} onClick={onExport}>
          <Icon name="download" size={16} />
          {busy ? 'Preparing…' : 'Export story'}
        </button>
      </div>
    </header>
  )
}
