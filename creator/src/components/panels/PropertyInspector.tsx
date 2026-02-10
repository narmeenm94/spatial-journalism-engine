/**
 * Property Inspector - Context-sensitive panel showing properties of the selected item
 * When nothing is selected, shows a project overview dashboard
 */
import { useRef } from 'react'
import { useStore } from '../../state/store'
import { Vec3Input } from './Vec3Input'
import type {
  AudioConfig,
  CharacterConfig,
  VideoConfig,
  SpotlightConfig,
  CameraKeyframe,
  InteractiveObjectConfig,
} from '../../state/types'

export function PropertyInspector() {
  const selection = useStore((s) => s.selection)

  return (
    <div className="panel panel-right">
      <div className="panel-header">Properties</div>
      <div className="panel-content">
        {selection.type === 'none' && <ProjectOverview />}
        {selection.type === 'camera' && <CameraProps />}
        {selection.type === 'environment' && <EnvironmentProps />}
        {selection.type === 'character' && <CharacterProps />}
        {selection.type === 'video' && <VideoProps />}
        {selection.type === 'audio' && <AudioProps />}
        {selection.type === 'spotlight' && <SpotlightProps />}
        {selection.type === 'cameraKeyframe' && <CameraKeyframeProps />}
        {selection.type === 'interactiveObject' && <InteractiveObjectProps />}
      </div>
    </div>
  )
}

// ── Project Overview (no selection) ──
function ProjectOverview() {
  const story = useStore((s) => s.story)
  const language = useStore((s) => s.language)

  const totalChars = story.scenes.reduce((a, s) => a + s.characters.length, 0)
  const totalVideos = story.scenes.reduce((a, s) => a + s.videos.length, 0)
  const totalSubs = story.scenes.reduce((a, s) => a + s.subtitles.length, 0)
  const totalObjects = story.interactableObjects?.length || 0

  return (
    <>
      <h4 style={{ marginBottom: 12, color: 'var(--accent)' }}>
        {story.project.title}
      </h4>

      <div className="stat-grid">
        <StatCard label="Scenes" value={story.scenes.length} icon="🎬" />
        <StatCard label="Characters" value={totalChars} icon="🧑" />
        <StatCard label="Videos" value={totalVideos} icon="📹" />
        <StatCard label="Subtitles" value={totalSubs} icon="💬" />
        <StatCard label="Objects" value={totalObjects} icon="🔲" />
        <StatCard label="Languages" value={story.project.languages.length} icon="🌐" />
      </div>

      <hr style={{ borderColor: 'var(--border-color)', margin: '12px 0' }} />

      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
        <p style={{ marginBottom: 6 }}>
          <strong>Version:</strong> {story.project.version}
        </p>
        <p style={{ marginBottom: 6 }}>
          <strong>Modes:</strong> {story.project.modes.join(', ')}
        </p>
        <p style={{ marginBottom: 6 }}>
          <strong>Languages:</strong> {story.project.languages.join(', ')}
        </p>
        <p style={{ marginBottom: 6 }}>
          <strong>Environment:</strong> {story.project.assets.environment || '(none)'}
        </p>
        <p style={{ marginBottom: 6 }}>
          <strong>Preloaded assets:</strong> {story.project.assets.preload.length}
        </p>
      </div>

      <hr style={{ borderColor: 'var(--border-color)', margin: '12px 0' }} />

      <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
        Click an object in the 3D viewport or scene hierarchy to edit its properties.
        <br /><br />
        <strong>Shortcuts:</strong><br />
        W — Move &nbsp;|&nbsp; E — Rotate &nbsp;|&nbsp; R — Scale<br />
        Ctrl+Z — Undo &nbsp;|&nbsp; Ctrl+Y — Redo<br />
        Delete — Remove selected &nbsp;|&nbsp; Esc — Deselect<br />
        Space — Play/Pause timeline
      </p>
    </>
  )
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="stat-card">
      <span className="stat-icon">{icon}</span>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}

