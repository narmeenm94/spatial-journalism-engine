import { ToolTemplates } from '../ToolTemplates'
import { useEffect, useState } from 'react'
import { useStore } from '../../state/store'
import { chapterDuration } from '../../utils/playback'
import { Vec3Input } from '../panels/Vec3Input'
import type { CameraKeyframe } from '../../state/types'

export function CameraPathEditor() {
  const story = useStore((s) => s.story),
    sceneId = useStore((s) => s.activeSceneId),
    selection = useStore((s) => s.selection)
  const time = useStore((s) => s.timelinePosition)
  const playing = useStore(s => s.isPlaying), setPlaying = useStore(s => s.setIsPlaying)
  const durations = useStore(s => s.mediaDurations)
  const [captureTime, setCaptureTime] = useState(0)
  const stops = [...(story.camera.guided?.[sceneId || ''] || [])].sort(
    (a, b) => a.time - b.time
  )
  const selected = stops.find(
    (k) => selection.type === 'cameraKeyframe' && k.id === selection.itemId
  )
  const end = chapterDuration(story.scenes.find(s => s.id === sceneId), stops, durations)
  useEffect(() => {
    useStore.setState({
      showCameraPiP: true,
      showCameraPath: true,
      previewCameraPath: true
    })
    return () => {
      useStore.setState({ previewCameraPath: false })
    }
  }, [])
  useEffect(() => {
    const existing =
      useStore.getState().story.camera.guided?.[sceneId || ''] || []
    setCaptureTime(
      existing.length ? Math.max(...existing.map((k) => k.time)) + 10 : 0
    )
  }, [sceneId])
  if (!sceneId) return <p>Select a chapter to build its camera tour.</p>
  const capture = (replace = false) => {
    setPlaying(false)
    const at = replace && selected ? selected.time : captureTime
    window.dispatchEvent(
      new CustomEvent('sj-capture-camera', {
        detail: { sceneId, time: at, kfId: replace ? selected?.id : undefined }
      })
    )
    if (!replace) setCaptureTime(at + 10)
  }
  const choose = (kf: CameraKeyframe) => {
    setPlaying(false)
    useStore
      .getState()
      .setSelection({ type: 'cameraKeyframe', sceneId, itemId: kf.id })
    useStore
      .getState()
      .setTimelinePosition(kf.time + (kf.duration ?? 2000) / 1000)
  }
  const duplicate = stops.some((k) => k.time === captureTime)
  return (
    <div className="camera-path-editor">
      <ToolTemplates tool="camera"/>
      <div className="camera-path-intro">
        <div>
          <strong>Build a guided camera tour</strong>
          <p>
            Frame a view → capture it → play your tour.
          </p>
        </div>
      </div>
      <details className="camera-options-disclosure"><summary>Reader navigation & phone tracking</summary>
        <label>
          Reader starts in
          <select
            className="form-select"
            aria-label="Default camera mode"
            value={story.camera.defaultMode || 'guided'}
            onChange={(e) =>
              useStore.getState().updateStory((d) => {
                d.camera.defaultMode = e.target.value as 'guided' | 'explore'
              }, 'Change camera mode')
            }
          >
            <option value="guided">Guided tour</option>
            <option value="explore">Free exploration</option>
          </select>
        </label>
      <div className="camera-path-actions">
        <label>Experience layout<select className="form-select" aria-label="Experience layout" value={story.camera.navigation || 'standard'} onChange={e => useStore.getState().updateStory(d => { d.camera.navigation = e.target.value as 'standard' | 'immersive'; if (e.target.value === 'immersive') { d.camera.chooseMode = true; d.project.ar = {...d.project.ar, tracking:'world', backend:'8thwall'} } }, 'Change experience layout')}>
          <option value="standard">Place a model in the world</option><option value="immersive">Move inside a full-size space</option>
        </select></label>
        <label><input type="checkbox" checked={story.camera.chooseMode || story.camera.navigation === 'immersive'} disabled={story.camera.navigation === 'immersive'} onChange={e => useStore.getState().updateStory(d => { d.camera.chooseMode = e.target.checked }, 'Reader mode choice')} /> Let readers choose Guided or Explore</label>
        {story.camera.navigation === 'immersive' && <label>Guided phone tracking<select className="form-select" aria-label="Guided phone tracking" value={story.camera.guidedTracking || 'orientation'} onChange={e => useStore.getState().updateStory(d => { d.camera.guidedTracking = e.target.value as 'orientation' | 'world' }, 'Change guided tracking')}>
          <option value="orientation">Look around + touch movement</option><option value="world">Physical movement + touch (SLAM)</option>
        </select></label>}
        {story.camera.navigation === 'immersive' && <details>
          <summary>Phone eye height</summary>
          <p>Keep the space upright. Adjust the height above your scene's floor. Explore adds the phone's tracked height.</p>
          {([['android', 'Android Explore', 1.25], ['ios', 'iPhone / iPad Explore', 0.5], ['fallback', 'Other phones', 0.5], ['guided', 'Guided eye height', 1.5]] as const).map(([key, label, fallback]) => <label key={key}>{label} (m)
            <input className="form-input" type="number" step="0.05" aria-label={label + ' height'} value={story.camera.trackedHeight?.[key] ?? fallback} onChange={e => { const value = e.currentTarget.valueAsNumber; if (Number.isFinite(value)) useStore.getState().updateStory(d => { d.camera.trackedHeight = {...d.camera.trackedHeight, [key]: value} }, 'Change phone eye height') }} />
          </label>)}
        </details>}
      </div>
      </details>
      <div className="camera-path-actions">
        <label>
          Start at (seconds)
          <input
            aria-label="New camera stop time"
            className="form-input"
            type="number"
            min="0"
            step="0.5"
            value={captureTime}
            onChange={(e) =>
              setCaptureTime(Math.max(0, Number(e.target.value)))
            }
          />
        </label>
        <button
          className="btn btn-primary"
          disabled={duplicate}
          onClick={() => capture()}
        >
          Capture current view
        </button>
        <button
          className="btn"
          disabled={!stops.length}
          onClick={() => {
            if (time >= end) useStore.getState().setTimelinePosition(0)
            setPlaying(!playing)
          }}
        >
          {playing ? 'Pause timeline' : 'Play camera path'}
        </button>
        <button
          className="btn"
          onClick={() => {
            setPlaying(false)
            useStore.getState().setTimelinePosition(0)
          }}
        >
          Rewind
        </button>
        <label className="camera-path-scrub">
          Preview · {time.toFixed(1)}s
          <input
            aria-label="Camera preview time"
            type="range"
            min="0"
            max={end}
            step="0.1"
            value={Math.min(time, end)}
            onChange={(e) => {
              setPlaying(false)
              useStore.getState().setTimelinePosition(Number(e.target.value))
            }}
          />
        </label>
      </div>
      {duplicate && (
        <p role="status">
          A stop already starts here. Choose another time, or select it and
          replace its view.
        </p>
      )}
      <div className="camera-path-body">
        <div className="camera-stop-list">
          <strong>{stops.length} camera stops</strong>
          {stops.map((kf, i) => (
            <div
              key={kf.id}
              className={
                'camera-stop ' + (selected?.id === kf.id ? 'selected' : '')
              }
            >
              <button onClick={() => choose(kf)}>
                {i + 1}. View at {kf.time}s
              </button>
              <button
                aria-label={'Remove camera stop ' + (i + 1)}
                onClick={() =>
                  useStore.getState().removeCameraKeyframe(sceneId, kf.id)
                }
              >
                ×
              </button>
            </div>
          ))}
          {!stops.length && (
            <p>
              Capture your first view at 0 seconds. Move around the canvas and
              capture a second view at a later time.
            </p>
          )}
        </div>
        <div className="camera-stop-details">
          {selected ? (
            <>
              <div className="camera-path-actions">
                <button
                  className="btn"
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent('sj-view-camera', { detail: selected })
                    )
                  }
                >
                  Edit from this view
                </button>
                <button className="btn" onClick={() => capture(true)}>
                  Replace with current view
                </button>
              </div>
              <KeyframeEditor sceneId={sceneId} kf={selected} />
            </>
          ) : (
            <p>
              Select a stop to adjust its timing and view. Play runs the camera, sound and video together in the canvas.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
function KeyframeEditor({
  sceneId,
  kf
}: {
  sceneId: string
  kf: CameraKeyframe
}) {
  const update = (updates: Partial<CameraKeyframe>) =>
    useStore.getState().updateCameraKeyframe(sceneId, kf.id, updates)
  return (
    <>
      <div className="camera-path-actions">
        <label>
          Start at (seconds)
          <input
            aria-label="Camera stop start time"
            className="form-input"
            type="number"
            min="0"
            step="0.5"
            value={kf.time}
            onChange={(e) =>
              update({ time: Math.max(0, Number(e.target.value)) })
            }
          />
        </label>
        <label>
          Move duration (seconds)
          <input
            aria-label="Camera move duration"
            className="form-input"
            type="number"
            min="0"
            step="0.1"
            value={(kf.duration ?? 2000) / 1000}
            onChange={(e) =>
              update({ duration: Math.max(0, Number(e.target.value)) * 1000 })
            }
          />
        </label>
        <label>
          Movement
          <select
            aria-label="Camera easing"
            className="form-select"
            value={kf.easing || 'quadratic'}
            onChange={(e) =>
              update({ easing: e.target.value as CameraKeyframe['easing'] })
            }
          >
            <option value="quadratic">Smooth</option>
            <option value="cubic">Gentle start and finish</option>
            <option value="sine">Soft glide</option>
          </select>
        </label>
      </div>
      <details className="lesson-reference"><summary>How guided movement works</summary><p>
        At each cue, the reader moves smoothly from their current view toward this destination, then is free to explore. Phone AR uses the same upright rig for guidance and recentering; the current guided move completes before touch movement takes over. Web 3D allows a drag to interrupt the move. Use 0 duration for a cut.
      </p></details>
      <details>
        <summary>Precise position & rotation</summary>
        <Vec3Input
          label="Position"
          value={kf.position}
          onChange={(position) => update({ position })}
        />
        <Vec3Input
          label="Rotation (radians)"
          value={kf.rotation}
          step={0.1}
          onChange={(rotation) => update({ rotation })}
        />
      </details>
      <details><summary>Phone AR destination</summary>
        <label><input type="checkbox" checked={!!kf.arPosition} onChange={e => update(e.target.checked ? {arPosition: [...kf.position], arRotation: [...kf.rotation]} : {arPosition: undefined, arRotation: undefined})} /> Use a separate phone destination</label>
        {kf.arPosition && <><Vec3Input label="Phone position" value={kf.arPosition} onChange={arPosition => update({arPosition})} /><Vec3Input label="Phone rotation (radians)" value={kf.arRotation || kf.rotation} step={0.1} onChange={arRotation => update({arRotation})} /></>}
      </details>
    </>
  )
}
