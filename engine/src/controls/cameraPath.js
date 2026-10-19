// Shared deterministic camera sampling for the player and editor. Times are seconds.
export function cameraQuaternion(rotation = [0, 0, 0]) {
  const [x, y, z] = rotation.map((v) => v / 2)
  const c1 = Math.cos(x),
    c2 = Math.cos(y),
    c3 = Math.cos(z),
    s1 = Math.sin(x),
    s2 = Math.sin(y),
    s3 = Math.sin(z)
  return [
    s1 * c2 * c3 + c1 * s2 * s3,
    c1 * s2 * c3 - s1 * c2 * s3,
    c1 * c2 * s3 + s1 * s2 * c3,
    c1 * c2 * c3 - s1 * s2 * s3
  ]
}
function mix(a, b, t) {
  let dot = a.reduce((sum, v, i) => sum + v * b[i], 0)
  if (dot < 0) {
    b = b.map((v) => -v)
    dot = -dot
  }
  if (dot > 0.9995) {
    const q = a.map((v, i) => v + (b[i] - v) * t)
    const n = Math.hypot(...q)
    return q.map((v) => v / n)
  }
  const angle = Math.acos(Math.min(1, dot)),
    den = Math.sin(angle)
  return a.map(
    (v, i) => (v * Math.sin((1 - t) * angle) + b[i] * Math.sin(t * angle)) / den
  )
}
function blend(from, to, progress, easing) {
  const p = Math.max(0, Math.min(1, progress))
  const t =
    easing === 'cubic'
      ? p < 0.5
        ? 4 * p * p * p
        : 1 - Math.pow(-2 * p + 2, 3) / 2
      : easing === 'sine'
        ? -(Math.cos(Math.PI * p) - 1) / 2
        : p < 0.5
          ? 2 * p * p
          : 1 - Math.pow(-2 * p + 2, 2) / 2
  return {
    position: from.position.map((v, i) => v + (to.position[i] - v) * t),
    quaternion: mix(from.quaternion, to.quaternion, t)
  }
}
export function sampleCameraPath(keyframes, time, initial) {
  let pose = {
    position: [...initial.position],
    quaternion: initial.quaternion || cameraQuaternion(initial.rotation)
  }
  const ordered = [...keyframes].sort((a, b) => a.time - b.time)
  let transition = null
  const at = (t) =>
    transition
      ? blend(
          transition.from,
          transition.to,
          transition.duration <= 0
            ? 1
            : (t - transition.time) / transition.duration,
          transition.easing
        )
      : pose
  for (const k of ordered) {
    if (k.time > time) break
    pose = at(k.time)
    transition = {
      from: pose,
      to: { position: k.position, quaternion: cameraQuaternion(k.rotation) },
      time: k.time,
      duration: (k.duration ?? 2000) / 1000,
      easing: k.easing
    }
  }
  return at(time)
}
