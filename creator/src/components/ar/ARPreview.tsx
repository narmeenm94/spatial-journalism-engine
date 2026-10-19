import { useEffect, useRef, useState } from 'react'
import { useStore } from '../../state/store'
import { fileDataURL } from '../../utils/export'
import { assertValidStory, storyDocument } from '../../utils/storyDocument'
import { Icon } from '../Icon'
import { exportWebsite } from '../../utils/websiteExport'
import { isMobileDevice } from '../../../../engine/src/xr/device.js'
import { PhoneTestLink } from './PhoneTestLink'
import { NetlifyPublisher } from './NetlifyPublisher'
export function ARPreview() {
  const [mode, setMode] = useState('3d'),
    [revision, setRevision] = useState(0),
    [status, setStatus] = useState('Preparing preview…')
  const [phoneTools, setPhoneTools] = useState(false)
  const [phoneStep, setPhoneStep] = useState(1)
  const [packing, setPacking] = useState(false)
  const [packageStatus, setPackageStatus] = useState('')
  const download = useRef<string | null>(null)
  useEffect(() => () => { if(download.current) URL.revokeObjectURL(download.current) }, [])
  const frame = useRef<HTMLIFrameElement>(null),
    popup = useRef<Window | null>(null)
  const base = new URL('./player/', window.location.href)
  const url =
    base.href +
    '?source=postMessage&mode=' +
    mode +
    '&parentOrigin=' +
    encodeURIComponent(window.location.origin) +
    '&revision=' +
    revision
  useEffect(() => {
    let cancelled = false
    const send = async (target: Window) => {
      try {
        setStatus('Loading story and media…')
        const s = useStore.getState(),
          doc = storyDocument(s.story)
        doc.embeddedAssets = { ...doc.embeddedAssets }
        for (const [path, file] of Object.entries(s.assetFiles))
          doc.embeddedAssets[path] = await fileDataURL(file)
        assertValidStory(doc)
        if (cancelled) return
        target.postMessage(
          {
            type: 'loadStory',
            story: doc,
            storyBaseUrl: new URL(s.assetsBaseUrl || './', window.location.href)
              .href
          },
          window.location.origin
        )
        setStatus('Opening story…')
      } catch (e) {
        setStatus(
          'Preview could not load: ' +
            (e instanceof Error ? e.message : String(e))
        )
      }
    }
    const receive = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        ![frame.current?.contentWindow, popup.current].includes(
          event.source as Window
        )
      )
        return
      if (event.data?.type === 'engineReady') send(event.source as Window)
      if (event.data?.type === 'engineLoaded') setStatus(mode === 'ar' && !isMobileDevice()
        ? 'Desktop detected · previewing in Web 3D. Use Test on your phone for AR.'
        : 'Story ready · use the player below')
      if (event.data?.type === 'engineError')
        setStatus('Preview error: ' + event.data.message)
    }
    window.addEventListener('message', receive)
    const timer = setTimeout(
      () =>
        setStatus((s) =>
          s.startsWith('Preparing')
            ? 'Player has not connected. Build the player with npm run build:studio, then retry.'
            : s
        ),
      10000
    )
    return () => {
      cancelled = true
      clearTimeout(timer)
      window.removeEventListener('message', receive)
    }
  }, [mode, revision])
  return (
    <div className="preview-content">
      <div className="preview-controls">
        <div className="segmented">
          {[
            ['3d', 'Web 3D'],
            ['ar', 'Phone AR'],
            ['vr', 'Headset VR']
          ].map(([id, label]) => (
            <button
              key={id}
              className={mode === id ? 'active' : ''}
              onClick={() => {
                setStatus('Preparing preview…')
                setMode(id)
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          className="btn btn-sm"
          onClick={() => {
            setStatus('Preparing preview…')
            setRevision((r) => r + 1)
          }}
        >
          <Icon name="rotate" size={14} />
          Refresh story
        </button>
        <button
          className="btn btn-sm"
          onClick={() => {
            popup.current = window.open(
              url,
              'spatial-preview',
              'width=1100,height=800'
            )
            if (!popup.current)
              setStatus(
                'The new window was blocked. Allow pop-ups for this studio, or export your JSON and open it in the standalone player.'
              )
          }}
        >
          Open in new window
        </button>
        <button className="btn btn-sm" aria-expanded={phoneTools} aria-controls="phone-test-tools" onClick={()=>setPhoneTools(value=>!value)}>
          <Icon name="phone" size={16}/> Test on your phone
        </button>
      </div>
      <section hidden={!phoneTools} className="phone-test-tools" id="phone-test-tools" aria-label="Test on your phone">
        <NetlifyPublisher />
        <details className="phone-manual-publish"><summary>Download a website or use another host</summary>
        <nav className="phone-publish-steps" aria-label="Phone publishing steps">{['Prepare','Get a link','Scan'].map((label,index)=><button key={label} aria-current={phoneStep===index+1?'step':undefined} onClick={()=>setPhoneStep(index+1)}><span>{index+1}</span>{label}</button>)}</nav>
        <ol>
          <li hidden={phoneStep!==1}><div><strong>Prepare your story</strong><p>Download the website ZIP. Right-click it and choose Extract All on Windows, or double-click it on Mac.</p>
            <button className="btn btn-primary btn-sm" disabled={packing} onClick={async()=>{
              if(packing)return
              setPacking(true)
              try {
                const state=useStore.getState()
                const blob=await exportWebsite(state.story,state.assetFiles,new URL(state.assetsBaseUrl||'./',window.location.href).href,base.href,setPackageStatus)
                if(download.current)URL.revokeObjectURL(download.current)
                download.current=URL.createObjectURL(blob)
                const anchor=document.createElement('a');anchor.href=download.current;anchor.download='spatial-story-website.zip';anchor.click()
                setPackageStatus('Website ready. Extract the ZIP and publish the full folder over HTTPS. Your studio story is unchanged.')
              } catch(error) {setPackageStatus(error instanceof Error?error.message:String(error))}
              finally {setPacking(false)}
            }}><Icon name="download" size={16}/>{packing?'Preparing…':'Download website ZIP'}</button>
            <button className="btn btn-sm" onClick={()=>setPhoneStep(2)}>Next: get a link →</button>
          </div></li>
          <li hidden={phoneStep!==2}><div><strong>Get a link with Netlify</strong><p>Sign in to Netlify, then drop the extracted folder onto its upload area. Netlify puts it online and gives you an address ending in .netlify.app.</p>
            <a className="btn btn-sm" href="https://app.netlify.com/drop" target="_blank" rel="noopener noreferrer">Open Netlify Drop ↗</a>
            <p>Dropping the folder uploads your story and media. Check the site's sharing settings before sharing unpublished reporting.</p>
            <details><summary>Large stories or another host</summary><p>Netlify recommends its upload tool for smaller sites; large films and 3D scans can stall. You can also publish the extracted website with GitHub Pages or your newsroom's host. Use that site's HTTPS link in the next step.</p></details>
            <button className="btn btn-primary btn-sm" onClick={()=>setPhoneStep(3)}>I have my link →</button>
          </div></li>
          <li hidden={phoneStep!==3}><div><strong>Scan and explore</strong><p>Paste the Preview URL from Netlify below. Scan with your phone, allow camera and motion, then try Guided and Explore.</p><PhoneTestLink/></div></li>
        </ol>
        {phoneStep===1 && <p className="phone-package-status" role="status">{packageStatus || 'Keep Export story for your single-file JSON backup.'}</p>}
        </details>
      </section>
      <p className="preview-status" role="status">
        {status}
      </p>
      <iframe
        ref={frame}
        key={url}
        src={url}
        title="Story player"
        allow="camera; gyroscope; accelerometer; xr-spatial-tracking; autoplay; fullscreen"
        allowFullScreen
      />
      <p className="preview-footnote">
        {mode === '3d'
          ? 'Drag to look around. Use the player controls to move between chapters.'
          : mode === 'ar'
            ? 'Phones and tablets use AR; desktop uses Web 3D. Use Test on your phone for an HTTPS website package. Choose tracking in Project & AR settings.'
            : 'A supported headset browser is required. Enter VR starts a native WebXR session.'}
      </p>
    </div>
  )
}
