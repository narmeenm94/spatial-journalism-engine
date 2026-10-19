import { useEffect, useRef, type RefCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { createButtonVisual } from '../../../../engine/src/ui/sceneButtonVisual.js'
import { sceneButtonVisible, sceneButtonPulse, sceneButtonTarget } from '../../../../engine/src/ui/sceneButtons.js'
import { useStore } from '../../state/store'
import type { SceneButtonConfig } from '../../state/types'
import { chapterDuration } from '../../utils/playback'

export function SceneButton({ config, register, resolve, onSelect }: { config: SceneButtonConfig; register: RefCallback<THREE.Group>; resolve: (path: string) => string | null; onSelect: () => void }) {
  const host = useRef<THREE.Group>(null)
  const root = useRef<THREE.Group>(null)
  const visual = useRef<ReturnType<typeof createButtonVisual> | null>(null)
  const language = useStore(s => s.language)
  useEffect(() => {
    const content = createButtonVisual(THREE, config, {
      language, resolve: path => resolve(path) || path,
      loadModel: async url => (await new GLTFLoader().loadAsync(url)).scene,
      onError: error => useStore.getState().setPlaybackIssue(config.id, 'Button media: ' + error.message)
    })
    visual.current = content
    host.current?.add(content.group)
    return () => { content.group.removeFromParent(); content.dispose(); useStore.getState().setPlaybackIssue(config.id, null) }
  }, [config, language, resolve])
  useFrame(() => {
    const state = useStore.getState(), chapter = state.story.scenes.find(s => s.id === state.activeSceneId)
    if (!root.current || !chapter) return
    const ended = state.timelinePosition >= chapterDuration(chapter, state.story.camera.guided?.[chapter.id], state.mediaDurations)
    root.current.visible = !state.playbackPreview || (sceneButtonVisible(config, state.timelinePosition, ended) && !!sceneButtonTarget(config, state.story.scenes, chapter.id))
    visual.current?.group.scale.setScalar(sceneButtonPulse(config, performance.now() / 1000))
  })
  return <group ref={node => { root.current = node; register(node) }} position={config.position} rotation={config.rotation} scale={config.scale} userData={{ sceneButtonId:config.id }} onClick={e => {e.stopPropagation(); onSelect()}}>
    <group ref={host}/>
  </group>
}
