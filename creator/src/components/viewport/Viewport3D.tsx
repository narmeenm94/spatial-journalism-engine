/**
 * 3D Viewport — Three.js canvas via React Three Fiber
 * Features: TransformControls, GLB model loading, selection, scene visualization,
 *           F-key focus, camera PiP preview.
 */
import React, {
  useRef,
  useMemo,
  Suspense,
  useCallback,
  useEffect,
  useState
} from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import {
  OrbitControls,
  TransformControls,
  Grid,
  GizmoHelper,
  GizmoViewport,
  Html,
  useGLTF
} from '@react-three/drei'
import * as THREE from 'three'
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js'
import { useStore } from '../../state/store'
import type { CharacterConfig } from '../../state/types'
import { characterOpacity } from '../../utils/playback'
import { PlaybackVideo, PlaybackAudio } from './PlaybackMedia'
import { PlaybackLighting } from './PlaybackLighting'
import { SceneButton } from './SceneButton'
import { sceneButtonTarget } from '../../../../engine/src/ui/sceneButtons.js'
import { PlaybackOverlay } from './PlaybackOverlay'
import { AudienceCameraOverlay } from './AudienceCameraOverlay'
import { Icon } from '../Icon'
import { sampleCameraPath } from '../../../../engine/src/controls/cameraPath.js'

// Stable empty array to avoid infinite re-render loops in useStore selectors
const EMPTY_KEYFRAMES: never[] = []

// ── Error Boundary for model loading ──
class ModelErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(err: Error) {
    console.warn('[Viewport] Model load error:', err.message)
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}

// ══════════════════════════════════════════════
// ── Main Viewport Component ──
// ══════════════════════════════════════════════
export function Viewport3D() {
  const audience = useStore(s => s.audienceFullView)
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') useStore.getState().setAudienceFullView(false) }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [])
  return (
    <div className={"viewport-container" + (audience ? " audience-full-view" : "")}>
      <Canvas
        camera={{ position: [6, 4.5, 7], fov: 60, near: 0.01, far: 1000 }}
        shadows
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.4
        }}
      >
        <Suspense fallback={<LoadingIndicator />}>
          <SceneContent />
        </Suspense>
      </Canvas>
      <div id="editor-media" aria-hidden="true" style={{ position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden', pointerEvents: 'none' }}/>
      <ViewportOverlays />
      <PlaybackOverlay />
    </div>
  )
}

function LoadingIndicator() {
  return (
    <Html zIndexRange={[10, 0]} center>
      <div style={{ color: '#00b7ff', fontSize: 14 }}>Loading viewport…</div>
    </Html>
  )
}

