/**
 * Bottom Panel — Tabbed view for Timeline, Subtitles, Camera, Assets, Lighting, Ending, UI/Branding, Preview
 */
import { useState } from 'react'
import { Timeline } from '../timeline/Timeline'
import { SubtitleEditor } from './SubtitleEditor'
import { CameraPathEditor } from '../camera/CameraPathEditor'
import { AssetBrowser } from './AssetBrowser'
import { LightingEditor } from './LightingEditor'
import { EndingEditor } from './EndingEditor'
import { UIBrandingEditor } from './UIBrandingEditor'
import { ARPreview } from '../ar/ARPreview'

const TABS = [
  { id: 'timeline', label: '⏱ Timeline' },
  { id: 'subtitles', label: '💬 Subtitles' },
  { id: 'camera', label: '📷 Camera' },
  { id: 'lighting', label: '💡 Lighting' },
  { id: 'ending', label: '🎬 Ending' },
  { id: 'ui', label: '🎨 UI & Branding' },
  { id: 'assets', label: '📁 Assets' },
  { id: 'preview', label: '▶ Preview' },
]

export function BottomPanel() {
  const [activeTab, setActiveTab] = useState('timeline')

  return (
    <div className="panel-bottom">
      {/* Tab bar */}
      <div className="tab-bar">
        {TABS.map((tab) => (
          <div
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </div>
        ))}
      </div>

      {/* Tab content — fills remaining space */}
      <div className="tab-content">
        {activeTab === 'timeline' && <Timeline />}
        {activeTab === 'subtitles' && <SubtitleEditor />}
        {activeTab === 'camera' && <CameraPathEditor />}
        {activeTab === 'assets' && <AssetBrowser />}
        {activeTab === 'lighting' && <LightingEditor />}
        {activeTab === 'ending' && <EndingEditor />}
        {activeTab === 'ui' && <UIBrandingEditor />}
        {activeTab === 'preview' && <ARPreview />}
      </div>
    </div>
  )
}
