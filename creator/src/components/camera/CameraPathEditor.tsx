/**
 * Camera Path Editor - Edit guided camera keyframes for the active scene
 * Shown as a tab in the bottom panel alongside the timeline
 */
import { useStore } from '../../state/store'
import { Vec3Input } from '../panels/Vec3Input'
import type { CameraKeyframe } from '../../state/types'

export function CameraPathEditor() {
  const story = useStore((s) => s.story)
  const activeSceneId = useStore((s) => s.activeSceneId)
  const addCameraKeyframe = useStore((s) => s.addCameraKeyframe)
  const removeCameraKeyframe = useStore((s) => s.removeCameraKeyframe)
  const updateCameraKeyframe = useStore((s) => s.updateCameraKeyframe)
  const selection = useStore((s) => s.selection)
  const setSelection = useStore((s) => s.setSelection)

  if (!activeSceneId) {
    return <div style={{ padding: 12, color: 'var(--text-muted)' }}>Select a scene first</div>
  }

  const keyframes = story.camera.guided?.[activeSceneId] || []

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Keyframe list */}
      <div
        style={{
          width: 220,
          borderRight: '1px solid var(--border-color)',
          overflow: 'auto',
          padding: 8,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>
            KEYFRAMES ({keyframes.length})
          </span>
          <button className="btn btn-sm" onClick={() => addCameraKeyframe(activeSceneId)}>
            + Add
          </button>
        </div>

        {keyframes.map((kf, i) => (
          <div
            key={kf.id}
            className={`tree-item ${selection.type === 'cameraKeyframe' && selection.itemId === kf.id ? 'selected' : ''}`}
            onClick={() =>
              setSelection({ type: 'cameraKeyframe', sceneId: activeSceneId, itemId: kf.id })
            }
          >
            <span className="icon">📷</span>
            <span className="label">
              KF {i + 1} — t={kf.time}s
            </span>
            <button
              className="btn-icon btn-sm"
              onClick={(e) => {
                e.stopPropagation()
                removeCameraKeyframe(activeSceneId, kf.id)
              }}
            >
              ×
            </button>
          </div>
        ))}

        {keyframes.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: 11, textAlign: 'center', padding: 12 }}>
            No keyframes yet. Add one to define a guided camera path.
          </div>
        )}
      </div>

      {/* Selected keyframe editor */}
      <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
        {selection.type === 'cameraKeyframe' && selection.itemId ? (
          <KeyframeEditor sceneId={activeSceneId} kfId={selection.itemId} />
        ) : (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: 20 }}>
            Select a keyframe to edit
          </div>
        )}
      </div>
    </div>
  )
}

function KeyframeEditor({ sceneId, kfId }: { sceneId: string; kfId: string }) {
  const story = useStore((s) => s.story)
  const updateCameraKeyframe = useStore((s) => s.updateCameraKeyframe)

  const kf = story.camera.guided?.[sceneId]?.find((k) => k.id === kfId)
  if (!kf) return <div>Keyframe not found</div>

  const update = (updates: Partial<CameraKeyframe>) => updateCameraKeyframe(sceneId, kfId, updates)

  return (
    <>
      <h4 style={{ color: 'var(--accent)', marginBottom: 8 }}>Camera Keyframe</h4>

      <div className="form-group">
        <label className="form-label">Time (seconds)</label>
        <input
          className="form-input"
          type="number"
          step={0.5}
          value={kf.time}
          onChange={(e) => update({ time: parseFloat(e.target.value) || 0 })}
        />
      </div>

      <Vec3Input label="Position" value={kf.position} onChange={(v) => update({ position: v })} />
      <Vec3Input label="Rotation" value={kf.rotation} onChange={(v) => update({ rotation: v })} step={0.1} />

      <div className="form-row" style={{ marginTop: 8 }}>
        <div className="form-group">
          <label className="form-label">Transition Duration (ms)</label>
          <input
            className="form-input"
            type="number"
            step={100}
            value={kf.duration}
            onChange={(e) => update({ duration: parseInt(e.target.value) || 2000 })}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Easing</label>
          <select
            className="form-select"
            value={kf.easing}
            onChange={(e) => update({ easing: e.target.value as CameraKeyframe['easing'] })}
          >
            <option value="quadratic">Quadratic</option>
            <option value="cubic">Cubic</option>
            <option value="sine">Sine</option>
          </select>
        </div>
      </div>
    </>
  )
}