// ── Camera Properties ──
function CameraProps() {
  const story = useStore((s) => s.story)
  const updateStory = useStore((s) => s.updateStory)

  return (
    <>
      <h4 style={{ marginBottom: 8, color: 'var(--accent)' }}>📷 Camera</h4>
      <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 12 }}>
        Select the camera in the viewport to see a live PiP preview of what it sees.
      </p>

      <Vec3Input
        label="Initial Position"
        value={story.camera.initialPosition}
        onChange={(v) => updateStory((d) => { d.camera.initialPosition = v })}
      />
      <Vec3Input
        label="Initial Rotation"
        value={story.camera.initialRotation}
        onChange={(v) => updateStory((d) => { d.camera.initialRotation = v })}
        step={0.1}
      />

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Move Speed</label>
          <input
            className="form-input"
            type="number"
            step={0.001}
            value={story.camera.moveSpeed}
            onChange={(e) =>
              updateStory((d) => { d.camera.moveSpeed = parseFloat(e.target.value) || 0.005 })
            }
          />
        </div>
        <div className="form-group">
          <label className="form-label">Rotate Speed</label>
          <input
            className="form-input"
            type="number"
            step={0.001}
            value={story.camera.rotateSpeed}
            onChange={(e) =>
              updateStory((d) => { d.camera.rotateSpeed = parseFloat(e.target.value) || 0.003 })
            }
          />
        </div>
      </div>

      <hr style={{ borderColor: 'var(--border-color)', margin: '12px 0' }} />
      <h4 style={{ marginBottom: 8, color: 'var(--accent)' }}>Camera Bounds</h4>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Min X</label>
          <input className="form-input" type="number" step={0.5} value={story.camera.bounds.minX}
            onChange={(e) => updateStory((d) => { d.camera.bounds.minX = parseFloat(e.target.value) || 0 })} />
        </div>
        <div className="form-group">
          <label className="form-label">Max X</label>
          <input className="form-input" type="number" step={0.5} value={story.camera.bounds.maxX}
            onChange={(e) => updateStory((d) => { d.camera.bounds.maxX = parseFloat(e.target.value) || 0 })} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Min Y</label>
          <input className="form-input" type="number" step={0.5} value={story.camera.bounds.minY}
            onChange={(e) => updateStory((d) => { d.camera.bounds.minY = parseFloat(e.target.value) || 0 })} />
        </div>
        <div className="form-group">
          <label className="form-label">Max Y</label>
          <input className="form-input" type="number" step={0.5} value={story.camera.bounds.maxY}
            onChange={(e) => updateStory((d) => { d.camera.bounds.maxY = parseFloat(e.target.value) || 0 })} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Min Z</label>
          <input className="form-input" type="number" step={0.5} value={story.camera.bounds.minZ}
            onChange={(e) => updateStory((d) => { d.camera.bounds.minZ = parseFloat(e.target.value) || 0 })} />
        </div>
        <div className="form-group">
          <label className="form-label">Max Z</label>
          <input className="form-input" type="number" step={0.5} value={story.camera.bounds.maxZ}
            onChange={(e) => updateStory((d) => { d.camera.bounds.maxZ = parseFloat(e.target.value) || 0 })} />
        </div>
      </div>
    </>
  )
}

