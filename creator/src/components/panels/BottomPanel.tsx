import { useState, useEffect, useRef, type ReactNode } from 'react'
import { SoundscapeEditor } from './SoundscapeEditor'
import { Timeline } from '../timeline/Timeline'
import { SubtitleEditor } from './SubtitleEditor'
import { CameraPathEditor } from '../camera/CameraPathEditor'
import { AssetBrowser } from './AssetBrowser'
import { LightingEditor } from './LightingEditor'
import { EndingEditor } from './EndingEditor'
import { ScreenDesigner } from './ScreenDesigner'
import { Icon } from '../Icon'
import { ToolArt } from '../ToolArt'
const tools = [
  ['timeline', 'Timeline', 'chapters', 'Arrange when each moment happens.'],
  ['assets', 'Media', 'folder', 'Bring in spaces, recordings and films.'],
  ['subtitles', 'Captions', 'text', 'Write and translate your story.'],
  ['camera', 'Camera path', 'camera', 'Frame views for a smooth guided tour.'],
  ['soundscape', 'Soundscape', 'audio', 'Surround your audience with sound.'],
  ['lighting', 'Lighting', 'light', 'Set the mood and guide attention.'],
  ['ending', 'Ending', 'video', 'Leave readers with a final thought.'],
  ['ui', 'Screen designer', 'image', 'Design screens, buttons and their actions.']
]
export function BottomPanel({activeTab, onTab, controls, onReveal}: {onReveal?: () => void; controls?: ReactNode; activeTab: string; onTab: (tab: string) => void}) {
  const tabStrip=useRef<HTMLDivElement>(null)
  useEffect(()=>{tabStrip.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.scrollIntoView({block:'nearest',inline:'nearest'})},[activeTab])
  const [chooser, setChooser] = useState(false)
  const [query, setQuery] = useState('')
  const visible = tools.filter((t, i) => i < 4 || t[0] === activeTab)
  return <section className="panel-bottom" aria-label="Story tools">
    <div className="tool-navigation"><div className="tab-bar" aria-label="Editing tools" ref={tabStrip}>
      {visible.map(([id, label, icon]) => <button key={id} aria-pressed={!chooser && activeTab === id} className={'tab ' + (!chooser && activeTab === id ? 'active' : '')} onClick={() => {setChooser(false); onTab(id)}}><Icon name={icon} size={15}/>{label}</button>)}
    </div><button className={'all-tools-btn' + (chooser ? ' active' : '')} aria-expanded={chooser} aria-controls="story-tool-content" onClick={() => {onReveal?.();setChooser(!chooser)}}><Icon name={chooser ? 'close' : 'grid'} size={16}/>{chooser ? 'Close tools' : 'All tools'}</button>{controls}</div>
    <div className="tab-content" id="story-tool-content">
      {chooser ? <div className="tool-picker"><div className="tool-picker-intro"><span className="eyebrow">YOUR CREATIVE TOOLKIT</span><h3>Story tools</h3></div><input className="form-input" aria-label="Find a tool" placeholder="Find a tool" value={query} onChange={e => setQuery(e.target.value)}/><div className="tool-card-grid">{tools.filter(t => t.join(' ').toLowerCase().includes(query.toLowerCase())).map(([id, label, , description]) => <button title={description} key={id} onClick={() => { onTab(id); setChooser(false) }}><ToolArt kind={id}/><span><strong>{label}</strong></span><Icon name="arrow" size={18}/></button>)}</div>{!tools.some(t => t.join(' ').toLowerCase().includes(query.toLowerCase())) && <p>No tool matches. Try “sound”, “camera” or “AR”.</p>}</div> : <>
        {activeTab === 'timeline' && <Timeline />}{activeTab === 'assets' && <AssetBrowser />}{activeTab === 'subtitles' && <SubtitleEditor />}{activeTab === 'camera' && <CameraPathEditor />}{activeTab === 'soundscape' && <SoundscapeEditor />}{activeTab === 'lighting' && <LightingEditor />}{activeTab === 'ending' && <EndingEditor />}{activeTab === 'ui' && <ScreenDesigner />}
      </>}
    </div>
  </section>
}
