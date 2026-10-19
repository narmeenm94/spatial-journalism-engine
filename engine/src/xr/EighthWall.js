import { createARCanvasSizing } from './CanvasSizing.js'

// MIT framework and the original project's separately licensed SLAM chunk.
// Nothing is fetched until the reader starts a camera experience.
export function loadEighthWall({
  imageTracking = false,
  runtime = 'standard',
  document: doc = document,
  window: win = window
} = {}) {
  return new Promise((resolve, reject) => {
    if (win.XR8) {
      if (win.XR8.XrController) return resolve(win.XR8)
      return reject(new Error('The AR tracking engine is unavailable. Reload the player to retry, or continue in Web 3D.'))
    }
    const script = doc.createElement('script')
    // Keep the exported framework paired with its original SLAM chunk.
    const framework = !imageTracking && runtime === 'exported' ? '8thwall-slam' : '8thwall'
    script.src = new URL('./vendor/' + framework + '/xr.js', doc.baseURI).href
    script.async = true
    script.setAttribute(
      'data-preload-chunks',
      imageTracking || framework === '8thwall-slam'
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
      finish(win.XR8?.XrController ? null : new Error('The AR tracking engine did not initialise. Check the player vendor files and reload.'))
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
    updateBeforeRender = false,
    onRender,
    onResize,
    initialPose,
    coachingOverlay,
    language = 'en',
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
    const sizing = createARCanvasSizing({ canvas, container })
    sizing.resize()
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
      console.error('[AR] Camera pipeline failed:', error)
      const message =
        error?.reason || error?.message || String(error || 'Camera unavailable')
      if (!started) {
        sizing.dispose()
        try { XR8.stop() } catch (stopError) { console.warn('[AR] Camera cleanup failed:', stopError) }
        canvas.remove()
        reject(error instanceof Error ? error : new Error(message))
      } else onError?.(error instanceof Error ? error : new Error(message))
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
    const three = XR8.Threejs.pipelineModule()
    // The exported tracker can announce its camera configuration while app
    // resources load, before Threejs.onStart creates the camera. Preserve that
    // configuration and apply it as soon as the renderer is attached.
    const pendingCameraEvents = []
    const flushCameraEvents = () => {
      if (!XR8.Threejs.xrScene()?.camera) return
      for (const [listener, event] of pendingCameraEvents.splice(0)) listener.process(event)
    }
    const coach = !disableWorldTracking && !imageTargets.length && coachingOverlay
    if (coach) coach.configure({ promptText: language === 'fi' ? 'Liikuta laitetta eteen ja taakse' : 'Move device forward and back' })
    XR8.addCameraPipelineModules([
      sizing.pipelineModule(),
      XR8.GlTextureRenderer.pipelineModule(),
      {
        ...three,
        onBeforeRun: (...args) => {
          pendingCameraEvents.length = 0
          return three.onBeforeRun?.(...args)
        },
        onStart: (...args) => {
          three.onStart?.(...args)
          flushCameraEvents()
        },
        onAttach: (...args) => {
          three.onAttach?.(...args)
          flushCameraEvents()
        },
        onDetach: (...args) => {
          pendingCameraEvents.length = 0
          return three.onDetach?.(...args)
        },
        onCanvasSizeChange: detail => {
          three.onCanvasSizeChange?.(detail)
          onResize?.(detail.canvasWidth, detail.canvasHeight)
        },
        listeners: three.listeners?.map(listener => listener.event.endsWith('.cameraconfigured') ? {
          ...listener,
          process: event => {
            if (!XR8.Threejs.xrScene()?.camera) pendingCameraEvents.push([listener, event])
            else listener.process(event)
          }
        } : listener),
        onRender: (...args) => {
          // XR8 flushes coaching events after the update callbacks. The original
          // immersive rig runs in the render phase so it rebases from the last
          // displayed pose, before a reset sensor pose can replace that cache.
          if (updateBeforeRender) onUpdate?.()
          // Full-space stories can render their outline composer inside XR8's
          // frame loop. Surface/image AR retains the normal camera composite.
          if (onRender?.() !== true) three.onRender?.(...args)
        }
      },
      XR8.XrController.pipelineModule(),
      ...(coach ? [coach.pipelineModule()] : []),
      {
        name: 'spatial-journalism',
        onStart: () => {
          if (failed) {
            XR8.stop()
            return
          }
          clearTimeout(timer)
          const xrScene = XR8.Threejs.xrScene()
          if (initialPose) {
            // Establish the same tracker coordinate system as the authored
            // starting view, before parenting its camera to the navigation rig.
            xrScene.camera.position.fromArray(initialPose.position)
            xrScene.camera.rotation.set(...initialPose.rotation)
            XR8.XrController.updateCameraProjectionMatrix({
              origin: xrScene.camera.position.clone(),
              facing: xrScene.camera.quaternion.clone()
            })
          }
          console.info('[AR] Camera pipeline ready')
          started = true
          resolve({ ...xrScene, canvas })
        },
        onUpdate: () => { if (!updateBeforeRender) onUpdate?.() },
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
          { event: 'coaching-overlay.show', process: () => onTracking?.({ status: 'LIMITED', source: 'coaching' }) },
          { event: 'coaching-overlay.hide', process: () => onTracking?.({ status: 'NORMAL', source: 'coaching' }) },
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

// The exported coaching overlay is self-contained and requested only for AR.
export function loadCoachingOverlay({ document: doc = document, window: win = window } = {}) {
  if (win.CoachingOverlay) return Promise.resolve(win.CoachingOverlay)
  return new Promise((resolve, reject) => {
    const script = doc.createElement('script')
    let settled = false
    const finish = (error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      script.onload = script.onerror = null
      if (error) { script.remove(); reject(error) }
      else resolve(win.CoachingOverlay)
    }
    const timer = setTimeout(() => finish(new Error('AR guidance did not load. Check your connection and retry.')), 30000)
    script.src = new URL('./vendor/coaching-overlay.js', doc.baseURI).href
    script.onload = () => finish(win.CoachingOverlay ? null : new Error('AR guidance could not initialise.'))
    script.onerror = () => finish(new Error('AR guidance could not load. Re-export the complete player folder.'))
    doc.head.appendChild(script)
  })
}
