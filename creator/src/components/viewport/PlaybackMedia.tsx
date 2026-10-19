import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { videoVertexShader, videoFragmentShader } from '../../../../engine/src/visual-effects/videoShader.js'
import { useStore } from '../../state/store'
import type { AudioConfig, VideoConfig } from '../../state/types'
import { mediaAtTime } from '../../utils/playback'
import { sampleCameraPath } from '../../../../engine/src/controls/cameraPath.js'

const audioSources = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>()

type Timing = { path: string; start: number; duration: number; loop: boolean; volume: number; muted: boolean; autoplay: boolean }

function useTimelineMedia(kind: 'audio' | 'video', id: string, url: string | null, timing: Timing) {
  const options = useRef(timing)
  options.current = timing
  const media = useMemo(() => {
    const element = document.createElement(kind)
    element.crossOrigin = 'anonymous'
    element.preload = 'auto'
    if (element instanceof HTMLVideoElement) element.playsInline = true
    return element
  }, [kind, url])
  useEffect(() => {
    const state = () => useStore.getState()
    if (!url) { state().setPlaybackIssue(id, 'Missing media: ' + options.current.path); return () => state().setPlaybackIssue(id, null) }
    state().setPlaybackLoading(id, options.current.path)
    let disposed = false, pending = false, blocked = false
    let previousPlaying = false
    const sync = () => {
      if (disposed) return
      const s = state(), o = options.current
      if (media.readyState >= 1) s.setMediaDuration(o.path, media.duration)
      const sample = mediaAtTime(s.timelinePosition, o.start, o.duration, media.duration, o.loop)
      const shouldPlay = s.playbackPreview && s.isPlaying && sample.active && o.autoplay && !Object.keys(s.playbackLoading).length
      if (s.isPlaying && !previousPlaying) blocked = false
      previousPlaying = s.isPlaying
      media.loop = o.loop; media.muted = o.muted; media.volume = Math.max(0, Math.min(1, o.volume))
      const target = s.playbackPreview ? sample.offset : 0
      if (media.readyState >= 1 && !media.seeking && Math.abs(media.currentTime - target) > (shouldPlay ? .3 : .025)) media.currentTime = target
      if (shouldPlay && media.paused && !pending && !blocked) {
        pending = true
        media.play().then(() => {
          if (disposed || !state().isPlaying || !state().playbackPreview) media.pause()
          if (!disposed) state().setPlaybackIssue(id, null)
        }).catch((error: DOMException) => {
          if (disposed || error.name === 'AbortError') return
          blocked = true
          state().setPlaybackIssue(id, error.name === 'NotAllowedError' ? 'Sound blocked. Pause, then press Play to enable it.' : 'Cannot play ' + o.path)
        }).finally(() => { pending = false })
      } else if (!shouldPlay && !media.paused) media.pause()
    }
    const loaded = () => { state().setPlaybackLoading(id, null); state().setMediaDuration(options.current.path, media.duration); state().setPlaybackIssue(id, null); sync() }
    const failed = () => { state().setPlaybackLoading(id, null); state().setPlaybackIssue(id, 'Cannot load ' + options.current.path + '. Check Media library.') }
    const waiting = () => { if (state().isPlaying) state().setPlaybackLoading(id, options.current.path) }
    const ready = () => { state().setPlaybackLoading(id, null); sync() }
    media.addEventListener('loadedmetadata', loaded)
    media.addEventListener('canplay', ready)
    media.addEventListener('waiting', waiting)
    media.addEventListener('error', failed)
    media.dataset.mediaId = id
    document.getElementById('editor-media')?.appendChild(media)
    media.src = url
    const unsubscribe = useStore.subscribe(sync)
    sync()
    return () => {
      disposed = true; unsubscribe(); media.pause()
      media.removeEventListener('loadedmetadata', loaded); media.removeEventListener('canplay', ready); media.removeEventListener('waiting', waiting); media.removeEventListener('error', failed)
      media.removeAttribute('src'); media.load(); media.remove(); state().setPlaybackIssue(id, null); state().setPlaybackLoading(id, null)
    }
  }, [media, url, id])
  return media
}