// ══════════════════════════════════════════════
// ── Scene Content — renders everything ──
// ══════════════════════════════════════════════
function SceneContent() {
  const audience = useStore(s => s.audienceFullView)
  const playbackPreview = useStore(s => s.playbackPreview)
  const showGrid = useStore((s) => s.showGrid)
  const showAxes = useStore((s) => s.showAxes)
  const showBounds = useStore((s) => s.showBounds)
  const showCameraPath = useStore((s) => s.showCameraPath)
  const story = useStore((s) => s.story)
  const activeSceneId = useStore((s) => s.activeSceneId)
  const selection = useStore((s) => s.selection)
  const transformMode = useStore((s) => s.transformMode)
  const assetsBaseUrl = useStore((s) => s.assetsBaseUrl)
  const assetFiles = useStore((s) => s.assetFiles)
  const fileUrls = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(assetFiles).map(([path, file]) => [
          path,
          URL.createObjectURL(file)
        ])
      ),
    [assetFiles]
  )
  useEffect(
    () => () =>
      Object.values(fileUrls).forEach((url) => URL.revokeObjectURL(url)),
    [fileUrls]
  )
  const setSelection = useStore((s) => s.setSelection)
  const updateStory = useStore((s) => s.updateStory)
  const updateCharacter = useStore((s) => s.updateCharacter)
  const updateVideo = useStore((s) => s.updateVideo)
  const updateSpotlight = useStore((s) => s.updateSpotlight)
  const updateInteractiveObject = useStore((s) => s.updateInteractiveObject)

  const activeScene = story.scenes.find((s) => s.id === activeSceneId)
  const orbitRef = useRef<any>(null)
  const { camera, gl } = useThree()
  useEffect(() => {
    gl.toneMappingExposure = story.rendering?.toneMappingExposure ?? 1.4
  }, [gl, story.rendering?.toneMappingExposure])

  useEffect(() => {
    const capture = (event: Event) => {
      const { sceneId, time, kfId } = (event as CustomEvent).detail
      if (sceneId !== useStore.getState().activeSceneId) return
      camera.updateMatrixWorld(true)
      const position = camera
        .getWorldPosition(new THREE.Vector3())
        .toArray() as [number, number, number]
      const rotation = new THREE.Euler()
        .setFromQuaternion(
          camera.getWorldQuaternion(new THREE.Quaternion()),
          'XYZ'
        )
        .toArray()
        .slice(0, 3) as [number, number, number]
      const store = useStore.getState()
      if (kfId)
        store.updateCameraKeyframe(sceneId, kfId, { position, rotation })
      else store.addCameraKeyframe(sceneId, { position, rotation, time })
      store.setShowCameraPiP(true)
      store.setTimelinePosition(time + 2)
    }
    const view = (event: Event) => {
      const { position, rotation } = (event as CustomEvent).detail
      camera.position.fromArray(position)
      camera.rotation.set(...(rotation as [number, number, number]))
      camera.updateMatrixWorld(true)
      orbitRef.current?.target
        .copy(camera.position)
        .add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(2))
      orbitRef.current?.update()
    }
    window.addEventListener('sj-capture-camera', capture)
    window.addEventListener('sj-view-camera', view)
    return () => {
      window.removeEventListener('sj-capture-camera', capture)
      window.removeEventListener('sj-view-camera', view)
    }
  }, [camera])

  // ── Object refs for TransformControls ──
  const objectRefs = useRef(new Map<string, THREE.Object3D>())

  // Guard: prevent click-to-select from firing right after a gizmo drag ends.
  // When the user releases a gizmo handle, the browser fires a click event that
  // can propagate through R3F and hit the environment or another object behind
  // the gizmo, causing an unwanted selection change.
  const gizmoJustDragged = useRef(false)

  const guardedSetSelection = useCallback(
    (sel: Parameters<typeof setSelection>[0]) => {
      if (useStore.getState().audienceFullView) return
      if (gizmoJustDragged.current) return // Ignore clicks right after a gizmo drag
      setSelection(sel)
    },
    [setSelection]
  )

  const registerRef = useCallback(
    (id: string) => (node: THREE.Object3D | null) => {
      if (node) objectRefs.current.set(id, node)
      else objectRefs.current.delete(id)
    },
    []
  )

  // ── Selection key ──
  const selectionKey = useMemo(() => {
    if (selection.type === 'none' || selection.type === 'audio') return null
    if (selection.type === 'environment') return 'environment'
    if (selection.type === 'camera') return 'camera-marker'
    if (selection.itemId) return selection.itemId
    return null
  }, [selection])

  // ── Model URL helper ──
  const getModelUrl = useCallback(
    (modelPath: string) => {
      if (!modelPath) return null
      if (fileUrls[modelPath]) return fileUrls[modelPath]
      if (story.embeddedAssets?.[modelPath])
        return story.embeddedAssets[modelPath]
      if (/^(https?:|data:|blob:)/i.test(modelPath)) return modelPath
      if (!assetsBaseUrl) return null
      const base = assetsBaseUrl.endsWith('/')
        ? assetsBaseUrl
        : assetsBaseUrl + '/'
      const assetBase = story.project.assets.basePath || ''
      return new URL(assetBase + modelPath, base).href
    },
    [
      assetsBaseUrl,
      story.project.assets.basePath,
      story.embeddedAssets,
      fileUrls
    ]
  )

  // ── Handle transform end (mouseUp) ──
  const handleTransformEnd = useCallback(() => {
    if (!selectionKey) return
    const obj = objectRefs.current.get(selectionKey)
    if (!obj) return

    // Block click-to-select for a brief moment so the mouseUp from the gizmo
    // doesn't accidentally select a different object behind it.
    gizmoJustDragged.current = true
    requestAnimationFrame(() => {
      setTimeout(() => {
        gizmoJustDragged.current = false
      }, 50)
    })

    const p: [number, number, number] = [
      obj.position.x,
      obj.position.y,
      obj.position.z
    ]
    const r: [number, number, number] = [
      obj.rotation.x,
      obj.rotation.y,
      obj.rotation.z
    ]
    const s: [number, number, number] = [obj.scale.x, obj.scale.y, obj.scale.z]

    if (selection.type === 'environment') {
      updateStory((d) => {
        d.environment.position = p
        d.environment.scale = s[0]
      }, 'Transform environment')
    } else if (selection.type === 'camera') {
      updateStory((d) => {
        d.camera.initialPosition = p
      }, 'Move camera')
    } else if (
      selection.type === 'character' &&
      selection.sceneId &&
      selection.itemId
    ) {
      updateCharacter(selection.sceneId, selection.itemId, {
        position: p,
        rotation: r,
        scale: s
      })
    } else if (
      selection.type === 'staticObject' &&
      selection.sceneId &&
      selection.itemId
    ) {
      updateStory((d) => {
        const o = d.scenes
          .find((c) => c.id === selection.sceneId)
          ?.objects?.find((o) => o.id === selection.itemId)
        if (o) {
          o.position = p
          o.rotation = r
          o.scale = s
        }
      }, 'Transform object')
    } else if (
      selection.type === 'video' &&
      selection.sceneId &&
      selection.itemId
    ) {
      updateVideo(selection.sceneId, selection.itemId, {
        position: p,
        rotation: r
      })
    } else if (
      selection.type === 'spotlight' &&
      selection.sceneId &&
      selection.itemId
    ) {
      updateSpotlight(selection.sceneId, selection.itemId, { position: p })
    } else if (
      selection.type === 'cameraKeyframe' &&
      selection.sceneId &&
      selection.itemId
    ) {
      useStore
        .getState()
        .updateCameraKeyframe(selection.sceneId, selection.itemId, {
          position: p,
          rotation: r
        })
    } else if (selection.type === 'sceneButton' && selection.sceneId && selection.itemId) {
      updateStory(d => {
        const button = d.scenes.find(c => c.id === selection.sceneId)?.sceneButtons?.find(b => b.id === selection.itemId)
        if (button) Object.assign(button, { position:p, rotation:r, scale:s })
      }, 'Move scene button')
    } else if (selection.type === 'interactiveObject' && selection.itemId) {
      updateInteractiveObject(selection.itemId, {
        original: { position: p, rotation: r, scale: s }
      })
    }
  }, [
    selectionKey,
    selection,
    updateStory,
    updateCharacter,
    updateVideo,
    updateSpotlight,
    updateInteractiveObject
  ])

  // ── Focus on selected object (F key) ──
  useEffect(() => {
    const handleFocus = () => {
      if (!selectionKey || !orbitRef.current) return
      const obj = objectRefs.current.get(selectionKey)
      if (!obj) return

      // Get world position of the selected object
      const worldPos = new THREE.Vector3()
      obj.getWorldPosition(worldPos)

      // Compute bounding sphere for better framing
      const box = new THREE.Box3().setFromObject(obj)
      const sphere = new THREE.Sphere()
      box.getBoundingSphere(sphere)
      const radius = Math.max(sphere.radius, 0.5)

      // Animate orbit target to the object
      const controls = orbitRef.current
      const targetStart = controls.target.clone()
      const targetEnd = worldPos.clone()

      // Position camera at a nice distance
      const dir = camera.position.clone().sub(controls.target).normalize()
      const camEnd = worldPos.clone().add(dir.multiplyScalar(radius * 3))

      const camStart = camera.position.clone()
      const duration = 400
      const startTime = performance.now()

      const animate = () => {
        const t = Math.min((performance.now() - startTime) / duration, 1)
        const ease = 1 - Math.pow(1 - t, 3) // easeOutCubic

        controls.target.lerpVectors(targetStart, targetEnd, ease)
        camera.position.lerpVectors(camStart, camEnd, ease)
        controls.update()

        if (t < 1) requestAnimationFrame(animate)
      }
      requestAnimationFrame(animate)
    }

    window.addEventListener('sj-focus-selected', handleFocus)
    return () => window.removeEventListener('sj-focus-selected', handleFocus)
  }, [selectionKey, camera])

  useEffect(() => {
    const reset = () => {
      camera.position.set(6, 4.5, 7)
      orbitRef.current?.target.set(0, 0.8, 0)
      orbitRef.current?.update()
    }
    window.addEventListener('sj-reset-view', reset)
    return () => window.removeEventListener('sj-reset-view', reset)
  }, [camera])
  const envModelUrl = getModelUrl(story.project.assets.environment)

  return (
    <>
      <color attach="background" args={['#f4f4f2']} />
      <PlaybackLighting story={story} chapter={activeScene}/>
      {(activeScene?.audio || []).map(audio => <PlaybackAudio key={activeSceneId + audio.id} config={audio} url={getModelUrl(audio.file)}/>)}

      {(story.ambience || []).filter(audio => !audio.objectId).map(audio => <PlaybackAudio key={'ambience:' + audio.id} config={{...audio,id:'ambience:' + audio.id}} url={getModelUrl(audio.file)}/>)}
      <group userData={{ editorOnly: true }}>
        {/* ── Grid ── */}
        {showGrid && (
          <Grid
            args={[20, 20]}
            position={[0, -0.01, 0]}
            cellSize={0.5}
            cellThickness={0.5}
            cellColor="#ddddda"
            sectionSize={2}
            sectionThickness={1}
            sectionColor="#c9c9c5"
            fadeDistance={30}
            infiniteGrid
          />
        )}
        {showAxes && <axesHelper args={[3]} />}
        {showBounds && <BoundsVisualization />}
        {showCameraPath && activeSceneId && (
          <CameraPathVisualization
            sceneId={activeSceneId}
            registerRef={registerRef}
          />
        )}
      </group>
      {/* ── Environment ── */}
      <group
        ref={registerRef('environment')}
        position={story.environment.position}
        scale={[
          story.environment.scale,
          story.environment.scale,
          story.environment.scale
        ]}
        onClick={(e) => {
          e.stopPropagation()
          guardedSetSelection({ type: 'environment' })
        }}
      >
        {envModelUrl ? (
          <ModelErrorBoundary
            key={envModelUrl}
            fallback={<EnvironmentPlaceholder />}
          >
            <Suspense fallback={<EnvironmentPlaceholder />}>
              <LoadedGLTF url={envModelUrl} />
            </Suspense>
          </ModelErrorBoundary>
        ) : (
          <EnvironmentPlaceholder />
        )}
      </group>

      <group
        position={story.environment.position}
        scale={story.environment.scale}
      >
        {/* ── Scene Spotlights / Dynamic Lights ── */}
        {(activeScene?.lighting.spotlights || []).map((spot) => {
          const isSelected =
            selection.type === 'spotlight' && selection.itemId === spot.id
          return (
            <group
              key={spot.id}
              ref={registerRef(spot.id)}
              position={spot.position}
              onClick={(e) => {
                e.stopPropagation()
                guardedSetSelection({
                  type: 'spotlight',
                  sceneId: activeSceneId!,
                  itemId: spot.id
                })
              }}
            >
              {/* Actual light — use appropriate intensity for physically-correct lighting */}
              <pointLight
                color={parseHexColor(spot.color)}
                intensity={spot.intensity ?? 1}
                distance={spot.distance ?? 30}
                decay={2}
              />
              {/* Visual gizmo */}
              <group userData={{ editorOnly: true }}>
              <mesh>
                <sphereGeometry args={[isSelected ? 0.1 : 0.08, 10, 10]} />
                <meshBasicMaterial
                  color={isSelected ? 0xffff00 : 0xffc400}
                  wireframe={!isSelected}
                />
              </mesh>
              {/* Dashed "light cone" helper line pointing toward target */}
              {spot.target && (
                <line>
                  <bufferGeometry>
                    <bufferAttribute
                      attach="attributes-position"
                      args={[
                        new Float32Array([
                          0,
                          0,
                          0,
                          spot.target[0] - spot.position[0],
                          spot.target[1] - spot.position[1],
                          spot.target[2] - spot.position[2]
                        ]),
                        3
                      ]}
                    />
                  </bufferGeometry>
                  <lineBasicMaterial
                    color={0xffff00}
                    transparent
                    opacity={0.3}
                  />
                </line>
              )}
              <Label text={spot.id} color="#ffea00" y={0.18} />
              </group>
            </group>
          )
        })}

        {(activeScene?.objects || []).map((obj) => {
          const url = getModelUrl(obj.model)
          return (
            <group
              key={obj.id}
              ref={registerRef(obj.id)}
              position={obj.position}
              rotation={obj.rotation}
              scale={obj.scale}
              onClick={(e) => {
                e.stopPropagation()
                guardedSetSelection({
                  type: 'staticObject',
                  sceneId: activeSceneId!,
                  itemId: obj.id
                })
              }}
            >
              {url ? (
                <ModelErrorBoundary
                  key={url}
                  fallback={
                    <ObjectPlaceholder selected={selection.itemId === obj.id} />
                  }
                >
                  <Suspense fallback={null}>
                    <LoadedGLTF url={url} />
                  </Suspense>
                </ModelErrorBoundary>
              ) : (
                <ObjectPlaceholder selected={selection.itemId === obj.id} />
              )}
            </group>
          )
        })}
        {(activeScene?.sceneButtons || []).map(button => <SceneButton key={button.id} config={button} register={registerRef(button.id)} resolve={getModelUrl} onSelect={() => guardedSetSelection({type:'sceneButton',sceneId:activeSceneId!,itemId:button.id})}/>)}
        {/* ── Characters ── */}
        {(activeScene?.characters || []).map((char) => {
          const isSelected =
            selection.type === 'character' && selection.itemId === char.id
          const modelUrl = getModelUrl(char.model)
          return (
            <group
              key={char.id}
              ref={registerRef(char.id)}
              position={char.position}
              rotation={char.rotation}
              scale={char.scale}
              onClick={(e) => {
                e.stopPropagation()
                guardedSetSelection({
                  type: 'character',
                  sceneId: activeSceneId!,
                  itemId: char.id
                })
              }}
            >
              {modelUrl ? (
                <ModelErrorBoundary
                  key={modelUrl}
                  fallback={<CharacterPlaceholder selected={isSelected} />}
                >
                  <Suspense
                    fallback={<CharacterPlaceholder selected={isSelected} />}
                  >
                    <LoadedGLTF url={modelUrl} character={char} />
                  </Suspense>
                </ModelErrorBoundary>
              ) : (
                <CharacterPlaceholder selected={isSelected} />
              )}
              <Label text={char.id} color="#2ed573" y={0.6} />
            </group>
          )
        })}

        {/* ── Videos ── */}
        {(activeScene?.videos || []).map((vid) => {
          const isSelected =
            selection.type === 'video' && selection.itemId === vid.id
          return (
            <group
              key={vid.id}
              ref={registerRef(vid.id)}
              position={vid.position}
              rotation={vid.rotation}
              onClick={(e) => {
                e.stopPropagation()
                guardedSetSelection({
                  type: 'video',
                  sceneId: activeSceneId!,
                  itemId: vid.id
                })
              }}
            >
              <PlaybackVideo config={vid} url={getModelUrl(vid.url)} />
              <group visible={!playbackPreview} userData={{ editorOnly: true }}>
              <mesh>
                <planeGeometry args={vid.size} />
                <meshStandardMaterial
                  color="#ff4757"
                  transparent
                  opacity={isSelected ? 0.5 : 0.2}
                  side={THREE.DoubleSide}
                />
              </mesh>
              {/* Show a screen-like border */}
              <lineSegments>
                <edgesGeometry args={[new THREE.PlaneGeometry(...vid.size)]} />
                <lineBasicMaterial color={isSelected ? '#ff4757' : '#663333'} />
              </lineSegments>
              <Label text={vid.id} color="#ff4757" y={vid.size[1] / 2 + 0.15} />
              </group>
            </group>
          )
        })}

        {/* ── Interactive Objects ── */}
        {(story.interactableObjects || []).map((obj) => {
          const isSelected =
            selection.type === 'interactiveObject' &&
            selection.itemId === obj.id
          const modelUrl = getModelUrl(obj.model)
          return (
            <group
              key={obj.id}
              ref={registerRef(obj.id)}
              position={obj.original.position}
              rotation={obj.original.rotation}
              scale={obj.original.scale}
              onClick={(e) => {
                e.stopPropagation()
                guardedSetSelection({
                  type: 'interactiveObject',
                  itemId: obj.id
                })
              }}
            >
              {modelUrl ? (
                <ModelErrorBoundary
                  key={modelUrl}
                  fallback={<ObjectPlaceholder selected={isSelected} />}
                >
                  <Suspense
                    fallback={<ObjectPlaceholder selected={isSelected} />}
                  >
                    <LoadedGLTF url={modelUrl} />
                  </Suspense>
                </ModelErrorBoundary>
              ) : (
                <ObjectPlaceholder selected={isSelected} />
              )}
              <Label text={obj.id} color="#ffa502" y={0.15} />
            </group>
          )
        })}
      </group>
      {/* ── Camera Marker (selectable + movable) ── */}
      <CameraMarker
        registerRef={registerRef}
        gizmoJustDragged={gizmoJustDragged}
      />

      {/* ── Camera PiP (renders story camera viewfinder when camera is selected) ── */}
      <CameraPiP />

      {/* ── Transform Controls (attaches to the selected object) ── */}
      <ActiveTransformGizmo
        selectionKey={playbackPreview ? null : selectionKey}
        objectRefs={objectRefs}
        mode={transformMode}
        onEnd={handleTransformEnd}
      />

      {/* ── Orbit Controls ── */}
      <OrbitControls
        ref={orbitRef}
        makeDefault
        enabled={!audience}
        enableDamping
        dampingFactor={0.1}
      />

      {/* ── Gizmo Helper ── */}
      {!audience && <GizmoHelper renderPriority={2} alignment="top-right" margin={[45, 45]}>
        <GizmoViewport labelColor="white" axisHeadScale={0.8} />
      </GizmoHelper>}
    </>
  )
}

