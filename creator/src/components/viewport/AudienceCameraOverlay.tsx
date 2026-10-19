import { type CSSProperties, useLayoutEffect, useRef, useState } from 'react'
import { captionStyles } from '../../../../engine/src/ui/captionStyle.js'
import { useStore } from '../../state/store'
import { Icon } from '../Icon'

/** Audience UI shares the camera's bounds, never the editing scene's bounds. */
export function AudienceCameraOverlay({ fullView }: { fullView: boolean }) {
  const surface = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 640, height: 400 })
  const preview = useStore(s => s.playbackPreview)
  const time = useStore(s => s.timelinePosition)
  const story = useStore(s => s.story)
  const sceneId = useStore(s => s.activeSceneId)
  const language = useStore(s => s.language)
  const setFullView = useStore(s => s.setAudienceFullView)
  const setShowCameraPiP = useStore(s => s.setShowCameraPiP)

  useLayoutEffect(() => {
    const element = surface.current
    if (!element) return
    const update = () => {
      const { width, height } = element.getBoundingClientRect()
      setSize({ width, height })
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [fullView])

  // Miniaturize the whole caption layout, including its offsets and padding.
  // Full view uses the actual canvas size and the story's unmodified styling.
  const scale = fullView ? 1 : Math.min(1, Math.max(1, size.width) / 640)
  const css = captionStyles(story.ui.captions, story.ui.branding.font, fullView && size.width <= 600)
  const scene = story.scenes.find(s => s.id === sceneId)
  const captions = preview ? scene?.subtitles.filter(s => s.start <= time && time < s.end)
    .map(s => s.text[language] || s.text.en).filter(Boolean) ?? [] : []
  const guidance = preview && time >= 1 && time < 8 ? scene?.lighting.walkingTour?.guidanceText?.[language] : ''

  return <section className={'audience-camera-overlay' + (fullView ? ' is-expanded' : '')} aria-label="Audience camera">
    <div className="audience-camera-surface" ref={surface}>
      <div className="audience-camera-content" style={{ width: size.width / scale, height: size.height / scale, transform: `scale(${scale})` }}>
        {!!captions.length && <div className="editor-playback-captions" aria-label="Current captions" style={css.container as CSSProperties}>
          <div style={css.text as CSSProperties}>{captions.join('\n')}</div>
        </div>}
        {guidance && <div className="editor-playback-guidance">{guidance}</div>}
      </div>
    </div>
    <div className="audience-camera-header">
      <span>Audience camera</span>
      <button type="button" aria-label={fullView ? 'Restore scene view' : 'Expand audience camera'} title={fullView ? 'Restore scene view (Esc)' : 'Expand audience camera'} onClick={() => setFullView(!fullView)}>
        <Icon name={fullView ? 'restore' : 'expand'} size={16}/>
      </button>
      {!fullView && <button type="button" aria-label="Hide audience camera" title="Hide audience camera" onClick={() => setShowCameraPiP(false)}><Icon name="close" size={16}/></button>}
    </div>
  </section>
}
