import { createButtonVisual } from '../ui/sceneButtonVisual.js'
import { sceneButtonVisible, sceneButtonTarget, sceneButtonPulse } from '../ui/sceneButtons.js'

export class SceneButtonManager {
  constructor(engine) {
    this.engine = engine
    this.items = []
    this.raycaster = new THREE.Raycaster()
    this.canvas = engine.renderer.domElement
    this.down = event => { this.press = { x: event.clientX, y: event.clientY, id: event.pointerId } }
    this.up = event => {
      const press = this.press; this.press = null
      if (!press || press.id !== event.pointerId || event.button > 0 || Math.hypot(event.clientX - press.x, event.clientY - press.y) > 6) return
      if (engine.mode === 'ar' && !engine.arPlaced) return
      const rect = this.canvas.getBoundingClientRect()
      this.raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), engine.camera)
      this.activateRay(this.raycaster)
    }
    this.cancel = () => { this.press = null }
    this.canvas.addEventListener('pointerdown', this.down)
    this.canvas.addEventListener('pointerup', this.up)
    this.canvas.addEventListener('pointercancel', this.cancel)
  }
  load(scene) {
    this.clear()
    this.sceneId = scene.id
    for (const config of scene.sceneButtons || []) {
      const visual = createButtonVisual(THREE, config, {
        language: this.engine.currentLanguage,
        resolve: path => this.engine.parser.resolvePath(path, this.engine.story.project.assets.basePath),
        loadModel: url => new Promise((resolve, reject) => new THREE.GLTFLoader().load(url, gltf => resolve(gltf.scene), undefined, reject)),
        onError: error => console.warn('Scene button media could not load; using its text label:', config.id, error)
      })
      const root = new THREE.Group()
      root.position.fromArray(config.position)
      root.rotation.set(...config.rotation)
      root.scale.fromArray(config.scale)
      root.add(visual.group)
      root.userData.sceneButtonId = config.id
      ;(this.engine.roomModel || this.engine.scene).add(root)
      this.items.push({ config, root, visual })
    }
    this.update()
  }
  update() {
    const manager = this.engine.sceneManager
    for (const item of this.items) {
      item.root.visible = sceneButtonVisible(item.config, manager?.elapsed || 0, manager?.sceneEnded) && !!sceneButtonTarget(item.config, this.engine.story.scenes, this.sceneId)
      item.visual.group.scale.setScalar(sceneButtonPulse(item.config, performance.now() / 1000))
    }
  }
  activateRay(raycaster) {
    if (this.engine.completed || this.engine.sceneManager?.isTransitioning) return false
    raycaster.camera ||= this.engine.camera
    const hits = raycaster.intersectObjects(this.items.filter(i => i.root.visible).map(i => i.root), true)
    if (!hits.length) return false
    let object = hits[0].object
    while (object && !object.userData.sceneButtonId) object = object.parent
    const item = this.items.find(i => i.config.id === object?.userData.sceneButtonId)
    const target = item && sceneButtonTarget(item.config, this.engine.story.scenes, this.sceneId)
    if (!target) return false
    this.engine.sceneManager.activateScene(target)
    return true
  }
  clear() {
    for (const item of this.items) { item.root.removeFromParent ? item.root.removeFromParent() : item.root.parent?.remove(item.root); item.visual.dispose() }
    this.items = []
  }
  dispose() {
    this.clear()
    this.canvas.removeEventListener('pointerdown', this.down)
    this.canvas.removeEventListener('pointerup', this.up)
    this.canvas.removeEventListener('pointercancel', this.cancel)
  }
}