// ══════════════════════════════════════════════
// ── Transform Controls Wrapper ──
// Uses dragging-changed event to toggle orbit controls
// ══════════════════════════════════════════════
function ActiveTransformGizmo({
  selectionKey,
  objectRefs,
  mode,
  onEnd
}: {
  selectionKey: string | null
  objectRefs: React.MutableRefObject<Map<string, THREE.Object3D>>
  mode: string
  onEnd: () => void
}) {
  const controlsRef = useRef<any>(null)
  const [targetObj, setTargetObj] = useState<THREE.Object3D | null>(null)

  // Resolve the selected object whenever selectionKey changes
  useEffect(() => {
    if (!selectionKey) {
      setTargetObj(null)
      return
    }
    // Use requestAnimationFrame to ensure the group refs have been committed
    const raf = requestAnimationFrame(() => {
      const obj = objectRefs.current.get(selectionKey) || null
      setTargetObj(obj)
    })
    return () => cancelAnimationFrame(raf)
  }, [selectionKey, objectRefs])

  // Disable orbit controls while dragging, and commit transform on mouse up
  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return

    const handleDraggingChanged = (event: { value: boolean }) => {
      if (!event.value) {
        onEnd()
      }
    }

    controls.addEventListener('dragging-changed', handleDraggingChanged)
    return () => {
      controls.removeEventListener('dragging-changed', handleDraggingChanged)
    }
  }, [onEnd, targetObj])

  if (!targetObj) return null

  return (
    <group userData={{ editorOnly: true }}>
      <TransformControls
        ref={controlsRef}
        object={targetObj}
        mode={mode as 'translate' | 'rotate' | 'scale'}
        size={0.8}
      />
    </group>
  )
}

