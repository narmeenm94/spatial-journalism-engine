import { useEffect, useRef, useState } from 'react'
import { useStore } from '../../state/store'
import { websiteFiles } from '../../utils/websiteExport'
import { connectNetlify } from '../../utils/netlifyAuth'
import { netlifyClient } from '../../utils/netlify'
import type { NetlifyDeploy, NetlifySite, NetlifyTeam } from '../../utils/netlify'
import { ExperienceQRCode } from './ExperienceQRCode'
import { Icon } from '../Icon'

const configuredClientId = String(import.meta.env.VITE_NETLIFY_CLIENT_ID || '').trim()
export function NetlifyPublisher() {
  const [clientId, setClientId] = useState(configuredClientId)
  const [teams, setTeams] = useState<NetlifyTeam[]>([])
  const [team, setTeam] = useState('')
  const [site, setSite] = useState<NetlifySite | null>(null)
  const [pending, setPending] = useState<NetlifyDeploy | null>(null)
  const [ready, setReady] = useState<NetlifyDeploy | null>(null)
  const [published, setPublished] = useState('')
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const client = useRef<ReturnType<typeof netlifyClient> | null>(null)
  const operation = useRef<AbortController | null>(null)
  const callback = new URL('netlify-callback.html', document.baseURI).href
  useEffect(() => () => { operation.current?.abort(); client.current = null }, [])

  async function run(label: string, action: (signal: AbortSignal) => Promise<void>) {
    if (operation.current) return
    const controller = new AbortController()
    operation.current = controller
    setBusy(label); setError(''); setMessage('')
    try { await action(controller.signal) }
    catch (failure) {
      if (controller.signal.aborted) setMessage('Stopped. Files already sent may remain in your Netlify project.')
      else setError(failure instanceof Error ? failure.message : 'Could not complete this step. Try again.')
    } finally {
      if (operation.current === controller) { operation.current = null; setBusy('') }
    }
  }
  async function check(currentSite: NetlifySite, deploy: NetlifyDeploy, signal: AbortSignal) {
    setMessage('Netlify is preparing your link…')
    const result = await client.current!.ready(currentSite.id, deploy.id, signal)
    signal.throwIfAborted()
    setReady(result); setMessage('Your test is ready. Scan the QR with your phone camera.')
  }

  return <div className="netlify-publisher">
    <div className="netlify-publish-intro"><Icon name="phone" size={25} /><div><strong>Try your story on your phone</strong><p>Connect once. Create a link. Scan and explore.</p></div></div>
    <div className="netlify-milestones" aria-label="Publishing progress">
      <span className={teams.length ? 'done' : 'current'}>1 Connect</span>
      <span className={ready ? 'done' : teams.length ? 'current' : ''}>2 Test</span>
      <span className={published ? 'done' : ready ? 'current' : ''}>3 Publish</span>
    </div>
    {!teams.length ? <>
      <p>Netlify hosts your experience and gives it a web address. Sign in or create an account in the window that opens.</p>
      <button className="btn btn-primary" disabled={!!busy || !clientId.trim()} onClick={() => run('Connecting…', async signal => {
        const token = await connectNetlify(clientId, callback, signal)
        const connection = netlifyClient(token)
        const accounts = await connection.teams(signal)
        signal.throwIfAborted()
        if (!accounts.length) throw new Error('Create a team in Netlify, then connect again.')
        client.current = connection; setTeams(accounts); setTeam(accounts[0].slug)
        setMessage('Connected. Your story is ready to upload when you are.')
      })}>Connect Netlify ↗</button>
      {!configuredClientId && <details className="netlify-setup">
        <summary>Enable Netlify for this studio</summary>
        <p>The studio owner registers an OAuth application once. Readers and storytellers will then only need to sign in.</p>
        <a href="https://app.netlify.com/user/applications" target="_blank" rel="noopener noreferrer">Open Netlify applications ↗</a>
        <p>Register a new OAuth application with this redirect address:</p>
        <code className="phone-qr-address">{callback}</code>
        <label htmlFor="netlify-client-id">Application Client ID</label>
        <input id="netlify-client-id" className="form-input" value={clientId} onChange={e => setClientId(e.target.value)} placeholder="Public Client ID from Netlify" disabled={!!busy} />
        <p>Use the Client ID, never the Client Secret. This setting lasts while Preview is open. The studio owner can configure it permanently for everyone.</p>
      </details>}
    </> : <>
      <div className="netlify-account"><span>Connected to Netlify</span><button className="btn btn-sm" disabled={!!busy} onClick={() => {
        client.current = null; setTeams([]); setTeam(''); setSite(null); setPending(null); setReady(null); setPublished(''); setMessage('Disconnected from this preview. Your hosted versions remain in Netlify.'); setError('')
      }}>Disconnect</button></div>
      {teams.length > 1 && <label>Netlify team<select className="form-select" value={team} disabled={!!busy || !!site} onChange={e => setTeam(e.target.value)}>{teams.map(account => <option key={account.slug} value={account.slug}>{account.name}</option>)}</select></label>}
      <p>{site ? 'Updates go to ' + site.name + '.' : 'Creates a new project in ' + (teams.find(item => item.slug === team)?.name || team) + '.'} Your story and all its media will upload to Netlify. Hosting is subject to your Netlify plan.</p>
      <button className="btn btn-primary" disabled={!!busy} onClick={() => run('Creating test link…', async signal => {
        setReady(null); setPending(null); setPublished('')
        const state = useStore.getState()
        const files = await websiteFiles(state.story, state.assetFiles, new URL(state.assetsBaseUrl || './', window.location.href).href, new URL('./player/', window.location.href).href, setMessage, signal)
        signal.throwIfAborted()
        const target = site || await client.current!.createSite(team, signal)
        setSite(target)
        const deploy = await client.current!.draft(target, files, signal, setMessage, () => {})
        setPending(deploy)
        await check(target, deploy, signal)
      })}>{ready || pending ? 'Create updated test link' : 'Create test link'}</button>
      {pending && !ready && site && <button className="btn btn-sm" disabled={!!busy} onClick={() => run('Checking test…', signal => check(site, pending, signal))}>Check test status</button>}
      <p>A test link can be viewed by anyone who has it unless your Netlify access settings restrict it.</p>
      {ready?.deploy_ssl_url && <section className="netlify-ready" aria-label="Ready to test">
        <strong>Your test link</strong>
        <ExperienceQRCode key={ready.id} url={ready.deploy_ssl_url} />
        <details><summary>What to check on your phone</summary><p>Allow camera and motion. Try Guided and Explore, walk around, recenter, use chapter buttons, and check sound and captions. Test on iPhone and Android before publishing.</p></details>
        <p>Happy with this version? Publish it to your project's main address. Later studio edits need a new test link first.</p>
        <button className="btn btn-primary" disabled={!!busy || !!published} onClick={() => run('Publishing…', async signal => {
          const address = await client.current!.publish(site!.id, ready.id, signal)
          signal.throwIfAborted()
          setPublished(address); setMessage('Published. Your main address now opens this tested version.')
        })}>{published ? 'Published' : 'Publish this tested version'}</button>
      </section>}
      {published && <section className="netlify-ready" aria-label="Published experience"><strong>Your public address</strong><ExperienceQRCode url={published} /></section>}
      {site && <a href={'https://app.netlify.com/sites/' + encodeURIComponent(site.name) + '/deploys'} target="_blank" rel="noopener noreferrer">Manage hosting in Netlify ↗</a>}
    </>}
    {busy && <div className="netlify-account"><span>{busy}</span><button className="btn btn-sm" onClick={() => operation.current?.abort()}>Stop</button></div>}
    {message && <p role="status">{message}</p>}
    {error && <p role="alert" className="netlify-error">{error}</p>}
    <small>Keep this preview open while uploading. Closing it disconnects Netlify. Export story remains your single JSON backup.</small>
  </div>
}