// ── Environment Properties ──
function EnvironmentProps() {
  const story = useStore((s) => s.story)
  const updateStory = useStore((s) => s.updateStory)

  return (
    <>
      <h4 style={{ marginBottom: 8, color: 'var(--accent)' }}>Environment</h4>

      <div className="form-group">
        <label className="form-label">Model Path</label>
        <input
          className="form-input"
          value={story.project.assets.environment}
          onChange={(e) =>
            updateStory((d) => {
              d.project.assets.environment = e.target.value
            })
          }
        />
      </div>

      <div className="form-group">
        <label className="form-label">Scale</label>
        <input
          className="form-input"
          type="number"
          step={0.001}
          value={story.environment.scale}
          onChange={(e) =>
            updateStory((d) => {
              d.environment.scale = parseFloat(e.target.value) || 1
            })
          }
        />
      </div>

      <Vec3Input
        label="Position"
        value={story.environment.position}
        onChange={(v) => updateStory((d) => { d.environment.position = v })}
      />

      <hr style={{ borderColor: 'var(--border-color)', margin: '12px 0' }} />
      <h4 style={{ marginBottom: 8, color: 'var(--accent)' }}>Global Lighting</h4>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Ambient Intensity</label>
          <input
            className="form-input"
            type="number"
            step={0.1}
            value={story.lighting.ambient.intensity}
            onChange={(e) =>
              updateStory((d) => { d.lighting.ambient.intensity = parseFloat(e.target.value) || 0 })
            }
          />
        </div>
        <div className="form-group">
          <label className="form-label">Directional Intensity</label>
          <input
            className="form-input"
            type="number"
            step={0.1}
            value={story.lighting.directional.intensity}
            onChange={(e) =>
              updateStory((d) => { d.lighting.directional.intensity = parseFloat(e.target.value) || 0 })
            }
          />
        </div>
      </div>

      <Vec3Input
        label="Directional Light Position"
        value={story.lighting.directional.position}
        onChange={(v) => updateStory((d) => { d.lighting.directional.position = v })}
      />

      <hr style={{ borderColor: 'var(--border-color)', margin: '12px 0' }} />
      <h4 style={{ marginBottom: 8, color: 'var(--accent)' }}>Rendering</h4>

      <div className="form-group">
        <label className="form-label">Tone Mapping</label>
        <select
          className="form-select"
          value={story.rendering?.toneMapping || 'ACESFilmic'}
          onChange={(e) =>
            updateStory((d) => {
              if (!d.rendering) d.rendering = { toneMapping: 'ACESFilmic', toneMappingExposure: 1.4 }
              d.rendering.toneMapping = e.target.value
            })
          }
        >
          <option value="NoToneMapping">None</option>
          <option value="LinearToneMapping">Linear</option>
          <option value="ReinhardToneMapping">Reinhard</option>
          <option value="ACESFilmic">ACES Filmic</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Exposure</label>
        <input
          className="form-input"
          type="number"
          step={0.1}
          value={story.rendering?.toneMappingExposure ?? 1.4}
          onChange={(e) =>
            updateStory((d) => {
              if (!d.rendering) d.rendering = { toneMapping: 'ACESFilmic', toneMappingExposure: 1.4 }
              d.rendering.toneMappingExposure = parseFloat(e.target.value) || 1
            })
          }
        />
      </div>
    </>
  )
}

