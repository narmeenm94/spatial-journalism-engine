// XR8 observes canvas.width/height and updates its calibrated camera and renderer.
// CSS alone is insufficient: Threejs startup writes the default 300 x 150 size
// into the canvas style unless a full-window sizing module maintains it.
export function createARCanvasSizing({ canvas, container, window: win = globalThis.window }) {
  let videoWidth = 0, videoHeight = 0, attached = false
  const resize = () => {
    const width = container.clientWidth || win?.innerWidth || canvas.clientWidth || 1
    const height = container.clientHeight || win?.innerHeight || canvas.clientHeight || 1
    const ratio = Math.max(1, win?.devicePixelRatio || 1)
    const wide = width * ratio, tall = height * ratio
    // Match the original FullWindowCanvas approach: fill the display's aspect
    // ratio while bounding the drawing buffer to the camera's video resolution.
    const scale = videoWidth > 0 && videoHeight > 0
      ? Math.min(1, Math.max(videoWidth, videoHeight) / Math.max(wide, tall), Math.min(videoWidth, videoHeight) / Math.min(wide, tall))
      : 1
    const targetWidth = Math.max(1, Math.round(wide * scale))
    const targetHeight = Math.max(1, Math.round(tall * scale))
    if (canvas.width !== targetWidth) canvas.width = targetWidth
    if (canvas.height !== targetHeight) canvas.height = targetHeight
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.display = 'block'
  }
  const video = (detail = {}) => {
    if (detail.videoWidth > 0 && detail.videoHeight > 0) {
      videoWidth = detail.videoWidth; videoHeight = detail.videoHeight
    }
    resize()
  }
  const dispose = () => {
    win?.removeEventListener?.('resize', resize)
    win?.visualViewport?.removeEventListener('resize', resize)
    attached = false
  }
  return {
    resize, dispose,
    pipelineModule: () => ({
      name: 'spatial-canvas-sizing',
      onAttach: detail => {
        if (!attached) {
          win?.addEventListener?.('resize', resize)
          win?.visualViewport?.addEventListener('resize', resize)
          attached = true
        }
        video(detail)
      },
      onUpdate: resize,
      onVideoSizeChange: video,
      onDeviceOrientationChange: resize,
      onCanvasSizeChange: resize,
      onDetach: dispose
    })
  }
}
