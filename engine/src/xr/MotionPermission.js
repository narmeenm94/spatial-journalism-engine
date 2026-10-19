// iOS requires these requests to begin in a reader's button gesture, before
// async downloads or an intro video's ended event consume that gesture.
export function createMotionPermission(win = window) {
  let granted = false, pending = null
  const providers = [win.DeviceMotionEvent, win.DeviceOrientationEvent]
    .filter(provider => typeof provider?.requestPermission === 'function')
  return {
    needsGesture: () => providers.length > 0 && !granted,
    request() {
      if (granted || !providers.length) return Promise.resolve()
      if (pending) return pending
      try {
        const requests = providers.map(provider => provider.requestPermission())
        pending = Promise.all(requests).then(results => {
          if (results.some(result => result !== 'granted'))
            throw new Error('Allow motion and orientation access to look around in AR. Check this site’s Safari permissions, then try again, or choose Web 3D.')
          granted = true
        }).catch(error => {
          throw new Error(error?.message || 'Motion access needs a tap on Enter experience. Please try again.')
        }).finally(() => { pending = null })
        return pending
      } catch (error) { return Promise.reject(error) }
    }
  }
}
