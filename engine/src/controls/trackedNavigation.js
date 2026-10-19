import { detectDevice } from '../xr/device.js'

// Full-space navigation follows the original experience's device policy.
// Surface and image placement do not use this rig.
export function trackedNavigation(camera = {}, { guided = false, device = detectDevice(), isUsingApp = false } = {}) {
  const iosApp = device.os === 'ios' && isUsingApp
  const orientationOnly = guided && camera.guidedTracking !== 'world' && !iosApp
  const heights = { android: 1.25, ios: 0.5, fallback: 0.5, guided: 1.5, ...camera.trackedHeight }
  return {
    orientationOnly,
    // The original host-app mode uses a fixed eye height without local Y.
    fixedHeight: iosApp,
    guided: orientationOnly || (guided && iosApp),
    heights,
    os: device.os,
    guidedPosition: [camera.initialPosition?.[0] ?? 1.5, 0, camera.initialPosition?.[2] ?? -1.5]
  }
}
