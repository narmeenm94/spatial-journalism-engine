/** Closing visuals share the chapter clock while its media is still playing. */
export function createEndingPlayback(engine) {
  let elapsed = 0
  let paused = false
  let linked = !!engine && !engine.completed
  let chapterTime = engine?.sceneManager?.elapsed || 0
  const isLinked = () => !!engine && !engine.completed
  return {
    sample(delta = 0) {
      const active = isLinked()
      if (linked) {
        const current = engine.sceneManager?.elapsed || 0
        elapsed += Math.max(0, current - chapterTime)
        chapterTime = current
        // Completion pauses the scene manager automatically, not the closing film.
        if (active) paused = !!engine.sceneManager?.paused
      } else if (!paused) elapsed += Math.max(0, delta)
      linked = active
      return { elapsed, paused, linked: active }
    },
    setPaused(value) {
      if (isLinked()) {
        value ? engine.pause() : engine.resume()
        paused = !!engine.sceneManager?.paused
      } else paused = value
    },
    seek(time) {
      // A visual-only seek would detach the closing sequence from narration.
      if (!isLinked()) elapsed = Math.max(0, time)
    }
  }
}
