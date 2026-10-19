import { phoneTestUrl } from './phoneTestUrl.ts'

export type NetlifyTeam = { slug: string; name: string }
export type NetlifySite = { id: string; name: string; ssl_url?: string }
export type NetlifyDeploy = { id: string; site_id: string; state: string; required?: string[]; deploy_ssl_url?: string }
const segment = (value: string) => {
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) throw new Error('Netlify returned an invalid identifier.')
  return encodeURIComponent(value)
}
const wait = (signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  signal.throwIfAborted()
  const cancel = () => { clearTimeout(timer); reject(signal.reason) }
  const timer = setTimeout(() => { signal.removeEventListener('abort', cancel); resolve() }, 1500)
  signal.addEventListener('abort', cancel, { once: true })
})

export function netlifyClient(token: string, transport: typeof fetch = fetch) {
  async function request<T>(path: string, signal: AbortSignal, method = 'GET', body?: string | Uint8Array): Promise<T> {
    signal.throwIfAborted()
    let response: Response
    try { response = await transport('https://api.netlify.com/api/v1' + path, {
      method, signal: AbortSignal.any([signal, AbortSignal.timeout(120000)]), redirect: 'error', credentials: 'omit',
      headers: { Authorization: 'Bearer ' + token, ...(body === undefined ? {} : { 'Content-Type': typeof body === 'string' ? 'application/json' : 'application/octet-stream' }) },
      body: typeof body === 'string' || body === undefined ? body : new Uint8Array(body).buffer
    }) } catch (error) {
      signal.throwIfAborted()
      if (error instanceof Error && error.name === 'TimeoutError') throw new Error('Netlify took too long to respond. Check your project in Netlify before retrying.')
      throw new Error('Could not reach Netlify. Check your connection and Netlify project before retrying. A request may already have reached the server.')
    }
    if (!response.ok) {
      if (response.status === 401) throw new Error('Your Netlify connection expired. Disconnect and connect again.')
      if (response.status === 403) throw new Error('Netlify did not allow this action. Check your team permissions and plan in Netlify.')
      if (response.status === 429) throw new Error('Netlify is busy. Wait a minute before trying again.')
      throw new Error('Netlify could not complete the request (' + response.status + '). Check the project in Netlify before retrying.')
    }
    return (response.status === 204 ? undefined : await response.json()) as T
  }
  return {
    async teams(signal: AbortSignal) {
      const teams: NetlifyTeam[] = []
      for (let page = 1; page <= 20; page++) {
        const batch = await request<NetlifyTeam[]>('/accounts?per_page=100&page=' + page, signal)
        if (!Array.isArray(batch)) throw new Error('Netlify did not return your teams. Reconnect and try again.')
        teams.push(...batch.filter(team => team.slug && team.name))
        if (batch.length < 100) return teams
      }
      throw new Error('Too many Netlify teams to list. Use the website ZIP option for this account.')
    },
    async createSite(team: string, signal: AbortSignal) {
      const site = await request<NetlifySite>('/' + segment(team) + '/sites', signal, 'POST', JSON.stringify({ name: 'spatial-story-' + crypto.randomUUID().slice(0, 12) }))
      segment(site.id)
      return site
    },
    async draft(site: NetlifySite, files: Record<string, Uint8Array>, signal: AbortSignal, progress: (message: string) => void, created: (deploy: NetlifyDeploy) => void) {
      if (!files['index.html'] || !files['story.json'] || !files['player/index.html']) throw new Error('The website package is incomplete.')
      const digests: Record<string, string> = Object.create(null)
      const byHash = new Map<string, {path: string; data: Uint8Array}>()
      for (const [path, data] of Object.entries(files)) {
        signal.throwIfAborted()
        if (!/^(?:[a-zA-Z0-9_.-]+\/)*[a-zA-Z0-9_.-]+$/.test(path) || path.split('/').some(p => p === '.' || p === '..')) throw new Error('Invalid website file path.')
        const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-1', new Uint8Array(data))), n => n.toString(16).padStart(2, '0')).join('')
        digests['/' + path] = digest
        byHash.set(digest, { path, data })
      }
      progress('Creating your test copy…')
      const deploy = await request<NetlifyDeploy>('/sites/' + segment(site.id) + '/deploys', signal, 'POST', JSON.stringify({ files: digests, draft: true }))
      segment(deploy.id)
      if (deploy.site_id !== site.id || !Array.isArray(deploy.required)) throw new Error('Netlify returned an incomplete deployment. Check your project in Netlify.')
      created(deploy)
      const required = [...new Set(deploy.required)]
      if (required.some(hash => !byHash.has(hash))) throw new Error('Netlify requested an unknown file. Please create a new test copy.')
      const uploads = new AbortController()
      const uploadSignal = AbortSignal.any([signal, uploads.signal])
      let cursor = 0, complete = 0
      const worker = async () => {
        while (cursor < required.length) {
          uploadSignal.throwIfAborted()
          const file = byHash.get(required[cursor++])!
          await request('/deploys/' + segment(deploy.id) + '/files/' + file.path.split('/').map(encodeURIComponent).join('/'), uploadSignal, 'PUT', file.data)
          progress('Uploading files ' + (++complete) + ' / ' + required.length + '…')
        }
      }
      try { await Promise.all([worker(), worker()]) }
      catch (error) { uploads.abort(); throw error }
      return deploy
    },
    async ready(siteId: string, deployId: string, signal: AbortSignal) {
      const deadline = Date.now() + 300000
      while (Date.now() < deadline) {
        const deploy = await request<NetlifyDeploy>('/deploys/' + segment(deployId), signal)
        if (deploy.site_id !== siteId || deploy.id !== deployId) throw new Error('Netlify returned a different deployment. Nothing was published.')
        if (deploy.state === 'ready') return { ...deploy, deploy_ssl_url: phoneTestUrl(deploy.deploy_ssl_url || '') }
        if (['error', 'failed', 'canceled'].includes(deploy.state)) throw new Error('Netlify could not prepare this version. Create a new test link to retry.')
        await wait(signal)
      }
      throw new Error('Netlify is still preparing your test. Choose Check test status to continue.')
    },
    async publish(siteId: string, deployId: string, signal: AbortSignal) {
      // Promote only the tested, ready draft. Never upload or select another version here.
      const deploy = await request<NetlifyDeploy>('/deploys/' + segment(deployId), signal)
      if (deploy.site_id !== siteId || deploy.id !== deployId || deploy.state !== 'ready') throw new Error('This test version is not ready to publish.')
      await request('/sites/' + segment(siteId) + '/deploys/' + segment(deployId) + '/restore', signal, 'POST')
      const site = await request<NetlifySite>('/sites/' + segment(siteId), signal)
      if (site.id !== siteId) throw new Error('Check the published address in Netlify.')
      return phoneTestUrl(site.ssl_url || '')
    }
  }
}
