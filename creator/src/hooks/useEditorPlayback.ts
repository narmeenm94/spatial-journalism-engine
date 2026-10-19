import { useEffect } from 'react'
import { useStore } from '../state/store'
import { chapterDuration } from '../utils/playback'

// Mounted with the studio, so changing tools never detaches the playback clock.
export function useEditorPlayback() {
  const playing = useStore(s => s.isPlaying)
  useEffect(() => {
    if (!playing) return
    let last = performance.now(), raf = 0
    const tick = (now: number) => {
      const state = useStore.getState()
      if (Object.keys(state.playbackLoading).length) { last = now; raf = requestAnimationFrame(tick); return }
      const scene = state.story.scenes.find(s => s.id === state.activeSceneId)
      const end = chapterDuration(scene, state.story.camera.guided?.[state.activeSceneId || ''], state.mediaDurations)
      const next = state.timelinePosition + (now - last) / 1000
      last = now
      state.setTimelinePosition(Math.min(next, end))
      if (next >= end) { state.setIsPlaying(false); return }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const hide = () => { if (document.hidden) useStore.getState().setIsPlaying(false) }
    document.addEventListener('visibilitychange', hide)
    return () => { cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', hide) }
  }, [playing])
}
