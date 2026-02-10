/**
 * 3D Viewport — Three.js canvas via React Three Fiber
 * Features: TransformControls, GLB model loading, selection, scene visualization,
 *           F-key focus, camera PiP preview.
 */
import React, { useRef, useMemo, Suspense, useCallback, useEffect, useState } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import {
  OrbitControls,
  TransformControls,
  Grid,
  GizmoHelper,
  GizmoViewport,
  Html,
  useGLTF,
} from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '../../state/store'

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
  return (
    <div className="viewport-container">
      <Canvas
        camera={{ position: [3, 3, 3], fov: 60, near: 0.01, far: 1000 }}
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
      <ViewportOverlays />
    </div>
  )
}

function LoadingIndicator() {
  return (
    <Html center>
      <div style={{ color: '#00b7ff', fontSize: 14 }}>Loading viewport…</div>
    </Html>
  )
}

// ══════════════════════════════════════════════
// ── Scene Content — renders everything ──
// ══════════════════════════════════════════════
function SceneContent() {
  const showGrid = useStore((s) => s.showGrid)
  const showAxes = useStore((s) => s.showAxes)
  const showBounds = useStore((s) => s.showBounds)
  const showCameraPath = useStore((s) => s.showCameraPath)
  const story = useStore((s) => s.story)
  const activeSceneId = useStore((s) => s.activeSceneId)
  const selection = useStore((s) => s.selection)
  const transformMode = useStore((s) => s.transformMode)
  const assetsBaseUrl = useStore((s) => s.assetsBaseUrl)
  const setSelection = useStore((s) => s.setSelection)
  const updateStory = useStore((s) => s.updateStory)
  const updateCharacter = useStore((s) => s.updateCharacter)
  const updateVideo = useStore((s) => s.updateVideo)
  const updateSpotlight = useStore((s) => s.updateSpotlight)
  const updateInteractiveObject = useStore((s) => s.updateInteractiveObject)

  const activeScene = story.scenes.find((s) => s.id === activeSceneId)
  const orbitRef = useRef<any>(null)
  const { camera } = useThree()

  // ── Object refs for TransformControls ──
  const objectRefs = useRef(new Map<string, THREE.Object3D>())

  // Guard: prevent click-to-select from firing right after a gizmo drag ends.
  // When the user releases a gizmo handle, the browser fires a click event that
  // can propagate through R3F and hit the environment or another object behind
  // the gizmo, causing an unwanted selection change.
  const gizmoJustDragged = useRef(false)

  const guardedSetSelection = useCallback(
    (sel: Parameters<typeof setSelection>[0]) => {
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
      if (!assetsBaseUrl || !modelPath) return null
      const base = assetsBaseUrl.endsWith('/') ? assetsBaseUrl : assetsBaseUrl + '/'
      const assetBase = story.project.assets.basePath || ''
      return `${base}${assetBase}${modelPath}`
    },
    [assetsBaseUrl, story.project.assets.basePath]
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
      setTimeout(() => { gizmoJustDragged.current = false }, 50)
    })

    const p: [number, number, number] = [obj.position.x, obj.position.y, obj.position.z]
    const r: [number, number, number] = [obj.rotation.x, obj.rotation.y, obj.rotation.z]
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
    } else if (selection.type === 'character' && selection.sceneId && selection.itemId) {
      updateCharacter(selection.sceneId, selection.itemId, { position: p, rotation: r, scale: s })
    } else if (selection.type === 'video' && selection.sceneId && selection.itemId) {
      updateVideo(selection.sceneId, selection.itemId, { position: p, rotation: r })
    } else if (selection.type === 'spotlight' && selection.sceneId && selection.itemId) {
      updateSpotlight(selection.sceneId, selection.itemId, { position: p })
    } else if (selection.type === 'interactiveObject' && selection.itemId) {
      updateInteractiveObject(selection.itemId, {
        original: { position: p, rotation: r, scale: s },
      })
    }
  }, [selectionKey, selection, updateStory, updateCharacter, updateVideo, updateSpotlight, updateInteractiveObject])

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

  const envModelUrl = getModelUrl(story.project.assets.environment)

  return (
    <>
      {/* ── Lighting ── */}
      <ambientLight
        color={parseHexColor(story.lighting.ambient.color)}
        intensity={story.lighting.ambient.intensity}
      />
      <directionalLight
        color={parseHexColor(story.lighting.directional.color)}
        intensity={story.lighting.directional.intensity}
        position={story.lighting.directional.position}
        castShadow
      />
      {story.lighting.hemisphere && (
        <hemisphereLight
          color={parseHexColor(story.lighting.hemisphere.skyColor)}
          groundColor={parseHexColor(story.lighting.hemisphere.groundColor)}
          intensity={story.lighting.hemisphere.intensity}
        />
      )}

      {/* ── Grid ── */}
      {showGrid && (
        <Grid
          args={[20, 20]}
          position={[0, -0.01, 0]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor="#333355"
          sectionSize={2}
          sectionThickness={1}
          sectionColor="#444477"
          fadeDistance={30}
          infiniteGrid
        />
      )}
      {showAxes && <axesHelper args={[3]} />}
      {showBounds && <BoundsVisualization />}
      {showCameraPath && activeSceneId && <CameraPathVisualization sceneId={activeSceneId} />}

      {/* ── Environment ── */}
      <group
        ref={registerRef('environment')}
        position={story.environment.position}
        scale={[story.environment.scale, story.environment.scale, story.environment.scale]}
        onClick={(e) => {
          e.stopPropagation()
          guardedSetSelection({ type: 'environment' })
        }}
      >
        {envModelUrl ? (
          <ModelErrorBoundary fallback={<EnvironmentPlaceholder />}>
            <Suspense fallback={<EnvironmentPlaceholder />}>
              <LoadedGLTF url={envModelUrl} />
            </Suspense>
          </ModelErrorBoundary>
        ) : (
          <EnvironmentPlaceholder />
        )}
      </group>

      {/* ── Scene Spotlights / Dynamic Lights ── */}
      {(activeScene?.lighting.spotlights || []).map((spot) => {
        const isSelected = selection.type === 'spotlight' && selection.itemId === spot.id
        return (
          <group
            key={spot.id}
            ref={registerRef(spot.id)}
            position={spot.position}
            onClick={(e) => {
              e.stopPropagation()
              guardedSetSelection({ type: 'spotlight', sceneId: activeSceneId!, itemId: spot.id })
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
            <mesh>
              <sphereGeometry args={[isSelected ? 0.1 : 0.08, 10, 10]} />
              <meshBasicMaterial color={isSelected ? 0xffff00 : 0xffc400} wireframe={!isSelected} />
            </mesh>
            {/* Dashed "light cone" helper line pointing toward target */}
            {spot.target && (
              <line>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    count={2}
                    array={new Float32Array([0, 0, 0, spot.target[0] - spot.position[0], spot.target[1] - spot.position[1], spot.target[2] - spot.position[2]])}
                    itemSize={3}
                  />
                </bufferGeometry>
                <lineBasicMaterial color={0xffff00} transparent opacity={0.3} />
              </line>
            )}
            <Label text={spot.id} color="#ffea00" y={0.18} />
          </group>
        )
      })}

      {/* ── Characters ── */}
      {(activeScene?.characters || []).map((char) => {
        const isSelected = selection.type === 'character' && selection.itemId === char.id
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
              guardedSetSelection({ type: 'character', sceneId: activeSceneId!, itemId: char.id })
            }}
          >
            {modelUrl ? (
              <ModelErrorBoundary fallback={<CharacterPlaceholder selected={isSelected} />}>
                <Suspense fallback={<CharacterPlaceholder selected={isSelected} />}>
                  <LoadedGLTF url={modelUrl} />
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
        const isSelected = selection.type === 'video' && selection.itemId === vid.id
        return (
          <group
            key={vid.id}
            ref={registerRef(vid.id)}
            position={vid.position}
            rotation={vid.rotation}
            onClick={(e) => {
              e.stopPropagation()
              guardedSetSelection({ type: 'video', sceneId: activeSceneId!, itemId: vid.id })
            }}
          >
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
        )
      })}

      {/* ── Interactive Objects ── */}
      {(story.interactableObjects || []).map((obj) => {
        const isSelected = selection.type === 'interactiveObject' && selection.itemId === obj.id
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
              guardedSetSelection({ type: 'interactiveObject', itemId: obj.id })
            }}
          >
            {modelUrl ? (
              <ModelErrorBoundary fallback={<ObjectPlaceholder selected={isSelected} />}>
                <Suspense fallback={<ObjectPlaceholder selected={isSelected} />}>
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

      {/* ── Camera Marker (selectable + movable) ── */}
      <CameraMarker registerRef={registerRef} gizmoJustDragged={gizmoJustDragged} />

      {/* ── Camera PiP (renders story camera viewfinder when camera is selected) ── */}
      <CameraPiP />

      {/* ── Transform Controls (attaches to the selected object) ── */}
      <ActiveTransformGizmo
        selectionKey={selectionKey}
        objectRefs={objectRefs}
        mode={transformMode}
        onEnd={handleTransformEnd}
      />

      {/* ── Orbit Controls ── */}
      <OrbitControls ref={orbitRef} makeDefault enableDamping dampingFactor={0.1} />

      {/* ── Gizmo Helper ── */}
      <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
        <GizmoViewport labelColor="white" axisHeadScale={0.8} />
      </GizmoHelper>
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
  onEnd,
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
    <TransformControls
      ref={controlsRef}
      object={targetObj}
      mode={mode as 'translate' | 'rotate' | 'scale'}
      size={0.8}
    />
  )
}

// ══════════════════════════════════════════════
// ── GLB Model Loader ──
// ══════════════════════════════════════════════
function LoadedGLTF({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  const clone = useMemo(() => scene.clone(), [scene])
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
        <meshStandardMaterial color="#334455" transparent opacity={0.08} wireframe />
      </mesh>
      <Html center>
        <div style={{ color: '#556677', fontSize: 11, whiteSpace: 'nowrap' }}>
          Set assets URL to load environment
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
        <meshStandardMaterial color="#2ed573" transparent opacity={selected ? 0.9 : 0.4} />
      </mesh>
      {/* Body */}
      <mesh position={[0, 0.25, 0]}>
        <capsuleGeometry args={[0.1, 0.3, 8, 16]} />
        <meshStandardMaterial color="#2ed573" transparent opacity={selected ? 0.9 : 0.4} />
      </mesh>
    </group>
  )
}

function ObjectPlaceholder({ selected }: { selected: boolean }) {
  return (
    <mesh>
      <boxGeometry args={[0.12, 0.12, 0.12]} />
      <meshStandardMaterial color="#ffa502" transparent opacity={selected ? 0.9 : 0.4} />
    </mesh>
  )
}

// ══════════════════════════════════════════════
// ── Label — floating HTML name tag ──
// ══════════════════════════════════════════════
function Label({ text, color, y }: { text: string; color: string; y: number }) {
  return (
    <Html position={[0, y, 0]} center style={{ pointerEvents: 'none' }}>
      <div
        style={{
          color,
          fontSize: 10,
          whiteSpace: 'nowrap',
          background: 'rgba(0,0,0,0.65)',
          padding: '1px 5px',
          borderRadius: 3,
          fontFamily: 'Inter, sans-serif',
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
  gizmoJustDragged,
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
      ref={registerRef('camera-marker')}
      position={pos}
      rotation={rot}
      onClick={(e) => {
        e.stopPropagation()
        if (gizmoJustDragged.current) return
        setSelection({ type: 'camera' })
      }}
    >
      {/* Camera body */}
      <mesh rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.1, 0.22, 4]} />
        <meshBasicMaterial color={isSelected ? 0xd980fa : 0xa55eea} wireframe />
      </mesh>
      {/* Frustum / direction indicator */}
      <mesh position={[0, 0, -0.25]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.18, 0.3, 4]} />
        <meshBasicMaterial color={isSelected ? 0xd980fa : 0xa55eea} wireframe transparent opacity={0.4} />
      </mesh>
      {/* Lens */}
      <mesh position={[0, 0, -0.15]}>
        <cylinderGeometry args={[0.04, 0.06, 0.08, 8]} />
        <meshBasicMaterial color={isSelected ? 0xd980fa : 0xa55eea} wireframe />
      </mesh>
      <Label text="📷 Camera" color="#a55eea" y={0.25} />
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
  const camPos = useStore((s) => s.story.camera.initialPosition)
  const camRot = useStore((s) => s.story.camera.initialRotation)

  // Standalone camera — NOT added to the scene graph (no drei component needed)
  const pipCamRef = useRef<THREE.PerspectiveCamera>(
    new THREE.PerspectiveCamera(60, 1.6, 0.01, 1000)
  )

  // Store the original clear color so we can restore it after PiP render
  const savedClearColor = useRef(new THREE.Color())

  // Priority 1 → R3F hands rendering to us.
  // We ALWAYS render the main scene, then overlay the PiP when active.
  useFrame(({ gl, scene, camera, size }) => {
    // ── 1. Main scene render (always) ──
    gl.setRenderTarget(null)
    gl.setViewport(0, 0, size.width, size.height)
    gl.setScissorTest(false)
    gl.autoClear = true
    gl.render(scene, camera)

    // ── 2. PiP overlay (only when active) ──
    if (!isActive) return

    const pipCam = pipCamRef.current

    // Sync PiP camera to the story camera transform from the store
    pipCam.position.set(camPos[0], camPos[1], camPos[2])
    pipCam.rotation.set(camRot[0], camRot[1], camRot[2])

    const pipW = Math.round(Math.min(size.width * 0.28, 340))
    const pipH = Math.round(pipW / 1.6)
    pipCam.aspect = pipW / pipH
    pipCam.updateProjectionMatrix()
    // Force world matrix update since camera has no parent in scene graph
    pipCam.updateMatrixWorld(true)

    const pipX = size.width - pipW - 12
    const pipY = 12 // WebGL y=0 is bottom of canvas

    // Save the current clear color
    gl.getClearColor(savedClearColor.current)
    const savedAlpha = gl.getClearAlpha()

    gl.autoClear = false
    gl.setViewport(pipX, pipY, pipW, pipH)
    gl.setScissor(pipX, pipY, pipW, pipH)
    gl.setScissorTest(true)

    // Clear PiP area with a dark background, then render
    gl.setClearColor(0x1a1a2e, 1)
    gl.clear(true, true, true)
    gl.render(scene, pipCam)

    // Restore full viewport and clear color
    gl.setScissorTest(false)
    gl.setViewport(0, 0, size.width, size.height)
    gl.setClearColor(savedClearColor.current, savedAlpha)
    gl.autoClear = true
  }, 1)

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
        (bounds.minZ + bounds.maxZ) / 2,
      ] as [number, number, number],
    [bounds]
  )
  const size = useMemo(
    () =>
      [bounds.maxX - bounds.minX, bounds.maxY - bounds.minY, bounds.maxZ - bounds.minZ] as [
        number,
        number,
        number,
      ],
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
function CameraPathVisualization({ sceneId }: { sceneId: string }) {
  const keyframes = useStore((s) => s.story.camera.guided?.[sceneId] ?? EMPTY_KEYFRAMES)
  const setSelection = useStore((s) => s.setSelection)
  const selection = useStore((s) => s.selection)

  if (keyframes.length === 0) return null

  const points = keyframes.map((kf) => new THREE.Vector3(...kf.position))

  return (
    <group>
      {/* Path line */}
      {keyframes.length >= 2 && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={points.length}
              array={new Float32Array(points.flatMap((p) => [p.x, p.y, p.z]))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color={0xa55eea} transparent opacity={0.6} linewidth={2} />
        </line>
      )}
      {/* Keyframe spheres */}
      {keyframes.map((kf, i) => {
        const isSelected = selection.type === 'cameraKeyframe' && selection.itemId === kf.id
        return (
          <group key={kf.id}>
            <mesh
              position={kf.position}
              onClick={(e) => {
                e.stopPropagation()
                setSelection({ type: 'cameraKeyframe', sceneId, itemId: kf.id })
              }}
            >
              <sphereGeometry args={[isSelected ? 0.09 : 0.06, 12, 12]} />
              <meshBasicMaterial color={isSelected ? 0xd980fa : 0xa55eea} />
            </mesh>
            <Label text={`KF${i + 1} t=${kf.time}s`} color="#a55eea" y={0.15} />
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

  const activeScene = story.scenes.find((s) => s.id === activeSceneId)
  const sceneName = activeScene?.title[language] || activeSceneId || 'No Scene'

  return (
    <>
      <div className="viewport-overlay">
        <span className="viewport-badge">{sceneName}</span>
        {/* Camera PiP toggle */}
        <button
          onClick={() => setShowCameraPiP(!showCameraPiP)}
          title={showCameraPiP ? 'Hide camera preview' : 'Show camera preview'}
          style={{
            marginLeft: 8,
            background: showCameraPiP ? 'rgba(165,94,234,0.8)' : 'rgba(255,255,255,0.1)',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            padding: '2px 8px',
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          📷 {showCameraPiP ? 'Hide PiP' : 'Show PiP'}
        </button>
      </div>
      <div className="viewport-info">
        {selection.type !== 'none' && (
          <span>
            {selection.type}
            {selection.itemId ? ` — ${selection.itemId}` : ''} &nbsp;|&nbsp;{' '}
            <strong>{transformMode.toUpperCase()}</strong> (W / E / R) &nbsp;|&nbsp; <em>F</em> to
            focus
          </span>
        )}
        {selection.type === 'none' && (
          <span style={{ opacity: 0.6 }}>Click an object to select it &nbsp;|&nbsp; <em>F</em> to focus</span>
        )}
      </div>
      {/* PiP border + label overlay — positioned to match the WebGL viewport scissor area */}
      {showCameraPiP && (
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            width: 'min(28%, 340px)',
            aspectRatio: '1.6',
            border: '2px solid rgba(165,94,234,0.8)',
            borderRadius: 4,
            pointerEvents: 'none',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -20,
              left: 0,
              background: 'rgba(165,94,234,0.85)',
              color: '#fff',
              padding: '1px 8px',
              borderRadius: '4px 4px 0 0',
              fontSize: 10,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            📷 Story Camera
          </div>
        </div>
      )}
    </>
  )
}

// ── Helpers ──
function parseHexColor(str: string): number {
  return parseInt(str.replace('0x', '').replace('#', ''), 16)
}
