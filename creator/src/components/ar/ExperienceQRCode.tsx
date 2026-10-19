import { useEffect, useState } from 'react'
import { phoneTestUrl } from '../../utils/phoneTestUrl'

export function ExperienceQRCode({ url }: { url: string }) {
  const [image, setImage] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    setImage(''); setError('')
    import('qrcode').then(({ default: QRCode }) => QRCode.toDataURL(phoneTestUrl(url), { width: 320, margin: 4, errorCorrectionLevel: 'M' }))
      .then(value => { if (active) setImage(value) })
      .catch(() => { if (active) setError('The QR could not be created. Use the experience link below.') })
    return () => { active = false }
  }, [url])
  return <div className="phone-qr-result">
    {image && <img src={image} width="200" height="200" alt="Scan to open this version on your phone" />}
    {error && <p role="alert">{error}</p>}
    <a href={url} target="_blank" rel="noopener noreferrer">Open experience ↗</a>
    {image && <a href={image} download="spatial-story-qr.png">Save QR image</a>}
    <p className="phone-qr-address">{url}</p>
  </div>
}
