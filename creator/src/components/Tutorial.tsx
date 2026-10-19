import { useState, type ReactNode } from 'react'
import { tutorialTopics } from './tutorialTopics'
import { Icon } from './Icon'
import { LessonArt } from './LessonArt'
import { useStore } from '../state/store'

const lessons = [
  {title: 'Make it your story', kind: 'timeline', hint: 'Choose a chapter and give it a title.', topic: 'chapters'},
  {title: 'Guide the reader’s eye', kind: 'camera', hint: 'Frame a view on the canvas, then capture it as a camera stop.', topic: 'guided'},
  {title: 'Give the place a voice', kind: 'subtitles', hint: 'Write one caption. It will become part of this chapter.', topic: 'language'},
  {title: 'Step into the story', kind: 'preview', hint: 'Open the audience player. Try Guided and Explore in Web 3D.', topic: 'modes'},
  {title: 'Take your story with you', kind: 'save', hint: 'Package the space, chapters and media in one editable file.', topic: 'save'}
]
const icons: Record<string, string> = {assets:'folder', timeline:'chapters', camera:'camera', subtitles:'text', soundscape:'audio', lighting:'light', ending:'video', ui:'settings'}
export function Tutorial({onClose, onTab, onPanel, onPreview, onExport, previewCount, exportCount, busy, controls}: {
  controls?: ReactNode; onClose: () => void; onTab: (tab: string) => void; onPanel: (panel: string) => void;
  onPreview: () => void; onExport: () => Promise<boolean>; previewCount: number; exportCount: number; busy: boolean
}) {
  const story = useStore(s => s.story), sceneId = useStore(s => s.activeSceneId), language = useStore(s => s.language)
  const scene = story.scenes.find(s => s.id === sceneId)
  const [baseline] = useState(() => ({titles: JSON.stringify(story.scenes.map(s => s.title)), stops: Object.values(story.camera.guided || {}).flat().map(k => k.id), captions: story.scenes.flatMap(s => s.subtitles).map(s => s.id), preview: previewCount, exports: exportCount}))
  const [index, setIndex] = useState(0), [library, setLibrary] = useState(false), [topicId, setTopicId] = useState<string | null>(null), [query, setQuery] = useState(''), [caption, setCaption] = useState('')
  const lesson = lessons[index], topic = tutorialTopics.find(t => t.id === topicId)
  const complete = [JSON.stringify(story.scenes.map(s => s.title)) !== baseline.titles, Object.values(story.camera.guided || {}).flat().some(k => !baseline.stops.includes(k.id)), story.scenes.flatMap(s => s.subtitles).some(s => !baseline.captions.includes(s.id) && Object.values(s.text).some(t => t.trim())), previewCount > baseline.preview, exportCount > baseline.exports]
  const openTool = (tab: string) => {onTab(tab); onPanel('canvas')}
  const addCaption = () => {
    if (!scene || !caption.trim()) return
    const text = caption.trim()
    useStore.getState().updateStory(d => {
      const chapter = d.scenes.find(s => s.id === scene.id)!
      const start = Math.max(0, ...chapter.subtitles.map(s => s.end))
      chapter.subtitles.push({id: 'sub-' + crypto.randomUUID(), start, end: start + 5, text: {[language]: text}})
    }, 'Write tutorial caption')
    setCaption(''); onTab('subtitles')
  }
  return <aside className="learning-panel" aria-label="Learn by doing">
    <div className="learning-heading"><span><Icon name="light" size={17}/> Learn by doing</span>{controls}<button className="btn-icon" onClick={onClose} aria-label="Close tutorial"><Icon name="close" size={18}/></button></div>
    <div className="learning-switch"><button aria-pressed={!library} onClick={() => setLibrary(false)}>First story</button><button aria-pressed={library} onClick={() => {setLibrary(true); setTopicId(null)}}>Explore features</button></div>
    <div className="learning-content">
    {library ? topic ? <>
      <button className="text-link" onClick={() => setTopicId(null)}>← All features</button>
      <LessonArt kind={topic.id === 'save' ? 'save' : topic.tab} caption={topic.category}/><span className="eyebrow">{topic.category}</span><h2>{topic.title}</h2>
      <button className="btn btn-primary lesson-primary" onClick={() => openTool(topic.tab)}>Try in the workspace <Icon name="arrow" size={16}/></button>
      {topic.steps.map((text, i) => <details className="lesson-reference" key={text}><summary>{['Get started', 'Make it your own', 'Check the experience'][i]}</summary><p>{text}</p></details>)}
    </> : <>
      <h2>What would you like to make?</h2><input className="form-input" placeholder="Find camera, sound, AR…" aria-label="Search lessons" value={query} onChange={e => setQuery(e.target.value)}/>
      <div className="lesson-topic-grid">{tutorialTopics.filter(t => (t.title+' '+t.category+' '+t.steps.join(' ')).toLowerCase().includes(query.toLowerCase())).map(t => <button key={t.id} onClick={() => setTopicId(t.id)}><span className="topic-icon"><Icon name={icons[t.tab]}/></span><small>{t.category}</small><strong>{t.title}</strong><span className="topic-open">Explore <Icon name="arrow" size={13}/></span></button>)}</div>
      {!tutorialTopics.some(t => (t.title+' '+t.category+' '+t.steps.join(' ')).toLowerCase().includes(query.toLowerCase())) && <p>No lessons found. Try “camera” or “sound”.</p>}
    </> : <>
      <nav className="lesson-progress" aria-label="Learning steps">{lessons.map((l, i) => <button key={l.kind} aria-label={l.title + (complete[i] ? ', completed' : '')} aria-current={i === index ? 'step' : undefined} onClick={() => setIndex(i)} className={complete[i] ? 'complete' : ''}>{complete[i] ? <Icon name="check" size={15}/> : i+1}</button>)}</nav>
      <LessonArt kind={lesson.kind} caption={index === 2 ? caption : scene?.title[language] || 'Your story'}/>
      <span className="eyebrow">{index + 1} / {lessons.length} · IN YOUR CURRENT STORY</span><h2>{lesson.title}</h2><p className="lesson-hint">{lesson.hint}</p>
      {index === 0 && scene && <div className="lesson-form"><label>Chapter<select className="form-select" value={scene.id} onChange={e => useStore.getState().setActiveScene(e.target.value)}>{story.scenes.map((s, i) => <option key={s.id} value={s.id}>{i+1}. {s.title[language] || 'Untitled'}</option>)}</select></label><label>Chapter title<input className="form-input" value={scene.title[language] || ''} onChange={e => useStore.getState().updateStory(d => {d.scenes.find(s => s.id === scene.id)!.title[language] = e.target.value}, 'Rename chapter')}/></label><small>Edits are real. Undo is always available.</small></div>}
      {index === 1 && <><button className="btn btn-primary lesson-primary" onClick={() => openTool('camera')}><Icon name="camera" size={17}/> Open camera tool</button><div className="lesson-recipe"><span>1. Frame your view</span><Icon name="arrow" size={14}/><span>2. Capture current view</span></div></>}
      {index === 2 && <div className="lesson-form"><label>Your caption<textarea className="form-input" rows={3} placeholder="What should your reader notice here?" value={caption} onChange={e => setCaption(e.target.value)}/></label><button className="btn btn-primary" disabled={!scene || !caption.trim()} onClick={addCaption}><Icon name="plus" size={16}/> Add to chapter</button><small>Five seconds long, after the last caption. Adjust timing in Captions.</small></div>}
      {index === 3 && <button className="btn btn-primary lesson-primary" onClick={onPreview}><Icon name="play" size={17}/> Open audience preview</button>}
      {index === 4 && <><button className="btn btn-primary lesson-primary" disabled={busy} onClick={() => void onExport()}><Icon name="download" size={17}/>{busy ? 'Packing your story…' : 'Export portable JSON'}</button><small className="lesson-footnote">Download the file, then use Open to keep editing it on any device with the studio.</small></>}
      <div className={'lesson-status ' + (complete[index] ? 'is-complete' : '')} role="status"><Icon name={complete[index] ? 'check' : 'info'} size={15}/>{complete[index] ? ['Chapter title changed', 'New camera view captured', 'Caption added to your chapter', 'Audience preview opened', 'Portable JSON ready to download'][index] : 'Try it above, or move on at your own pace.'}</div>
      <div className="tour-actions"><button className="btn quiet" disabled={index===0} onClick={() => setIndex(index-1)}>Back</button><button className="btn" onClick={() => index < 4 ? setIndex(index+1) : setLibrary(true)}>{index===4 ? 'Explore more features' : complete[index] ? 'Continue' : 'Skip for now'}<Icon name="arrow" size={15}/></button></div>
      <button className="text-link lesson-more" onClick={() => {setTopicId(lesson.topic); setLibrary(true)}}>More about this step</button>
    </>}
    </div>
  </aside>
}
