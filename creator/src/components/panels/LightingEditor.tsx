/**
 * Lighting Editor - Configure scene-specific lighting modifiers, effects, particles
 */
import { useStore } from '../../state/store'

export function LightingEditor() {
  const story = useStore((s) => s.story)
  const activeSceneId = useStore((s) => s.activeSceneId)
  const updateStory = useStore((s) => s.updateStory)

  const activeScene = story.scenes.find((s) => s.id === activeSceneId)
  if (!activeScene) {
    return (
      <div style={{ padding: 12, color: 'var(--text-muted)' }}>
        Select a scene to edit lighting
      </div>
    )
  }

  const modifiers = activeScene.lighting.modifiers || {}

  const updateModifier = (key: string, value: number) => {
    updateStory((d) => {
      const scene = d.scenes.find((s) => s.id === activeSceneId)
      if (!scene) return
      if (!scene.lighting.modifiers) scene.lighting.modifiers = {}
      ;(scene.lighting.modifiers as any)[key] = value
    }, `Update ${key} modifier`)
  }

  return (
    <div style={{ padding: 12, overflow: 'auto', height: '100%' }}>
      <h4 style={{ color: 'var(--accent)', marginBottom: 12 }}>
        Lighting — {activeScene.title[useStore.getState().language] || activeScene.id}
      </h4>

      {/* Scene lighting modifiers */}
      <h5 style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>Intensity Modifiers</h5>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
        Multipliers applied to global lights when this scene is active.
      </p>

      <div className="form-group">
        <label className="form-label">
          Ambient: {(modifiers.ambient ?? 1).toFixed(2)}
        </label>
        <input
          type="range"
          className="form-range"
          min={0}
          max={3}
          step={0.05}
          value={modifiers.ambient ?? 1}
          onChange={(e) => updateModifier('ambient', parseFloat(e.target.value))}
        />
      </div>

      <div className="form-group">
        <label className="form-label">
          Directional: {(modifiers.directional ?? 1).toFixed(2)}
        </label>
        <input
          type="range"
          className="form-range"
          min={0}
          max={3}
          step={0.05}
          value={modifiers.directional ?? 1}
          onChange={(e) => updateModifier('directional', parseFloat(e.target.value))}
        />
      </div>

      <div className="form-group">
        <label className="form-label">
          Hemisphere: {(modifiers.hemisphere ?? 1).toFixed(2)}
        </label>
        <input
          type="range"
          className="form-range"
          min={0}
          max={3}
          step={0.05}
          value={modifiers.hemisphere ?? 1}
          onChange={(e) => updateModifier('hemisphere', parseFloat(e.target.value))}
        />
      </div>

      {/* Flicker Effect */}
      <hr style={{ borderColor: 'var(--border-color)', margin: '12px 0' }} />
      <h5 style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>Flicker Effect</h5>

      <div className="form-group">
        <label className="form-label">
          <input
            type="checkbox"
            className="form-checkbox"
            checked={!!activeScene.lighting.flicker}
            onChange={(e) => {
              updateStory((d) => {
                const scene = d.scenes.find((s) => s.id === activeSceneId)
                if (!scene) return
                if (e.target.checked) {
                  scene.lighting.flicker = {
                    triggerTime: 0,
                    duration: 10,
                    patterns: [
                      { intensity: 0.3, duration: 200 },
                      { intensity: 1, duration: 500 },
                      { intensity: 0.1, duration: 300 },
                      { intensity: 0.8, duration: 400 },
                    ],
                  }
                } else {
                  delete scene.lighting.flicker
                }
              }, 'Toggle flicker effect')
            }}
          />{' '}
          Enable Flicker
        </label>
      </div>

      {activeScene.lighting.flicker && (
        <>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Trigger Time (s)</label>
              <input
                className="form-input"
                type="number"
                step={1}
                value={activeScene.lighting.flicker.triggerTime}
                onChange={(e) =>
                  updateStory((d) => {
                    const scene = d.scenes.find((s) => s.id === activeSceneId)
                    if (!scene?.lighting.flicker) return
                    scene.lighting.flicker.triggerTime = parseFloat(e.target.value) || 0
                  })
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">Duration (s)</label>
              <input
                className="form-input"
                type="number"
                step={1}
                value={activeScene.lighting.flicker.duration}
                onChange={(e) =>
                  updateStory((d) => {
                    const scene = d.scenes.find((s) => s.id === activeSceneId)
                    if (!scene?.lighting.flicker) return
                    scene.lighting.flicker.duration = parseFloat(e.target.value) || 10
                  })
                }
              />
            </div>
          </div>
        </>
      )}

      {/* Particle Effects */}
      <hr style={{ borderColor: 'var(--border-color)', margin: '12px 0' }} />
      <h5 style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>Particle System</h5>

      <div className="form-group">
        <label className="form-label">
          <input
            type="checkbox"
            className="form-checkbox"
            checked={story.particles?.enabled || false}
            onChange={(e) =>
              updateStory((d) => {
                if (!d.particles) {
                  d.particles = {
                    enabled: true,
                    count: 2000,
                    color: '0xcccccc',
                    size: 0.005,
                    opacity: 0.3,
                    blending: 'AdditiveBlending',
                    area: { minX: -2, maxX: 2, minY: -1.5, maxY: 1.5, minZ: 0, maxZ: 4 },
                    animation: {
                      rotateY: 0.0001,
                      driftY: { speed: 0.0005, resetThreshold: 3, resetPosition: 1 },
                    },
                  }
                }
                d.particles!.enabled = e.target.checked
              }, 'Toggle particles')
            }
          />{' '}
          Enable Particles
        </label>
      </div>

      {story.particles?.enabled && (
        <>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Count</label>
              <input
                className="form-input"
                type="number"
                step={100}
                value={story.particles.count}
                onChange={(e) =>
                  updateStory((d) => {
                    if (d.particles) d.particles.count = parseInt(e.target.value) || 2000
                  })
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">Size</label>
              <input
                className="form-input"
                type="number"
                step={0.001}
                value={story.particles.size}
                onChange={(e) =>
                  updateStory((d) => {
                    if (d.particles) d.particles.size = parseFloat(e.target.value) || 0.005
                  })
                }
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">
              Opacity: {story.particles.opacity.toFixed(2)}
            </label>
            <input
              type="range"
              className="form-range"
              min={0}
              max={1}
              step={0.01}
              value={story.particles.opacity}
              onChange={(e) =>
                updateStory((d) => {
                  if (d.particles) d.particles.opacity = parseFloat(e.target.value)
                })
              }
            />
          </div>
        </>
      )}
    </div>
  )
}
