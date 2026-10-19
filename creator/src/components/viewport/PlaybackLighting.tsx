import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../state/store'
import type { StoryConfig, SceneConfig } from '../../state/types'
import { flickerMultiplier } from '../../utils/playback'

const color = (value: string) => new THREE.Color().setHex(parseInt(value.replace('0x', '').replace('#', ''), 16), THREE.LinearSRGBColorSpace)
const ease = (n: number) => { const p = Math.max(0, Math.min(1, n)); return p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2 }
export function PlaybackLighting({ story, chapter }: { story: StoryConfig; chapter?: SceneConfig }) {
  const ambient = useRef<THREE.AmbientLight>(null), directional = useRef<THREE.DirectionalLight>(null), hemisphere = useRef<THREE.HemisphereLight>(null), highlight = useRef<THREE.PointLight>(null)
  useFrame(() => {
    const { playbackPreview, timelinePosition: time } = useStore.getState()
    const modifiers = chapter?.lighting.modifiers, tour = chapter?.lighting.walkingTour
    const points = [...(tour?.waypoints || [])].sort((a, b) => a.time - b.time)
    const end = (points.at(-1)?.time ?? Infinity) + 1
    const lights = { ambient: ambient.current, directional: directional.current, hemisphere: hemisphere.current }
    for (const key of ['ambient', 'directional', 'hemisphere'] as const) {
      const light = lights[key]; if (!light) continue
      let intensity = (story.lighting[key]?.intensity || 0) * Math.PI * (modifiers?.[key] ?? 1)
      if (playbackPreview && tour && points.length && time >= 1) {
        intensity = THREE.MathUtils.lerp(intensity, tour.dimLights[key], ease((time - 1) / 2))
        if (time >= end) intensity = THREE.MathUtils.lerp(tour.dimLights[key], tour.endLights[key], ease((time - end) / 2))
      }
      light.intensity = intensity * (playbackPreview ? flickerMultiplier(time, chapter?.lighting.flicker) : 1)
    }
    if (highlight.current) {
      highlight.current.intensity = 0
      if (playbackPreview && time < end) {
        let index = -1
        points.forEach((p, i) => { if (p.time <= time) index = i })
        if (index >= 0) {
          const point = points[index], next = points[index + 1]
          highlight.current.position.fromArray(point.position)
          highlight.current.intensity = (point.intensity ?? 1.5) * Math.max(0, Math.min(1, time - point.time, next ? next.time - time : end - time))
        }
      }
    }
  })
  return <>
    <ambientLight ref={ambient} color={color(story.lighting.ambient.color)}/>
    <directionalLight ref={directional} color={color(story.lighting.directional.color)} position={story.lighting.directional.position} castShadow/>
    {story.lighting.hemisphere && <hemisphereLight ref={hemisphere} color={color(story.lighting.hemisphere.skyColor)} groundColor={color(story.lighting.hemisphere.groundColor)}/>}
    <group position={story.environment.position} scale={story.environment.scale}><pointLight ref={highlight} color="#00ffff" distance={1.5} decay={2} intensity={0}/></group>
  </>
}
