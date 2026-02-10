/**
 * Scene Hierarchy Panel - Tree view of scenes and their contents
 */
import { useState } from 'react'
import { useStore } from '../../state/store'

export function SceneHierarchy() {
  const story = useStore((s) => s.story)
  const activeSceneId = useStore((s) => s.activeSceneId)
  const selection = useStore((s) => s.selection)
  const setActiveScene = useStore((s) => s.setActiveScene)
  const setSelection = useStore((s) => s.setSelection)
  const addScene = useStore((s) => s.addScene)
  const removeScene = useStore((s) => s.removeScene)
  const addCharacter = useStore((s) => s.addCharacter)
  const addVideo = useStore((s) => s.addVideo)
  const addSubtitle = useStore((s) => s.addSubtitle)
  const addSpotlight = useStore((s) => s.addSpotlight)
  const addCameraKeyframe = useStore((s) => s.addCameraKeyframe)
  const addAudio = useStore((s) => s.addAudio)
  const addInteractiveObject = useStore((s) => s.addInteractiveObject)
  const removeCharacter = useStore((s) => s.removeCharacter)
  const removeVideo = useStore((s) => s.removeVideo)
  const removeAudio = useStore((s) => s.removeAudio)
  const removeSpotlight = useStore((s) => s.removeSpotlight)
  const removeInteractiveObject = useStore((s) => s.removeInteractiveObject)
  const removeCameraKeyframe = useStore((s) => s.removeCameraKeyframe)
  const language = useStore((s) => s.language)
  const setShowCameraPiP = useStore((s) => s.setShowCameraPiP)

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const isExpanded = (key: string) => expandedGroups[key] !== false // default open

  const isSelected = (type: string, sceneId?: string, itemId?: string) =>
    selection.type === type && selection.sceneId === sceneId && selection.itemId === itemId

  return (
    <div className="panel panel-left">
      <div className="panel-header">
        <span>Scene Hierarchy</span>
        <button className="btn btn-sm" onClick={addScene} title="Add Scene">
          + Scene
        </button>
      </div>
      <div className="panel-content" style={{ padding: 0 }}>
        {/* Camera */}
        <div
          className={`tree-item ${isSelected('camera') ? 'selected' : ''}`}
          onClick={() => { setSelection({ type: 'camera' }); setShowCameraPiP(true) }}
        >
          <span className="icon">📷</span>
          <span className="label">Camera</span>
        </div>

        {/* Environment */}
        <div
          className={`tree-item ${isSelected('environment') ? 'selected' : ''}`}
          onClick={() => setSelection({ type: 'environment' })}
        >
          <span className="icon">🏠</span>
          <span className="label">Environment</span>
        </div>

        {/* Interactive Objects (global) */}
        <div className="tree-group-header" onClick={() => toggleGroup('interactive')}>
          <span>{isExpanded('interactive') ? '▾' : '▸'}</span>
          <span>Interactive Objects ({story.interactableObjects?.length || 0})</span>
          <button
            className="btn-icon btn-sm"
            onClick={(e) => {
              e.stopPropagation()
              addInteractiveObject()
            }}
            title="Add Object"
          >
            +
          </button>
        </div>
        {isExpanded('interactive') && (
          <div className="tree-children">
            {(story.interactableObjects || []).map((obj) => (
              <div
                key={obj.id}
                className={`tree-item ${isSelected('interactiveObject', undefined, obj.id) ? 'selected' : ''}`}
                onClick={() => setSelection({ type: 'interactiveObject', itemId: obj.id })}
              >
                <span className="icon">🔲</span>
                <span className="label">{obj.name[language] || obj.id}</span>
                <button
                  className="btn-icon btn-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeInteractiveObject(obj.id)
                  }}
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Scenes */}
        {story.scenes.map((scene) => (
          <div key={scene.id}>
            {/* Scene header */}
            <div
              className={`tree-item ${activeSceneId === scene.id ? 'selected' : ''}`}
              style={{ fontWeight: 600 }}
              onClick={() => setActiveScene(scene.id)}
            >
              <span className="icon">🎬</span>
              <span className="label">{scene.title[language] || scene.id}</span>
              {story.scenes.length > 1 && (
                <button
                  className="btn-icon btn-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeScene(scene.id)
                  }}
                  title="Remove Scene"
                >
                  ×
                </button>
              )}
            </div>

            {activeSceneId === scene.id && (
              <div className="tree-children">
                {/* Audio */}
                <div className="tree-group-header" onClick={() => toggleGroup(`${scene.id}-audio`)}>
                  <span>{isExpanded(`${scene.id}-audio`) ? '▾' : '▸'}</span>
                  <span>Audio ({scene.audio.length})</span>
                  <button
                    className="btn-icon btn-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      addAudio(scene.id)
                    }}
                    title="Add Audio"
                  >
                    +
                  </button>
                </div>
                {isExpanded(`${scene.id}-audio`) &&
                  scene.audio.map((aud) => (
                    <div
                      key={aud.id}
                      className={`tree-item ${isSelected('audio', scene.id, aud.id) ? 'selected' : ''}`}
                      style={{ paddingLeft: 24 }}
                      onClick={() => setSelection({ type: 'audio', sceneId: scene.id, itemId: aud.id })}
                    >
                      <span className="icon">🔊</span>
                      <span className="label">{aud.file ? aud.file.split('/').pop() : aud.id}</span>
                      <button
                        className="btn-icon btn-sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeAudio(scene.id, aud.id)
                        }}
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                {/* Characters */}
                <div className="tree-group-header" onClick={() => toggleGroup(`${scene.id}-chars`)}>
                  <span>{isExpanded(`${scene.id}-chars`) ? '▾' : '▸'}</span>
                  <span>Characters ({scene.characters.length})</span>
                  <button
                    className="btn-icon btn-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      addCharacter(scene.id)
                    }}
                    title="Add Character"
                  >
                    +
                  </button>
                </div>
                {isExpanded(`${scene.id}-chars`) &&
                  scene.characters.map((char) => (
                    <div
                      key={char.id}
                      className={`tree-item ${isSelected('character', scene.id, char.id) ? 'selected' : ''}`}
                      style={{ paddingLeft: 24 }}
                      onClick={() => setSelection({ type: 'character', sceneId: scene.id, itemId: char.id })}
                    >
                      <span className="icon">🧑</span>
                      <span className="label">{char.id}</span>
                      <button
                        className="btn-icon btn-sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeCharacter(scene.id, char.id)
                        }}
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                {/* Videos */}
                <div className="tree-group-header" onClick={() => toggleGroup(`${scene.id}-videos`)}>
                  <span>{isExpanded(`${scene.id}-videos`) ? '▾' : '▸'}</span>
                  <span>Videos ({scene.videos.length})</span>
                  <button
                    className="btn-icon btn-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      addVideo(scene.id)
                    }}
                    title="Add Video"
                  >
                    +
                  </button>
                </div>
                {isExpanded(`${scene.id}-videos`) &&
                  scene.videos.map((vid) => (
                    <div
                      key={vid.id}
                      className={`tree-item ${isSelected('video', scene.id, vid.id) ? 'selected' : ''}`}
                      style={{ paddingLeft: 24 }}
                      onClick={() => setSelection({ type: 'video', sceneId: scene.id, itemId: vid.id })}
                    >
                      <span className="icon">📹</span>
                      <span className="label">{vid.id}</span>
                      <button
                        className="btn-icon btn-sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeVideo(scene.id, vid.id)
                        }}
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                {/* Spotlights */}
                <div className="tree-group-header" onClick={() => toggleGroup(`${scene.id}-lights`)}>
                  <span>{isExpanded(`${scene.id}-lights`) ? '▾' : '▸'}</span>
                  <span>Spotlights ({scene.lighting.spotlights?.length || 0})</span>
                  <button
                    className="btn-icon btn-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      addSpotlight(scene.id)
                    }}
                    title="Add Spotlight"
                  >
                    +
                  </button>
                </div>
                {isExpanded(`${scene.id}-lights`) &&
                  (scene.lighting.spotlights || []).map((spot) => (
                    <div
                      key={spot.id}
                      className={`tree-item ${isSelected('spotlight', scene.id, spot.id) ? 'selected' : ''}`}
                      style={{ paddingLeft: 24 }}
                      onClick={() =>
                        setSelection({ type: 'spotlight', sceneId: scene.id, itemId: spot.id })
                      }
                    >
                      <span className="icon">💡</span>
                      <span className="label">{spot.id}</span>
                      <button
                        className="btn-icon btn-sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeSpotlight(scene.id, spot.id)
                        }}
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                {/* Camera Keyframes */}
                <div className="tree-group-header" onClick={() => toggleGroup(`${scene.id}-camera`)}>
                  <span>{isExpanded(`${scene.id}-camera`) ? '▾' : '▸'}</span>
                  <span>Camera Keyframes ({story.camera.guided?.[scene.id]?.length || 0})</span>
                  <button
                    className="btn-icon btn-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      addCameraKeyframe(scene.id)
                    }}
                    title="Add Keyframe"
                  >
                    +
                  </button>
                </div>
                {isExpanded(`${scene.id}-camera`) &&
                  (story.camera.guided?.[scene.id] || []).map((kf) => (
                    <div
                      key={kf.id}
                      className={`tree-item ${isSelected('cameraKeyframe', scene.id, kf.id) ? 'selected' : ''}`}
                      style={{ paddingLeft: 24 }}
                      onClick={() =>
                        setSelection({ type: 'cameraKeyframe', sceneId: scene.id, itemId: kf.id })
                      }
                    >
                      <span className="icon">📷</span>
                      <span className="label">t={kf.time}s</span>
                      <button
                        className="btn-icon btn-sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeCameraKeyframe(scene.id, kf.id)
                        }}
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
