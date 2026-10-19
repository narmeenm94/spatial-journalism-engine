import { useState, useEffect, type ReactNode } from 'react'
import { useStore } from '../../state/store'
import { Icon } from '../Icon'
import type { SelectionType } from '../../state/types'
export function SceneHierarchy({controls,onInspect}: {controls?: ReactNode;onInspect?:()=>void}) {
  const story = useStore((s) => s.story),
    active = useStore((s) => s.activeSceneId),
    language = useStore((s) => s.language),
    selection = useStore((s) => s.selection)
  const [dragged, setDragged] = useState<number | null>(null)
  const [expandedGroup,setExpandedGroup]=useState<string|null>(null)
  useEffect(()=>setExpandedGroup(null),[active])
  useEffect(()=>{if(selection.sceneId===active&&selection.itemId)setExpandedGroup(selection.type)},[selection.itemId,selection.type,selection.sceneId,active])
  const scene = story.scenes.find((s) => s.id === active)
  const store = useStore.getState()
  const inspect=(value: Parameters<typeof store.setSelection>[0])=>{store.setSelection(value);onInspect?.()}
  const groups: Array<{
    name: string
    icon: string
    type: SelectionType
    items: { id: string; name?: string }[]
    add: () => void
  }> = scene
    ? [
        {
          name: 'People & models',
          icon: 'cube',
          type: 'character',
          items: scene.characters.map((c) => ({
            id: c.id,
            name: c.model.split('/').pop() || 'New model'
          })),
          add: () => store.addCharacter(scene.id)
        },
        {
          name: 'Video',
          icon: 'video',
          type: 'video',
          items: scene.videos.map((v) => ({
            id: v.id,
            name: v.url.split('/').pop() || 'New video'
          })),
          add: () => store.addVideo(scene.id)
        },
        {
          name: 'Audio',
          icon: 'audio',
          type: 'audio',
          items: scene.audio.map((a) => ({
            id: a.id,
            name: a.file.split('/').pop() || 'New audio'
          })),
          add: () => store.addAudio(scene.id)
        },
        {
          name: 'Objects',
          icon: 'cube',
          type: 'staticObject',
          items: scene.objects || [],
          add: () => {
            const id = 'object-' + crypto.randomUUID()
            store.updateStory((d) => {
              const c = d.scenes.find((c) => c.id === scene.id)!
              c.objects ??= []
              c.objects.push({
                id,
                model: '',
                position: [0, 0, 0],
                rotation: [0, 0, 0],
                scale: [1, 1, 1]
              })
            }, 'Add object')
            store.setSelection({
              type: 'staticObject',
              sceneId: scene.id,
              itemId: id
            })
          }
        },
        {
          name: 'Scene buttons', icon: 'play', type: 'sceneButton',
          items: (scene.sceneButtons || []).map(b => ({ id: b.id, name: b.label[language] || b.label.en || 'Scene button' })),
          add: () => store.addSceneButton(scene.id)
        },
        {
          name: 'Lights',
          icon: 'light',
          type: 'spotlight',
          items: scene.lighting.spotlights || [],
          add: () => store.addSpotlight(scene.id)
        }
      ]
    : []
  return (
    <aside className="panel panel-left" aria-label="Story chapters">
      <div className="panel-header">
        <span><Icon name="chapters" size={22}/> Chapters</span>
        <span className="count-pill">{story.scenes.length}</span>{controls}
      </div>
      <div className="chapter-scroll" role="region" aria-label="Chapters and content" tabIndex={0}>
      <div className="chapter-list">
        {story.scenes.map((chapter, i) => (
          <div
            className={
              'chapter-card ' + (active === chapter.id ? 'active' : '')
            }
            key={chapter.id}
            draggable
            onDragStart={() => setDragged(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              if (dragged !== null) store.reorderScenes(dragged, i)
              setDragged(null)
            }}
          >
            <button
              className="chapter-select"
              onClick={() => store.setActiveScene(chapter.id)}
              aria-pressed={active === chapter.id}
            >
              <span className="chapter-number">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span>
                <strong>
                  {chapter.title[language] ||
                    Object.values(chapter.title)[0] ||
                    'Untitled chapter'}
                </strong>
                <span className="chapter-media-strip" aria-label="Chapter media">
                  {[[chapter.characters.length,'cube','models'],[chapter.videos.length,'video','videos'],[chapter.audio.length,'audio','audio tracks'],[(chapter.objects||[]).length,'cube','objects']].filter(([count])=>Number(count)>0).map(([count,icon,label])=><span key={String(label)} title={count+' '+label} aria-label={count+' '+label}><Icon name={String(icon)} size={15}/>{count}</span>)}
                  {!chapter.characters.length&&!chapter.videos.length&&!chapter.audio.length&&!(chapter.objects||[]).length&&<span className="chapter-empty">Ready to create</span>}
                </span>
              </span>
            </button>
            {active === chapter.id && (
              <div className="chapter-actions">
                <button
                  title="Move chapter up"
                  aria-label="Move chapter up"
                  disabled={!i}
                  onClick={() => store.reorderScenes(i, i - 1)}
                >
                  <Icon name="up" size={14} />
                </button>
                <button
                  title="Move chapter down"
                  aria-label="Move chapter down"
                  disabled={i === story.scenes.length - 1}
                  onClick={() => store.reorderScenes(i, i + 1)}
                >
                  <Icon name="down" size={14} />
                </button>
                <button
                  title="Remove chapter (Undo available)"
                  aria-label="Remove chapter"
                  disabled={story.scenes.length === 1}
                  onClick={() => store.removeScene(chapter.id)}
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      <button className="add-chapter" onClick={() => store.addScene()}>
        <Icon name="plus" size={16} />
        Add chapter
      </button>
      {scene && (
        <>
          <div className="section-heading">Chapter content</div>
          <details className="chapter-settings"><summary><Icon name="settings" size={18}/> Title & timing</summary>
          <label className="chapter-name-label">
            Chapter title
            <input
              className="form-input"
              aria-label="Chapter title"
              value={scene.title[language] || ''}
              onChange={(e) =>
                store.updateStory((d) => {
                  d.scenes.find((s) => s.id === scene.id)!.title[language] =
                    e.target.value
                }, 'Rename chapter')
              }
            />
          </label>
          <details className="chapter-timing"><summary>Chapter timing</summary>
          <label className="chapter-name-label">
            Chapter length (seconds)
            <input
              className="form-input"
              aria-label="Chapter length in seconds"
              type="number"
              min="0"
              step="1"
              value={scene.duration || 0}
              onChange={(e) =>
                store.updateStory((d) => {
                  d.scenes.find((s) => s.id === scene.id)!.duration = Math.max(
                    0,
                    Number(e.target.value)
                  )
                }, 'Set chapter duration')
              }
            />
            <small>0 uses the length of your media and captions.</small>
          </label>
          </details>
          </details>
          <div className="chapter-elements">
            {groups.map((group) => (
              <div className="element-group" key={group.type}>
                <button className="element-group-heading" aria-expanded={expandedGroup===group.type} onClick={()=>setExpandedGroup(expandedGroup===group.type?null:group.type)}>
                  <span className="element-type-icon"><Icon name={group.icon} size={22}/></span><span>{group.name}</span><small>{group.items.length}</small><Icon name={expandedGroup===group.type?'up':'down'} size={16}/>
                </button>
                {expandedGroup===group.type&&<div className="element-group-content">
                {group.items.map((item, i) => (
                  <button
                    className={
                      'element-item ' +
                      (selection.itemId === item.id ? 'selected' : '')
                    }
                    key={item.id}
                    onClick={() =>
                      inspect({
                        type: group.type,
                        sceneId: scene.id,
                        itemId: item.id
                      })
                    }
                  >
                    <span className="element-dot" />
                    {item.name || group.name + ' ' + (i + 1)}
                  </button>
                ))}
                <button className="element-add" onClick={()=>{group.add();onInspect?.()}}><Icon name="plus" size={17}/> Add {group.name.toLowerCase()}</button>
                </div>}
              </div>
            ))}
          </div>
        </>
      )}
      <div className="space-settings">
        <div className="section-heading">Across your story</div>
        <button onClick={() => inspect({ type: 'environment' })}>
          <Icon name="cube" />
          Space & atmosphere
          <Icon name="arrow" size={14} />
        </button>
        <button
          onClick={() => {
            inspect({ type: 'camera' })
            store.setShowCameraPiP(true)
          }}
        >
          <Icon name="camera" />
          Audience camera
          <Icon name="arrow" size={14} />
        </button>
        <button onClick={() => {store.addInteractiveObject();onInspect?.()}}>
          <Icon name="plus" />
          Add an interactive object
        </button>
        <details className="interactive-list"><summary><Icon name="cube" size={20}/> Interactive objects <span>{story.interactableObjects?.length||0}</span></summary>
        {story.interactableObjects?.map((o) => (
          <button
            key={o.id}
            onClick={() =>
              inspect({ type: 'interactiveObject', itemId: o.id })
            }
          >
            <Icon name="cube" />
            {o.name[language] || o.id}
          </button>
        ))}
        </details>
      </div>
      </div>
    </aside>
  )
}