// ══════════════════════════════════════════════
// ── GLB Model Loader ──
// ══════════════════════════════════════════════
function LoadedGLTF({ url, character }: { url: string; character?: CharacterConfig }) {
  const { scene, animations } = useGLTF(url)
  const clone = useMemo(() => {
    const object = cloneSkeleton(scene)
    if (character) object.traverse(child => {
      if (!(child instanceof THREE.Mesh)) return
      const copy = (m: THREE.Material) => { const material = m.clone(); material.transparent = true; material.depthWrite = false; return material }
      child.material = Array.isArray(child.material) ? child.material.map(copy) : copy(child.material)
    })
    return object
  }, [scene, !!character])
  const mixer = useMemo(() => new THREE.AnimationMixer(clone), [clone])
  useEffect(() => {
    if (!character?.animation || !animations.length) return
    const clip = animations.find(a => a.name === character.animation) || animations[0]
    const action = mixer.clipAction(clip); action.play()
    return () => { mixer.stopAllAction(); mixer.uncacheRoot(clone) }
  }, [mixer, clone, animations, character?.animation])
  useEffect(() => () => { if (character) clone.traverse(child => {
    if (child instanceof THREE.Mesh) (Array.isArray(child.material) ? child.material : [child.material]).forEach(m => m.dispose())
  }) }, [clone])
  useFrame(() => {
    if (!character) return
    const state = useStore.getState()
    const opacity = state.playbackPreview ? characterOpacity(character, state.timelinePosition) : character.opacity ?? .7
    clone.visible = opacity > 0
    // Absolute sampling makes pauses and backwards scrubbing deterministic.
    mixer.setTime(state.playbackPreview ? Math.max(0, state.timelinePosition - (character.delay || 0) / 1000) : 0)
    clone.traverse(child => { if (child instanceof THREE.Mesh) (Array.isArray(child.material) ? child.material : [child.material]).forEach(m => { m.opacity = opacity }) })
  })
  return <primitive object={clone} />
}

