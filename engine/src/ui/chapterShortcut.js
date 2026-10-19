export function chapterShortcutState({ index, total, transitioning, hasSceneButtons, completed, now, readyAt }) {
  const visible = !completed && index >= 0 && index < total - 1
  return { visible, disabled: !visible || transitioning || hasSceneButtons || now < readyAt }
}

export function createChapterShortcut(engine) {
  const config = engine.story.ui?.controls || {}
  if (config.skipPlacement !== 'overlay') return null
  const button = document.createElement('button')
  button.id = 'sj-chapter-shortcut'
  button.setAttribute('aria-label', 'Next chapter')
  button.title = 'Next chapter'
  button.textContent = '→'
  button.style.cssText = 'position:absolute;bottom:28px;right:5%;width:40px;height:40px;border:0;border-radius:50%;background:rgba(0,0,0,.5);color:#fff;display:grid;place-items:center;z-index:9998;cursor:pointer;font:22px Arial,sans-serif'
  if (config.skipIcon) {
    const icon = document.createElement('img')
    icon.src = engine.uiManager.resolveAssetPath(config.skipIcon)
    icon.alt = ''; icon.style.cssText = 'width:18px;height:18px;object-fit:contain'
    button.replaceChildren(icon)
  }
  let currentId, readyAt = 0
  const update = () => {
    const manager = engine.sceneManager
    const now = performance.now()
    if (currentId !== manager?.currentSceneId) {
      currentId = manager?.currentSceneId
      readyAt = now + Math.max(0, config.skipCooldown ?? 5) * 1000
    }
    const state = chapterShortcutState({
      index: engine.story.scenes.findIndex(scene => scene.id === currentId), total: engine.story.scenes.length,
      transitioning: !!manager?.isTransitioning, hasSceneButtons: engine.sceneButtons?.items.some(item => item.root.visible),
      completed: engine.completed, now, readyAt
    })
    button.style.display = state.visible ? 'grid' : 'none'
    button.disabled = !!state.disabled
    button.style.opacity = state.disabled ? '.35' : '1'
    return state
  }
  button.onclick = () => { if (!update().disabled) { readyAt = performance.now() + Math.max(0, config.skipCooldown ?? 5) * 1000; engine.nextScene(); update() } }
  engine.container.appendChild(button)
  update()
  return { update, dispose: () => button.remove() }
}
