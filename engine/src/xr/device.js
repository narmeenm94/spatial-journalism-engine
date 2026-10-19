// Device identity chooses a sensible launch path. Camera, motion and XR
// capabilities are still checked when that path starts.
export function detectDevice(device = navigator) {
  const ua = device.userAgent || ''
  const platform = device.userAgentData?.platform || device.platform || ''
  const ipad = /iPad/i.test(ua) ||
    (/Mac/i.test(platform) && device.maxTouchPoints > 1)
  const ios = ipad || /iPhone|iPod/i.test(ua)
  const android = /Android/i.test(ua + ' ' + platform)
  const os = ios ? 'ios' : android ? 'android' : /Win/i.test(ua + ' ' + platform) ? 'windows' :
    /Mac/i.test(ua + ' ' + platform) ? 'macos' : /Linux/i.test(ua + ' ' + platform) ? 'linux' : 'unknown'
  const type = ipad ? 'tablet' : ios ? 'phone' : android ?
    (/Mobile/i.test(ua) || device.userAgentData?.mobile === true ? 'phone' : 'tablet') : 'desktop'
  return { type, os, mobile: type !== 'desktop' }
}

export function isMobileDevice(device = navigator) {
  return detectDevice(device).mobile
}

// A Phone AR preview link must also be safe to open on a desktop. Do not
// initialize the phone tracker or request its permissions on desktop.
export function resolveExperienceMode(requested, modes = ['3d'], device = navigator) {
  const mobile = isMobileDevice(device)
  if (requested === 'ar') return mobile ? 'ar' : '3d'
  if (requested === '3d' || requested === 'vr') return requested
  if (mobile && modes.includes('ar')) return 'ar'
  if (modes.length === 1 && modes[0] === 'vr') return 'vr'
  return '3d'
}