// ══════════════════════════════════════════════
// ── Placeholder Components ──
// ══════════════════════════════════════════════
function EnvironmentPlaceholder() {
  return (
    <group>
      <mesh>
        <boxGeometry args={[4, 3, 6]} />
        <meshStandardMaterial
          color="#334455"
          transparent
          opacity={0.08}
          wireframe
        />
      </mesh>
      <Html zIndexRange={[10, 0]} center>
        <div style={{ color: '#556677', fontSize: 11, whiteSpace: 'nowrap' }}>
          Loading your space…
        </div>
      </Html>
    </group>
  )
}

function CharacterPlaceholder({ selected }: { selected: boolean }) {
  return (
    <group>
      {/* Head */}
      <mesh position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial
          color="#2ed573"
          transparent
          opacity={selected ? 0.9 : 0.4}
        />
      </mesh>
      {/* Body */}
      <mesh position={[0, 0.25, 0]}>
        <capsuleGeometry args={[0.1, 0.3, 8, 16]} />
        <meshStandardMaterial
          color="#2ed573"
          transparent
          opacity={selected ? 0.9 : 0.4}
        />
      </mesh>
    </group>
  )
}

function ObjectPlaceholder({ selected }: { selected: boolean }) {
  return (
    <mesh>
      <boxGeometry args={[0.12, 0.12, 0.12]} />
      <meshStandardMaterial
        color="#ffa502"
        transparent
        opacity={selected ? 0.9 : 0.4}
      />
    </mesh>
  )
}

