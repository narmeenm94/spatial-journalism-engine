/** Timed destinations, always approached from the reader's current view. */
export class GuidedCameraController {
  constructor(camera, cameraRig, guidedConfig = {}, options = {}) {
    this.camera = camera
    this.cameraRig = cameraRig
    this.sceneCameraPositions = guidedConfig
    this.animateTrackedPose = options.animateTrackedPose
  }
  startSceneTracking(sceneId, getTime) {
    this.stopSceneTracking()
    this.currentSceneId = sceneId
    this.getTime = getTime
    this.lastTime = -Infinity
    this.update()
  }
  beginMove(cue, now, duration = cue.duration ?? 2000) {
    const object = this.cameraRig || this.camera
    object.updateWorldMatrix(true, false)
    this.camera.updateWorldMatrix(true, false)
    this.camera.updateMatrix()
    const localInverse = this.cameraRig ? this.camera.matrix.clone().invert() : new THREE.Matrix4()
    const toPosition = new THREE.Vector3().fromArray(this.animateTrackedPose && cue.arPosition || cue.position)
    const toQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(...(this.animateTrackedPose && cue.arRotation || cue.rotation)))
    this.destination = cue
    if (this.animateTrackedPose) {
      // The original guided controller sends a destination to the same rig
      // animation used by recentering. Do not animate a second parent transform.
      this.animateTrackedPose(toPosition, toQuaternion, duration)
      this.transition = null
      return
    }
    this.transition = {
      fromPosition: this.camera.getWorldPosition(new THREE.Vector3()), fromQuaternion: this.camera.getWorldQuaternion(new THREE.Quaternion()), localInverse,
      toPosition, toQuaternion, start: now, duration: duration / 1000, easing: cue.easing
    }
  }
  update() {
    if (!this.currentSceneId) return
    const now = Math.max(0, this.getTime() || 0)
    const cues = [...(this.sceneCameraPositions[this.currentSceneId] || [])].sort((a,b) => a.time-b.time)
    const rewound = now < this.lastTime
    const due = cues.filter(cue => cue.time <= now && (rewound || cue.time > this.lastTime))
    if (rewound) this.transition = null
    // Seeking or joining a chapter approaches only the latest due destination.
    if (due.length) this.beginMove(due[due.length - 1], now)
    this.lastTime = now
    const t = this.transition
    if (!t) return
    const p = t.duration <= 0 ? 1 : Math.min(1, Math.max(0, (now-t.start)/t.duration))
    const ease = t.easing === 'sine' ? (1-Math.cos(Math.PI*p))/2
      : t.easing === 'cubic' ? (p < .5 ? 4*p*p*p : 1-Math.pow(-2*p+2,3)/2)
      : (p < .5 ? 2*p*p : 1-Math.pow(-2*p+2,2)/2)
    const object = this.cameraRig || this.camera
    const position = new THREE.Vector3().lerpVectors(t.fromPosition, t.toPosition, ease)
    const quaternion = new THREE.Quaternion()
    quaternion.slerpQuaternions(t.fromQuaternion, t.toQuaternion, ease)
    new THREE.Matrix4().compose(position, quaternion, new THREE.Vector3(1,1,1))
      .multiply(t.localInverse).decompose(object.position, object.quaternion, object.scale)
    if (p >= 1) this.transition = null
  }
  // A deliberate drag takes control immediately; the next cue guides again.
  interrupt() { this.transition = null }
  recenter() {
    if (!this.currentSceneId || !this.destination) return false
    this.beginMove(this.destination, this.getTime() || 0, 1000)
    return true
  }
  stopSceneTracking() {
    this.currentSceneId = null
    this.transition = null
    this.destination = null
  }
  destroy() { this.stopSceneTracking(); this.sceneCameraPositions = {} }
}
