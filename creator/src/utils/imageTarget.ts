// Planar target geometry follows the public 8th Wall image-target format:
// https://github.com/8thwall/8thwall/tree/main/apps/image-target-cli
export function targetCrop(width: number, height: number) {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  )
    throw new Error('The image has invalid dimensions.')
  const cropWidth = Math.min(width, Math.round(height * 0.75))
  const cropHeight = Math.min(height, Math.round(width / 0.75))
  if (cropWidth < 240 || cropHeight < 320)
    throw new Error(
      'Choose a larger image: the portrait crop must be at least 240 × 320 pixels.'
    )
  return {
    left: Math.round((width - cropWidth) / 2),
    top: Math.round((height - cropHeight) / 2),
    width: cropWidth,
    height: cropHeight,
    originalWidth: width,
    originalHeight: height,
    isRotated: false
  }
}
export async function prepareImageTarget(file: File) {
  const bitmap = await createImageBitmap(file)
  try {
    const properties = targetCrop(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = 480
    canvas.height = 640
    const context = canvas.getContext('2d')
    if (!context)
      throw new Error('This browser cannot prepare an image target.')
    context.drawImage(
      bitmap,
      properties.left,
      properties.top,
      properties.width,
      properties.height,
      0,
      0,
      480,
      640
    )
    const pixels = context.getImageData(0, 0, 480, 640)
    for (let i = 0; i < pixels.data.length; i += 4) {
      const gray = Math.round(
        0.2126 * pixels.data[i] +
          0.7152 * pixels.data[i + 1] +
          0.0722 * pixels.data[i + 2]
      )
      pixels.data[i] = gray
      pixels.data[i + 1] = gray
      pixels.data[i + 2] = gray
      pixels.data[i + 3] = 255
    }
    context.putImageData(pixels, 0, 0)
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(new Error('Could not save the target image.')),
        'image/jpeg',
        0.94
      )
    )
    const name =
      (file.name
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-z0-9]+/gi, '-')
        .slice(0, 45) || 'target') +
      '-' +
      crypto.randomUUID().slice(0, 8)
    const imagePath = 'image-targets/' + name + '.jpg'
    return {
      target: { name, type: 'PLANAR', properties, imagePath },
      file: new File([blob], name + '.jpg', { type: 'image/jpeg' })
    }
  } finally {
    bitmap.close()
  }
}