// ══════════════════════════════════════════════
// ── Label — floating HTML name tag ──
// ══════════════════════════════════════════════
function Label({ text, color, y, selected = false }: { text: string; color: string; y: number; selected?: boolean }) {
  const selection = useStore(s => s.selection)
  const playback = useStore(s => s.playbackPreview || s.audienceFullView)
  if (playback) return null
  // Keep the scene readable: name the selected object, camera and route stops.
  if (!selected && text !== 'Audience camera' && selection.itemId !== text) return null
  return (
    <Html
      zIndexRange={[10, 0]}
      position={[0, y, 0]}
      center
      style={{ pointerEvents: 'none' }}
    >
      <div
        style={{
          color: '#34342a',
          borderLeft: '3px solid ' + color,
          fontSize: 11,
          whiteSpace: 'nowrap',
          background: 'rgba(255,254,245,0.96)',
          padding: '5px 9px',
          borderRadius: 7,
          boxShadow: '0 2px 8px #24241412',
          fontFamily: 'Segoe UI, sans-serif'
        }}
      >
        {text}
      </div>
    </Html>
  )
}

// ══════════════════════════════════════════════
// ── Camera Marker (selectable, movable) ──
// ══════════════════════════════════════════════
function CameraMarker({
  registerRef,
  gizmoJustDragged
}: {
  registerRef: (id: string) => (node: THREE.Object3D | null) => void
  gizmoJustDragged: React.MutableRefObject<boolean>
}) {
  const pos = useStore((s) => s.story.camera.initialPosition)
  const rot = useStore((s) => s.story.camera.initialRotation)
  const selection = useStore((s) => s.selection)
  const setSelection = useStore((s) => s.setSelection)
  const isSelected = selection.type === 'camera'

  return (
    <group
      userData={{ editorOnly: true }}
      ref={registerRef('camera-marker')}
      position={pos}
      rotation={rot}
      onClick={(e) => {
        e.stopPropagation()
        if (useStore.getState().audienceFullView) return
      if (gizmoJustDragged.current) return
        setSelection({ type: 'camera' })
      }}
    >
      {/* Camera body */}
      <mesh rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.1, 0.22, 4]} />
        <meshBasicMaterial color={isSelected ? 0x222222 : 0x666666} wireframe />
      </mesh>
      {/* Frustum / direction indicator */}
      <mesh position={[0, 0, -0.25]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.18, 0.3, 4]} />
        <meshBasicMaterial
          color={isSelected ? 0x222222 : 0x666666}
          wireframe
          transparent
          opacity={0.4}
        />
      </mesh>
      {/* Lens */}
      <mesh position={[0, 0, -0.15]}>
        <cylinderGeometry args={[0.04, 0.06, 0.08, 8]} />
        <meshBasicMaterial color={isSelected ? 0x222222 : 0x666666} wireframe />
      </mesh>
      <Label text="Audience camera" color="#666666" y={0.25} />
    </group>
  )
}

// ══════════════════════════════════════════════
// ── Camera PiP — Picture-in-Picture preview ──
// Shows the view from the story camera when it's selected
// ══════════════════════════════════════════════
/**
 * CameraPiP — Renders a Picture-in-Picture preview of what the story camera sees.
 *
 * Uses a standalone THREE.PerspectiveCamera that is NOT added to the scene graph.
 * This avoids interference from drei's PerspectiveCamera component and R3F's
 * camera management.
 *
 * IMPORTANT: Using `useFrame` with priority > 0 tells R3F that we are handling
 * rendering ourselves (R3F skips its default `gl.render`). Therefore this
 * callback MUST always render the main scene first, then optionally the PiP
 * overlay on top.
 */
