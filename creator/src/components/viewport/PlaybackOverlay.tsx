import { useStore } from '../../state/store'
import { chapterDuration } from '../../utils/playback'

export function PlaybackOverlay() {
  const preview = useStore(s => s.playbackPreview)
  const playing = useStore(s => s.isPlaying)
  const time = useStore(s => s.timelinePosition)
  const story = useStore(s => s.story), sceneId = useStore(s => s.activeSceneId)
  const issues = useStore(s => s.playbackIssues)
  const loading = useStore(s => s.playbackLoading)
  const durations = useStore(s => s.mediaDurations)
  const scene = story.scenes.find(s => s.id === sceneId)
  if (!preview || !scene) return null
  const end = chapterDuration(scene, story.camera.guided?.[scene.id], durations)
  const format = (t: number) => Math.floor(t / 60) + ':' + Math.floor(t % 60).toString().padStart(2, '0')
  return <>
    <div className="editor-playback-bar" aria-label="Scene playback">
      <button className="btn btn-sm" aria-label={playing ? 'Pause scene' : 'Play scene'} onClick={() => {
        if (!playing && time >= end) useStore.getState().setTimelinePosition(0)
        useStore.getState().setIsPlaying(!playing)
      }}>{playing ? 'Ⅱ Pause' : '▷ Play'}</button>
      {!!Object.keys(loading).length && <span role="status">Loading media…</span>}
      <span className="editor-playback-time">{format(time)} / {format(end)}</span>
      <input aria-label="Scene playhead" type="range" min="0" max={end} step="0.1" value={Math.min(time, end)} onChange={e => { useStore.getState().setIsPlaying(false); useStore.getState().setTimelinePosition(Number(e.target.value)) }}/>
      <button className="btn btn-sm" onClick={() => useStore.getState().stopPlayback()}>Stop</button>
    </div>
    {!!Object.keys(issues).length && <details className="editor-playback-issues"><summary>{Object.keys(issues).length} media {Object.keys(issues).length === 1 ? 'issue' : 'issues'}</summary>{Object.entries(issues).map(([id, message]) => <p key={id}>{message}</p>)}</details>}
  </>
}