// ── Character Properties ──
function CharacterProps() {
  const selection = useStore((s) => s.selection)
  const story = useStore((s) => s.story)
  const updateCharacter = useStore((s) => s.updateCharacter)
  const addAssetFile = useStore((s) => s.addAssetFile)
  const modelInputRef = useRef<HTMLInputElement>(null)

  const scene = story.scenes.find((s) => s.id === selection.sceneId)
  const char = scene?.characters.find((c) => c.id === selection.itemId)
  if (!scene || !char) return <div style={{ color: 'var(--text-muted)', padding: 20 }}>Character not found</div>

  const update = (updates: Partial<CharacterConfig>) =>
    updateCharacter(scene.id, char.id, updates)

  const handleModelFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const configPath = `models/${file.name}`
    addAssetFile(configPath, file)
    update({ model: configPath })
    e.target.value = ''
  }

  return (
    <>
      <h4 style={{ marginBottom: 8, color: 'var(--accent)' }}>🧑 Character: {char.id}</h4>

      <div className="form-group">
        <label className="form-label">Model Path</label>
        <div style={{ display: 'flex', gap: 4 }}>
          <input className="form-input" style={{ flex: 1 }} value={char.model} onChange={(e) => update({ model: e.target.value })} />
          <button className="btn btn-sm" onClick={() => modelInputRef.current?.click()} title="Browse for model file">📁</button>
        </div>
        <input ref={modelInputRef} type="file" accept=".glb,.gltf" style={{ display: 'none' }} onChange={handleModelFileSelect} />
      </div>

      <Vec3Input label="Position" value={char.position} onChange={(v) => update({ position: v })} />
      <Vec3Input label="Rotation" value={char.rotation} onChange={(v) => update({ rotation: v })} step={0.1} />
      <Vec3Input label="Scale" value={char.scale} onChange={(v) => update({ scale: v })} step={0.1} />

      <div className="form-group">
        <label className="form-label">Animation</label>
        <input
          className="form-input"
          value={char.animation || ''}
          onChange={(e) => update({ animation: e.target.value || null })}
          placeholder="Animation clip name (empty = first clip)"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Opacity</label>
          <input
            className="form-input"
            type="number"
            step={0.1}
            min={0}
            max={1}
            value={char.opacity}
            onChange={(e) => update({ opacity: parseFloat(e.target.value) || 0.7 })}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Delay (ms)</label>
          <input
            className="form-input"
            type="number"
            step={100}
            value={char.delay}
            onChange={(e) => update({ delay: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Duration (ms) — 0 = until scene ends</label>
        <input
          className="form-input"
          type="number"
          step={1000}
          value={char.duration}
          onChange={(e) => update({ duration: parseInt(e.target.value) || 0 })}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Fade In (ms)</label>
          <input
            className="form-input"
            type="number"
            step={100}
            value={char.fadeIn}
            onChange={(e) => update({ fadeIn: parseInt(e.target.value) || 3000 })}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Fade Out (ms)</label>
          <input
            className="form-input"
            type="number"
            step={100}
            value={char.fadeOut}
            onChange={(e) => update({ fadeOut: parseInt(e.target.value) || 1000 })}
          />
        </div>
      </div>
    </>
  )
}

// ── Video Properties ──
function VideoProps() {
  const selection = useStore((s) => s.selection)
  const story = useStore((s) => s.story)
  const updateVideo = useStore((s) => s.updateVideo)
  const addAssetFile = useStore((s) => s.addAssetFile)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const scene = story.scenes.find((s) => s.id === selection.sceneId)
  const vid = scene?.videos.find((v) => v.id === selection.itemId)
  if (!scene || !vid) return <div style={{ color: 'var(--text-muted)', padding: 20 }}>Video not found</div>

  const update = (updates: Partial<VideoConfig>) => updateVideo(scene.id, vid.id, updates)

  const handleVideoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const configPath = `video/${file.name}`
    addAssetFile(configPath, file)
    update({ url: configPath })
    e.target.value = ''
  }

  return (
    <>
      <h4 style={{ marginBottom: 8, color: 'var(--accent)' }}>📹 Video: {vid.id}</h4>

      <div className="form-group">
        <label className="form-label">URL / Path</label>
        <div style={{ display: 'flex', gap: 4 }}>
          <input className="form-input" style={{ flex: 1 }} value={vid.url} onChange={(e) => update({ url: e.target.value })} />
          <button className="btn btn-sm" onClick={() => videoInputRef.current?.click()} title="Browse for video file">📁</button>
        </div>
        <input ref={videoInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={handleVideoFileSelect} />
      </div>

      <Vec3Input label="Position" value={vid.position} onChange={(v) => update({ position: v })} />
      <Vec3Input label="Rotation" value={vid.rotation} onChange={(v) => update({ rotation: v })} step={0.1} />

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Width</label>
          <input
            className="form-input"
            type="number"
            step={0.1}
            value={vid.size[0]}
            onChange={(e) => update({ size: [parseFloat(e.target.value) || 2, vid.size[1]] })}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Height</label>
          <input
            className="form-input"
            type="number"
            step={0.1}
            value={vid.size[1]}
            onChange={(e) => update({ size: [vid.size[0], parseFloat(e.target.value) || 1.5] })}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Trigger Time (s)</label>
          <input
            className="form-input"
            type="number"
            step={1}
            value={vid.triggerTime}
            onChange={(e) => update({ triggerTime: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Duration (s)</label>
          <input
            className="form-input"
            type="number"
            step={1}
            value={vid.duration || 30}
            onChange={(e) => update({ duration: parseFloat(e.target.value) || 30 })}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Opacity</label>
        <input
          className="form-input"
          type="number"
          step={0.1}
          min={0}
          max={1}
          value={vid.opacity ?? 0.9}
          onChange={(e) => update({ opacity: parseFloat(e.target.value) })}
        />
      </div>

      <div className="form-row" style={{ marginTop: 4 }}>
        <div className="form-group">
          <label className="form-label">
            <input
              type="checkbox"
              className="form-checkbox"
              checked={vid.loop ?? false}
              onChange={(e) => update({ loop: e.target.checked })}
            />{' '}
            Loop
          </label>
        </div>
        <div className="form-group">
          <label className="form-label">
            <input
              type="checkbox"
              className="form-checkbox"
              checked={vid.muted ?? false}
              onChange={(e) => update({ muted: e.target.checked })}
            />{' '}
            Muted
          </label>
        </div>
        <div className="form-group">
          <label className="form-label">
            <input
              type="checkbox"
              className="form-checkbox"
              checked={vid.multiWall ?? false}
              onChange={(e) => update({ multiWall: e.target.checked })}
            />{' '}
            Multi-wall
          </label>
        </div>
      </div>
    </>
  )
}

// ── Audio Properties ──
function AudioProps() {
  const selection = useStore((s) => s.selection)
  const story = useStore((s) => s.story)
  const updateAudio = useStore((s) => s.updateAudio)
  const addAssetFile = useStore((s) => s.addAssetFile)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scene = story.scenes.find((s) => s.id === selection.sceneId)
  const audio = scene?.audio.find((a) => a.id === selection.itemId)
  if (!scene || !audio) return <div style={{ color: 'var(--text-muted)', padding: 20 }}>Audio not found</div>

  const update = (updates: Partial<AudioConfig>) =>
    updateAudio(scene.id, audio.id, updates)

  const handleAudioFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const configPath = `audio/${file.name}`
    addAssetFile(configPath, file)
    update({ file: configPath })
    e.target.value = ''
  }

  return (
    <>
      <h4 style={{ marginBottom: 8, color: 'var(--accent)' }}>🔊 Audio: {audio.id}</h4>

      <div className="form-group">
        <label className="form-label">File Path</label>
        <div style={{ display: 'flex', gap: 4 }}>
          <input
            className="form-input"
            style={{ flex: 1 }}
            value={audio.file}
            onChange={(e) => update({ file: e.target.value })}
          />
          <button
            className="btn btn-sm"
            onClick={() => fileInputRef.current?.click()}
            title="Browse for audio file"
          >
            📁
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          style={{ display: 'none' }}
          onChange={handleAudioFileSelect}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Volume</label>
          <input
            className="form-input"
            type="number"
            step={0.1}
            min={0}
            max={1}
            value={audio.volume}
            onChange={(e) => update({ volume: parseFloat(e.target.value) || 1 })}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Delay (ms)</label>
          <input
            className="form-input"
            type="number"
            step={100}
            value={audio.delay ?? 0}
            onChange={(e) => update({ delay: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Duration (ms) — 0 = play to end</label>
        <input
          className="form-input"
          type="number"
          step={1000}
          value={audio.duration ?? 0}
          onChange={(e) => update({ duration: parseInt(e.target.value) || 0 })}
        />
      </div>

      <div className="form-group">
        <label className="form-label">
          <input
            type="checkbox"
            className="form-checkbox"
            checked={audio.positional}
            onChange={(e) => update({ positional: e.target.checked })}
          />{' '}
          Positional Audio
        </label>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">
            <input
              type="checkbox"
              className="form-checkbox"
              checked={audio.loop}
              onChange={(e) => update({ loop: e.target.checked })}
            />{' '}
            Loop
          </label>
        </div>
        <div className="form-group">
          <label className="form-label">
            <input
              type="checkbox"
              className="form-checkbox"
              checked={audio.autoplay ?? false}
              onChange={(e) => update({ autoplay: e.target.checked })}
            />{' '}
            Autoplay
          </label>
        </div>
      </div>

      {audio.positional && (
        <>
          <hr style={{ borderColor: 'var(--border-color)', margin: '8px 0' }} />
          <Vec3Input
            label="Position"
            value={audio.position || [0, 0, 0]}
            onChange={(v) => update({ position: v })}
          />
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Ref Distance</label>
              <input
                className="form-input"
                type="number"
                step={0.5}
                value={audio.refDistance ?? 1}
                onChange={(e) => update({ refDistance: parseFloat(e.target.value) || 1 })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Max Distance</label>
              <input
                className="form-input"
                type="number"
                step={1}
                value={audio.maxDistance ?? 10}
                onChange={(e) => update({ maxDistance: parseFloat(e.target.value) || 10 })}
              />
            </div>
          </div>
        </>
      )}
    </>
  )
}

// ── Spotlight Properties ──
function SpotlightProps() {
  const selection = useStore((s) => s.selection)
  const story = useStore((s) => s.story)
  const updateSpotlight = useStore((s) => s.updateSpotlight)

  const scene = story.scenes.find((s) => s.id === selection.sceneId)
  const spot = scene?.lighting.spotlights?.find((s) => s.id === selection.itemId)
  if (!scene || !spot) return <div style={{ color: 'var(--text-muted)', padding: 20 }}>Spotlight not found</div>

  const update = (updates: Partial<SpotlightConfig>) => updateSpotlight(scene.id, spot.id, updates)

  return (
    <>
      <h4 style={{ marginBottom: 8, color: 'var(--accent)' }}>Spotlight: {spot.id}</h4>

      <Vec3Input label="Position" value={spot.position} onChange={(v) => update({ position: v })} />
      <Vec3Input label="Target" value={spot.target} onChange={(v) => update({ target: v })} />

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Intensity</label>
          <input
            className="form-input"
            type="number"
            step={0.1}
            value={spot.intensity}
            onChange={(e) => update({ intensity: parseFloat(e.target.value) || 1 })}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Angle</label>
          <input
            className="form-input"
            type="number"
            step={0.1}
            value={spot.angle}
            onChange={(e) => update({ angle: parseFloat(e.target.value) || 0.5 })}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Penumbra</label>
        <input
          className="form-input"
          type="number"
          step={0.1}
          min={0}
          max={1}
          value={spot.penumbra}
          onChange={(e) => update({ penumbra: parseFloat(e.target.value) || 0.5 })}
        />
      </div>

      <div className="form-group">
        <label className="form-label">
          <input
            type="checkbox"
            className="form-checkbox"
            checked={spot.volumetric}
            onChange={(e) => update({ volumetric: e.target.checked })}
          />{' '}
          Volumetric
        </label>
      </div>

      <div className="form-group">
        <label className="form-label">Color</label>
        <input
          className="form-input"
          value={spot.color}
          onChange={(e) => update({ color: e.target.value })}
          placeholder="0xffffff"
        />
      </div>
    </>
  )
}

// ── Camera Keyframe Properties ──
function CameraKeyframeProps() {
  const selection = useStore((s) => s.selection)
  const story = useStore((s) => s.story)
  const updateCameraKeyframe = useStore((s) => s.updateCameraKeyframe)

  const sceneId = selection.sceneId
  const kf = sceneId ? story.camera.guided?.[sceneId]?.find((k) => k.id === selection.itemId) : null
  if (!sceneId || !kf) return <div style={{ color: 'var(--text-muted)', padding: 20 }}>Keyframe not found</div>

  const update = (updates: Partial<CameraKeyframe>) => updateCameraKeyframe(sceneId, kf.id, updates)

  return (
    <>
      <h4 style={{ marginBottom: 8, color: 'var(--accent)' }}>Camera Keyframe</h4>

      <div className="form-group">
        <label className="form-label">Time (seconds)</label>
        <input
          className="form-input"
          type="number"
          step={1}
          value={kf.time}
          onChange={(e) => update({ time: parseFloat(e.target.value) || 0 })}
        />
      </div>

      <Vec3Input label="Position" value={kf.position} onChange={(v) => update({ position: v })} />
      <Vec3Input label="Rotation" value={kf.rotation} onChange={(v) => update({ rotation: v })} step={0.1} />

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Duration (ms)</label>
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

// ── Interactive Object Properties ──
function InteractiveObjectProps() {
  const selection = useStore((s) => s.selection)
  const story = useStore((s) => s.story)
  const updateInteractiveObject = useStore((s) => s.updateInteractiveObject)
  const language = useStore((s) => s.language)

  const obj = story.interactableObjects?.find((o) => o.id === selection.itemId)
  if (!obj) return <div style={{ color: 'var(--text-muted)', padding: 20 }}>Object not found</div>

  const update = (updates: Partial<InteractiveObjectConfig>) => updateInteractiveObject(obj.id, updates)

  return (
    <>
      <h4 style={{ marginBottom: 8, color: 'var(--accent)' }}>Interactive: {obj.name[language] || obj.id}</h4>

      <div className="form-group">
        <label className="form-label">Name ({language})</label>
        <input
          className="form-input"
          value={obj.name[language] || ''}
          onChange={(e) => update({ name: { ...obj.name, [language]: e.target.value } })}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Model Path</label>
        <input className="form-input" value={obj.model} onChange={(e) => update({ model: e.target.value })} />
      </div>

      <h5 style={{ marginTop: 8, marginBottom: 4, color: 'var(--text-secondary)', fontSize: 11 }}>ORIGINAL STATE</h5>
      <Vec3Input
        label="Position"
        value={obj.original.position}
        onChange={(v) => update({ original: { ...obj.original, position: v } })}
      />
      <Vec3Input
        label="Rotation"
        value={obj.original.rotation}
        onChange={(v) => update({ original: { ...obj.original, rotation: v } })}
        step={0.1}
      />
      <Vec3Input
        label="Scale"
        value={obj.original.scale}
        onChange={(v) => update({ original: { ...obj.original, scale: v } })}
        step={0.1}
      />

      <h5 style={{ marginTop: 8, marginBottom: 4, color: 'var(--text-secondary)', fontSize: 11 }}>TRANSFORMED STATE</h5>
      <Vec3Input
        label="Position"
        value={obj.transformed.position}
        onChange={(v) => update({ transformed: { ...obj.transformed, position: v } })}
      />
      <Vec3Input
        label="Rotation"
        value={obj.transformed.rotation}
        onChange={(v) => update({ transformed: { ...obj.transformed, rotation: v } })}
        step={0.1}
      />
      <Vec3Input
        label="Scale"
        value={obj.transformed.scale}
        onChange={(v) => update({ transformed: { ...obj.transformed, scale: v } })}
        step={0.1}
      />

      <hr style={{ borderColor: 'var(--border-color)', margin: '8px 0' }} />

      <div className="form-group">
        <label className="form-label">
          <input
            type="checkbox"
            className="form-checkbox"
            checked={obj.hasInfoBox}
            onChange={(e) => update({ hasInfoBox: e.target.checked })}
          />{' '}
          Has Info Box
        </label>
      </div>

      {obj.hasInfoBox && (
        <div className="form-group">
          <label className="form-label">Info Box Message ({language})</label>
          <textarea
            className="form-input"
            rows={3}
            value={obj.infoBoxMessage[language] || ''}
            onChange={(e) => update({ infoBoxMessage: { ...obj.infoBoxMessage, [language]: e.target.value } })}
          />
        </div>
      )}

      <div className="form-group">
        <label className="form-label">
          <input
            type="checkbox"
            className="form-checkbox"
            checked={obj.enableRotation}
            onChange={(e) => update({ enableRotation: e.target.checked })}
          />{' '}
          Enable Rotation Animation
        </label>
      </div>
    </>
  )
}