function CameraPiP() {
  const isActive = useStore((s) => s.showCameraPiP)
  const fullView = useStore(s => s.audienceFullView)
  const camPos = useStore((s) => s.story.camera.initialPosition)
  const camRot = useStore((s) => s.story.camera.initialRotation)

  // Standalone camera — NOT added to the scene graph (no drei component needed)
  const pipCamRef = useRef<THREE.PerspectiveCamera>(
    new THREE.PerspectiveCamera(75, 1.6, 0.01, 1000)
  )

  const { gl: renderer, scene: world } = useThree()
  useEffect(() => {
    const canvas = renderer.domElement
    let press: {x:number; y:number; id:number} | null = null
    const audienceBounds = () => {
      const state = useStore.getState(), rect = canvas.getBoundingClientRect()
      if (!state.playbackPreview || (!state.showCameraPiP && !state.audienceFullView)) return null
      const width = state.audienceFullView ? rect.width : Math.round(Math.min(rect.width * 0.28, 340))
      const height = state.audienceFullView ? rect.height : Math.round(width / 1.6)
      return { left:state.audienceFullView ? rect.left : rect.right - width - 12, top:state.audienceFullView ? rect.top : rect.bottom - height - 12, width, height }
    }
    const down = (event: PointerEvent) => {
      const rect = audienceBounds()
      if (!rect || event.clientX < rect.left || event.clientX > rect.left + rect.width || event.clientY < rect.top || event.clientY > rect.top + rect.height) return
      press = {x:event.clientX,y:event.clientY,id:event.pointerId}
      event.stopImmediatePropagation()
    }
    const up = (event: PointerEvent) => {
      const start = press; press = null
      if (!start) return
      event.stopImmediatePropagation()
      if (event.button > 0 || start.id !== event.pointerId || Math.hypot(event.clientX-start.x,event.clientY-start.y)>6) return
      const rect = audienceBounds(); if (!rect) return
      const ray = new THREE.Raycaster()
      ray.setFromCamera(new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1),pipCamRef.current)
      const buttons: THREE.Object3D[] = []
      world.traverseVisible(object => {if(object.userData.sceneButtonId) buttons.push(object)})
      let hit: THREE.Object3D | null = ray.intersectObjects(buttons,true)[0]?.object || null
      while(hit && !hit.userData.sceneButtonId) hit=hit.parent
      const state=useStore.getState(), chapter=state.story.scenes.find(s=>s.id===state.activeSceneId)
      const button=chapter?.sceneButtons?.find(b=>b.id===hit?.userData.sceneButtonId)
      const target=button && chapter && sceneButtonTarget(button,state.story.scenes,chapter.id)
      if(target) {state.setActiveScene(target); state.setIsPlaying(true)}
    }
    const cancel = () => {press=null}
    canvas.addEventListener('pointerdown',down,true)
    canvas.addEventListener('pointerup',up,true)
    canvas.addEventListener('pointercancel',cancel)
    return () => {canvas.removeEventListener('pointerdown',down,true);canvas.removeEventListener('pointerup',up,true);canvas.removeEventListener('pointercancel',cancel)}
  }, [renderer, world])

  // Store the original clear color so we can restore it after PiP render
  const savedClearColor = useRef(new THREE.Color())

  // Priority 1 → R3F hands rendering to us.
  // We ALWAYS render the main scene, then overlay the PiP when active.
  useFrame(({ gl, scene, camera, size }) => {
    if (fullView) return
    // ── 1. Main scene render (always) ──
    gl.setRenderTarget(null)
    gl.setViewport(0, 0, size.width, size.height)
    gl.setScissorTest(false)
    gl.autoClear = true
    gl.render(scene, camera)
  }, 1)

  // Render after the orientation HUD so it cannot overwrite the audience view.
  useFrame(({ gl, scene, size }) => {
    // ── 2. PiP overlay (only when active) ──
    if (!isActive && !fullView) return

    const pipCam = pipCamRef.current

    // Sync PiP camera to the story camera transform from the store
    pipCam.position.set(camPos[0], camPos[1], camPos[2])
    pipCam.rotation.set(camRot[0], camRot[1], camRot[2])
    const state = useStore.getState()
    if ((state.previewCameraPath || state.playbackPreview) && state.activeSceneId) {
      const pose = sampleCameraPath(
        state.story.camera.guided?.[state.activeSceneId] || [],
        state.timelinePosition,
        { position: camPos, rotation: camRot }
      )
      pipCam.position.fromArray(pose.position)
      pipCam.quaternion.fromArray(pose.quaternion)
    }

    const pipW = fullView ? size.width : Math.round(Math.min(size.width * 0.28, 340))
    const pipH = fullView ? size.height : Math.round(pipW / 1.6)
    pipCam.aspect = pipW / pipH
    pipCam.updateProjectionMatrix()
    // Force world matrix update since camera has no parent in scene graph
    pipCam.updateMatrixWorld(true)

    const pipX = fullView ? 0 : size.width - pipW - 12
    const pipY = fullView ? 0 : 12 // WebGL y=0 is bottom of canvas

    // Save the current clear color
    gl.getClearColor(savedClearColor.current)
    const savedAlpha = gl.getClearAlpha()

    gl.autoClear = false
    gl.setViewport(pipX, pipY, pipW, pipH)
    gl.setScissor(pipX, pipY, pipW, pipH)
    gl.setScissorTest(true)

    // Clear PiP area with a dark background, then render
    gl.setClearColor(0xf5f5f3, 1)
    gl.clear(true, true, true)
    const hidden: THREE.Object3D[] = []
    scene.traverse((object) => {
      if (object.userData.editorOnly && object.visible) {
        hidden.push(object)
        object.visible = false
      }
    })
    try {
      gl.render(scene, pipCam)
    } finally {
      hidden.forEach((object) => {
        object.visible = true
      })

      // Restore full viewport and clear color
      gl.setScissorTest(false)
      gl.setViewport(0, 0, size.width, size.height)
      gl.setClearColor(savedClearColor.current, savedAlpha)
      gl.autoClear = true
    }
  }, 3)

  // Nothing to add to the scene — the camera is standalone
  return null
}

