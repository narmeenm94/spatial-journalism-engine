export interface DeviceIdentity {
  userAgent?: string
  platform?: string
  maxTouchPoints?: number
  userAgentData?: { platform?: string; mobile?: boolean }
}
export function detectDevice(device?: DeviceIdentity): {
  type: 'desktop' | 'phone' | 'tablet'
  os: 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown'
  mobile: boolean
}
export function isMobileDevice(device?: DeviceIdentity): boolean
export function resolveExperienceMode(requested?: string, modes?: string[], device?: DeviceIdentity): '3d' | 'ar' | 'vr'
