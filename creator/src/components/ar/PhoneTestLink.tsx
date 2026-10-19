import { useRef, useState } from 'react'
import { phoneTestUrl } from '../../utils/phoneTestUrl'

export function PhoneTestLink() {
  const [input, setInput] = useState('')
  const [result, setResult] = useState<{url:string; image:string} | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const revision = useRef(0)
  return <form className="phone-test-link" onSubmit={async event => {
    event.preventDefault()
    const current = ++revision.current
    setBusy(true); setResult(null); setMessage('')
    try {
      const url = phoneTestUrl(input)
      const { default: QRCode } = await import('qrcode')
      const image = await QRCode.toDataURL(url, {width:320, margin:4, errorCorrectionLevel:'M'})
      if (current === revision.current) setResult({url,image})
    } catch(error) {
      if (current === revision.current) setMessage(error instanceof Error ? error.message : 'The QR code could not be created. Try again.')
    } finally { if (current === revision.current) setBusy(false) }
  }}>
    <label htmlFor="phone-test-url">Your experience link</label>
    <input id="phone-test-url" className="form-input" type="url" placeholder="https://your-site.example/story/" required value={input} onChange={event=>{
      revision.current++; setInput(event.target.value); setResult(null); setMessage(''); setBusy(false)
    }}/>
    <button className="btn btn-sm" type="submit" disabled={busy || !input.trim()}>{busy ? 'Creating…' : 'Show QR code'}</button>
    {message && <p role="alert">{message}</p>}
    {result && <div className="phone-qr-result">
      <img src={result.image} width="200" height="200" alt="Scan to open the hosted experience on your phone"/>
      <p>Scan with your phone camera, then open in Safari or Chrome.</p>
      <a href={result.url} target="_blank" rel="noopener noreferrer">Open hosted experience</a>
      <a href={result.image} download="spatial-story-qr.png">Save QR image</a>
      <p className="phone-qr-address">{result.url}</p>
      <p>This opens the hosted version. Export and publish again after editing your story.</p>
    </div>}
    <p>The QR code opens your published test copy. It is generated on this device.</p>
  </form>
}