// ══════════════════════════════════════════════
// ── Bounds Visualization ──
// ══════════════════════════════════════════════
function BoundsVisualization() {
  const bounds = useStore((s) => s.story.camera.bounds)
  const center = useMemo(
    () =>
      [
        (bounds.minX + bounds.maxX) / 2,
        (bounds.minY + bounds.maxY) / 2,
        (bounds.minZ + bounds.maxZ) / 2
      ] as [number, number, number],
    [bounds]
  )
  const size = useMemo(
    () =>
      [
        bounds.maxX - bounds.minX,
        bounds.maxY - bounds.minY,
        bounds.maxZ - bounds.minZ
      ] as [number, number, number],
    [bounds]
  )
  return (
    <group position={center}>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(...size)]} />
        <lineBasicMaterial color={0x00b7ff} transparent opacity={0.3} />
      </lineSegments>
    </group>
  )
}

// ══════════════════════════════════════════════
// ── Camera Path Visualization ──
// ══════════════════════════════════════════════
function CameraPathVisualization({
  sceneId,
  registerRef
}: {
  sceneId: string
  registerRef: (id: string) => (node: THREE.Object3D | null) => void
}) {
  const keyframes = useStore(
    (s) => s.story.camera.guided?.[sceneId] ?? EMPTY_KEYFRAMES
  )
  const setSelection = useStore((s) => s.setSelection)
  const selection = useStore((s) => s.selection)

  if (keyframes.length === 0) return null

  const ordered = [...keyframes].sort((a, b) => a.time - b.time)
  const points = ordered.map((kf) => new THREE.Vector3(...kf.position))

  return (
    <group>
      {/* Path line */}
      {keyframes.length >= 2 && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[
                new Float32Array(points.flatMap((p) => [p.x, p.y, p.z])),
                3
              ]}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color={0x666666}
            transparent
            opacity={0.6}
            linewidth={2}
          />
        </line>
      )}
      {/* Keyframe spheres */}
      {ordered.map((kf, i) => {
        const isSelected =
          selection.type === 'cameraKeyframe' && selection.itemId === kf.id
        return (
          <group
            key={kf.id}
            ref={registerRef(kf.id)}
            position={kf.position}
            rotation={kf.rotation}
          >
            <mesh
              onClick={(e) => {
                e.stopPropagation()
                setSelection({ type: 'cameraKeyframe', sceneId, itemId: kf.id })
                useStore
                  .getState()
                  .setTimelinePosition(kf.time + (kf.duration ?? 2000) / 1000)
              }}
            >
              <sphereGeometry args={[isSelected ? 0.09 : 0.06, 12, 12]} />
              <meshBasicMaterial color={isSelected ? 0x222222 : 0x666666} />
            </mesh>
            {isSelected && (
              <arrowHelper
                args={[
                  new THREE.Vector3(0, 0, -1),
                  new THREE.Vector3(),
                  0.4,
                  0xe7bc25
                ]}
              />
            )}
            <Label
              selected={isSelected}
              text={isSelected ? `View ${i + 1} · ${kf.time}s` : String(i + 1)}
              color="#666666"
              y={0.15}
            />
          </group>
        )
      })}
    </group>
  )
}

// ══════════════════════════════════════════════
// ── Viewport Overlays (HTML) ──
// ══════════════════════════════════════════════
function ViewportOverlays() {
  const activeSceneId = useStore((s) => s.activeSceneId)
  const selection = useStore((s) => s.selection)
  const transformMode = useStore((s) => s.transformMode)
  const story = useStore((s) => s.story)
  const language = useStore((s) => s.language)
  const showCameraPiP = useStore((s) => s.showCameraPiP)
  const setShowCameraPiP = useStore((s) => s.setShowCameraPiP)
  const fullView = useStore(s => s.audienceFullView)

  const activeScene = story.scenes.find((s) => s.id === activeSceneId)
  const sceneName = activeScene?.title[language] || activeSceneId || 'No Scene'

  return (
    <>
      <div className="viewport-overlay">
        <span className="viewport-badge">{sceneName}</span>
        {!showCameraPiP && !fullView && <button className="btn btn-sm audience-show" onClick={() => setShowCameraPiP(true)} title="Show audience camera">
          <Icon name="camera" size={16}/> Audience camera
        </button>}
      </div>
      <div className="viewport-info">
        {selection.type !== 'none' && (
          <span>
            {selection.type}
            {selection.itemId
              ? ` — ${selection.itemId}`
              : ''} &nbsp;|&nbsp; <strong>{transformMode.toUpperCase()}</strong>{' '}
            (W / E / R) &nbsp;|&nbsp; <em>F</em> to focus
          </span>
        )}
        {selection.type === 'none' && (
          <span style={{ opacity: 0.6 }}>
            Click an object to select it &nbsp;|&nbsp; <em>F</em> to focus
          </span>
        )}
      </div>
      {(showCameraPiP || fullView) && <AudienceCameraOverlay fullView={fullView}/>}
    </>
  )
}

// ── Helpers ──
function parseHexColor(str: string): THREE.Color {
  return new THREE.Color().setHex(
    parseInt(str.replace('0x', '').replace('#', ''), 16),
    THREE.LinearSRGBColorSpace
  )
}