export function PlaybackVideo({ config, url }: { config: VideoConfig; url: string | null }) {
  const media = useTimelineMedia('video', 'video:' + config.id, url, { path: config.url, start: config.triggerTime || 0,
    duration: config.duration || 0, loop: !!config.loop, volume: 1, muted: config.muted !== false, autoplay: true }) as HTMLVideoElement
  const texture = useMemo(() => { const t = new THREE.VideoTexture(media); t.colorSpace = THREE.SRGBColorSpace; return t }, [media])
  useEffect(() => () => texture.dispose(), [texture])
  const group = useRef<THREE.Group>(null)
  const material = useMemo(() => new THREE.ShaderMaterial({ uniforms: { videoTexture: { value: texture }, opacity: { value: 0 } }, vertexShader: videoVertexShader, fragmentShader: videoFragmentShader, transparent: true, blending: THREE.AdditiveBlending }), [texture])
  useEffect(() => () => material.dispose(), [material])
  useFrame(() => {
    const s = useStore.getState()
    const sample = mediaAtTime(s.timelinePosition, config.triggerTime || 0, config.duration || 0, media.duration, !!config.loop)
    if (group.current) group.current.visible = !!url && s.playbackPreview && sample.active && media.readyState >= 2
    material.uniforms.opacity.value = (config.opacity ?? .9) * Math.min(1, Math.max(0, s.timelinePosition - (config.triggerTime || 0)))
  })
  // Wall transforms are chapter-local, just like the runtime projector. The parent carries the first plane's transform.
  const inverse = useMemo(() => new THREE.Matrix4().compose(new THREE.Vector3(...config.position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...config.rotation)), new THREE.Vector3(1, 1, 1)).invert(), [config.position, config.rotation])
  const walls = config.multiWall && config.walls?.length ? config.walls : null
  return <group ref={group} visible={false}>
    {walls ? <group matrix={inverse} matrixAutoUpdate={false}>{walls.map((wall, index) => <mesh key={index} position={wall.position} rotation={wall.rotation}>
      <planeGeometry args={wall.size || config.size}/><primitive object={material} attach="material"/>
    </mesh>)}</group> : <mesh><planeGeometry args={config.size}/><primitive object={material} attach="material"/></mesh>}
  </group>
}

export function PlaybackAudio({ config, url }: { config: AudioConfig; url: string | null }) {
  const media = useTimelineMedia('audio', 'audio:' + config.id, url, { path: config.file, start: (config.delay || 0) / 1000,
    duration: (config.duration || 0) / 1000, loop: !!config.loop, volume: 1, muted: false, autoplay: config.autoplay !== false })
  const spatial = useRef<{ listener: THREE.AudioListener; sound: THREE.Audio | THREE.PositionalAudio } | null>(null)
  useEffect(() => {
    const listener = new THREE.AudioListener()
    const sound = config.positional ? new THREE.PositionalAudio(listener) : new THREE.Audio(listener)
    let source = audioSources.get(media)
    if (!source) { source = listener.context.createMediaElementSource(media); audioSources.set(media, source) }
    sound.hasPlaybackControl = false; source.connect(sound.getOutput()); sound.setVolume(config.volume ?? 1)
    if (sound instanceof THREE.PositionalAudio) { sound.setRefDistance(config.refDistance ?? 1); sound.setMaxDistance(config.maxDistance ?? 10000); sound.setRolloffFactor(config.rolloffFactor ?? 1) }
    spatial.current = { listener, sound }
    const resume = () => { if (useStore.getState().isPlaying && listener.context.state === 'suspended') void listener.context.resume().catch(() => {}) }
    const unsubscribe = useStore.subscribe(resume); resume()
    return () => { unsubscribe(); source.disconnect(sound.getOutput()); sound.gain.disconnect(); listener.gain.disconnect(); spatial.current = null }
  }, [media, config.positional, config.volume, config.refDistance, config.maxDistance, config.rolloffFactor])
  useFrame(() => {
    if (!spatial.current) return
    const { listener, sound } = spatial.current, state = useStore.getState(), story = state.story
    const pose = sampleCameraPath(story.camera.guided?.[state.activeSceneId || ''] || [], state.timelinePosition, {position: story.camera.initialPosition, rotation: story.camera.initialRotation})
    listener.position.fromArray(pose.position); listener.quaternion.fromArray(pose.quaternion); listener.updateMatrixWorld(true)
    const points = config.waypoints || []
    let position = config.position || [0, 0, 0]
    for (const point of points) { if (state.timelinePosition >= point.time) position = point.position }
    sound.position.fromArray(position).multiplyScalar(story.environment.scale).add(new THREE.Vector3(...story.environment.position)); sound.updateMatrixWorld(true)
  })
  return null
}
