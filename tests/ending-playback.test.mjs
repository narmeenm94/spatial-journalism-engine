import test from 'node:test'
import assert from 'node:assert/strict'
import { createEndingPlayback } from '../engine/src/ui/endingPlayback.js'
import { renderCinematicEnding } from '../engine/src/ui/cinematicEnding.js'

function engineFixture() {
  return {
    completed: false, sceneManager: { elapsed: 101, paused: false },
    pause() { this.sceneManager.paused = true },
    resume() { if (!this.trackingLost) this.sceneManager.paused = false }
  }
}

test('closing visuals follow narration instead of elapsed wall time, including external pauses', () => {
  const engine = engineFixture(), playback = createEndingPlayback(engine)
  engine.sceneManager.elapsed = 110
  assert.equal(playback.sample(60).elapsed, 9)
  playback.setPaused(true)
  assert.equal(engine.sceneManager.paused, true)
  assert.deepEqual(playback.sample(60), { elapsed: 9, paused: true, linked: true })
  playback.setPaused(false)
  engine.sceneManager.elapsed = 111
  assert.equal(playback.sample(60).elapsed, 10)
  engine.sceneManager.paused = true
  assert.equal(playback.sample(60).paused, true)
  engine.trackingLost = true
  playback.setPaused(false)
  assert.equal(playback.sample().paused, true, 'tracking guard must also keep the ending film paused')
})

test('narration completion hands remaining closing visuals to their own clock without a jump', () => {
  const engine = engineFixture(), playback = createEndingPlayback(engine)
  engine.sceneManager.elapsed = 120
  playback.sample()
  engine.sceneManager.elapsed = 121
  engine.completed = true; engine.sceneManager.paused = true
  assert.deepEqual(playback.sample(50), { elapsed: 20, paused: false, linked: false })
  assert.equal(playback.sample(1).elapsed, 21)
  playback.setPaused(true)
  assert.equal(playback.sample(100).elapsed, 21)
  playback.setPaused(false)
  assert.equal(playback.sample(1).elapsed, 22)
})

test('standalone ending preview still supports pause, resume and seeking', () => {
  const playback = createEndingPlayback()
  assert.equal(playback.sample(5).elapsed, 5)
  playback.setPaused(true)
  assert.equal(playback.sample(100).elapsed, 5)
  playback.seek(20)
  assert.equal(playback.sample(100).elapsed, 20)
  playback.setPaused(false)
  assert.equal(playback.sample(1).elapsed, 21)
})

test('actual ending controls pause chapter playback and film, and keep pause available through narration tail', () => {
  const originals = { document: globalThis.document, requestAnimationFrame: globalThis.requestAnimationFrame, cancelAnimationFrame: globalThis.cancelAnimationFrame }
  let frame
  const elements = []
  function element(tag) {
    const node = { tag, style: {}, children: [], paused: true, duration: 200, currentTime: 0,
      appendChild(child) { this.children.push(child) }, replaceChildren() { this.children = [] },
      setAttribute(key, value) { this[key] = value }, removeAttribute() {}, load() {}, focus() {},
      pause() { this.paused = true }, play() { this.paused = false; return Promise.resolve() } }
    elements.push(node); return node
  }
  globalThis.document = { createElement: element }
  globalThis.requestAnimationFrame = callback => { frame = callback; return 1 }
  globalThis.cancelAnimationFrame = () => {}
  let dispose
  try {
    const engine = engineFixture()
    dispose = renderCinematicEnding(element('host'), { video: 'film.mp4', quotes: [], cinematic: { fadeIn: 0, textDelay: 0, textDuration: 0, textFade: 0, videoDelay: 0, actionsDelay: 40 } }, { playback: createEndingPlayback(engine) })
    const pause = elements.find(e => e.textContent === 'Pause ending')
    const seek = elements.find(e => e['aria-label'] === 'Ending playhead')
    const film = elements.find(e => e.tag === 'video')
    engine.sceneManager.elapsed = 110; frame(performance.now())
    assert.equal(film.paused, false)
    pause.onclick()
    assert.equal(engine.sceneManager.paused, true)
    assert.equal(film.paused, true)
    assert.equal(pause.textContent, 'Play ending')
    assert.equal(seek.disabled, true)
    seek.value = '35'; seek.oninput()
    assert.equal(seek.value, '9', 'a visual-only seek cannot detach the ending from narration')
    pause.onclick()
    assert.equal(engine.sceneManager.paused, false)
    assert.equal(film.paused, false)
    engine.sceneManager.elapsed = 145; frame(performance.now())
    assert.equal(pause.hidden, false, 'narration is still playing after closing actions appear')
    pause.onclick(); assert.equal(engine.sceneManager.paused, true)
    pause.onclick(); engine.completed = true; engine.sceneManager.paused = true
    frame(performance.now())
    assert.equal(pause.hidden, true)
    assert.equal(seek.disabled, false)
  } finally { dispose?.(); Object.assign(globalThis, originals) }
})
