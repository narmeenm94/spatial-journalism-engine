// MIT framework and the original project's separately licensed SLAM chunk.
// Nothing is fetched until the reader starts a camera experience.
export function loadEighthWall({
  imageTracking = false,
  document: doc = document,
  window: win = window
} = {}) {
  return new Promise((resolve, reject) => {
    if (win.XR8) return resolve(win.XR8)
    const script = doc.createElement('script')
    script.src = new URL('./vendor/8thwall/xr.js', doc.baseURI).href
    script.async = true
    script.setAttribute(
      'data-preload-chunks',
      imageTracking
        ? 'slam'
        : 'slam: ' +
            new URL('./vendor/8thwall-slam/xr-slam.js', doc.baseURI).href
    )
    const finish = (error) => {
      clearTimeout(timer)
      win.removeEventListener('xrloaded', ready)
      script.onerror = null
      if (error) {
        script.remove()
        reject(error)
      } else resolve(win.XR8)
    }
    const ready = () =>
      finish(win.XR8 ? null : new Error('The AR engine did not initialise.'))
    const timer = setTimeout(
      () =>
        finish(
          new Error(
            'The AR engine took too long to load. Check your connection and try again.'
          )
        ),
      30000
    )
    script.onerror = () =>
      finish(
        new Error(
          'The AR engine could not load. Check that the player includes its vendor files.'
        )
      )
    win.addEventListener('xrloaded', ready, { once: true })
    doc.head.appendChild(script)
  })
}

export function createEighthWallScene(
  XR8,
  {
    container,
    imageTargets = [],
    disableWorldTracking = false,
    onUpdate,
    onTracking,
    onImage,
    onError,
    startupTimeout = 30000
  }
) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    canvas.id = 'sj-camera-feed'
    canvas.style.cssText =
      'position:absolute;inset:0;width:100%;height:100%;touch-action:none'
    container.prepend(canvas)
    XR8.XrController.configure({
      disableWorldTracking: disableWorldTracking || imageTargets.length > 0,
      scale: disableWorldTracking ? 'responsive' : 'absolute',
      imageTargetData: imageTargets
    })
    let started = false
    let failed = false
    let timer
    const fail = (error) => {
      if (failed) return
      failed = true
      clearTimeout(timer)
      const message =
        error?.reason || error?.message || String(error || 'Camera unavailable')
      if (!started) {
        XR8.stop()
        canvas.remove()
        reject(new Error(message))
      } else onError?.(new Error(message))
    }
    timer = setTimeout(
      () =>
        fail(
          new Error(
            'The camera did not start. Allow camera access, or open this story in a separate browser window and try again.'
          )
        ),
      startupTimeout
    )
    XR8.addCameraPipelineModules([
      XR8.GlTextureRenderer.pipelineModule(),
      XR8.Threejs.pipelineModule(),
      XR8.XrController.pipelineModule(),
      {
        name: 'spatial-journalism',
        onStart: () => {
          if (failed) {
            XR8.stop()
            return
          }
          clearTimeout(timer)
          console.info('[AR] Camera pipeline ready')
          started = true
          resolve({ ...XR8.Threejs.xrScene(), canvas })
        },
        onUpdate: () => onUpdate?.(),
        onException: fail,
        onCameraStatusChange: ({ status }) => {
          console.info('[AR] Camera status:', status)
          if (status === 'failed')
            fail(
              new Error(
                'Camera access failed. Allow camera access in your browser, then reload.'
              )
            )
        },
        listeners: [
          {
            event: 'reality.trackingstatus',
            process: ({ detail }) => onTracking?.(detail)
          },
          { event: 'coaching-overlay.show', process: () => onTracking?.({ status: 'LIMITED' }) },
          { event: 'coaching-overlay.hide', process: () => onTracking?.({ status: 'NORMAL' }) },
          ...['found', 'updated', 'lost'].map((state) => ({
            event: 'reality.image' + state,
            process: ({ detail }) => onImage?.(state, detail)
          }))
        ]
      }
    ])
    try {
      const result = XR8.run({
        canvas,
        allowedDevices: XR8.XrConfig.device().ANY
      })
      if (result?.catch) result.catch(fail)
    } catch (error) {
      fail(error)
    }
  })
}
