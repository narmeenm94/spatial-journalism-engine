export function sceneButtonVisible(button, time, ended) {
  return button.showWhen === 'chapterEnd' ? !!ended : time >= (button.showWhen === 'time' ? button.showAt || 0 : 0)
}
export function sceneButtonTarget(button, scenes, currentId) {
  if (button.targetScene) return scenes.some(s => s.id === button.targetScene) ? button.targetScene : null
  const index = scenes.findIndex(s => s.id === currentId)
  const next = scenes[index]?.nextScene
  return next ? (scenes.some(s => s.id === next) ? next : null) : scenes[index + 1]?.id || null
}
export function sceneButtonPulse(button, time) {
  return button.pulse ? 1 + Math.sin(time * 1.5) * 0.03 : 1
}
export function localizedButtonValue(value, language) {
  return typeof value === 'string' ? value : value?.[language] || value?.en || Object.values(value || {})[0] || ''
}
