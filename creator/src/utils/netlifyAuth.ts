// OAuth credentials live only in memory. No token is part of the story document.
export function acceptsNetlifyReply(event: MessageEvent, popup: Window, origin: string, state: string) {
  return event.origin === origin && event.source === popup &&
    event.data?.type === 'spatial-netlify-auth' && event.data.state === state
}

export function connectNetlify(clientId: string, callback: string, signal: AbortSignal, host: Window = window): Promise<string> {
  signal.throwIfAborted()
  if (!clientId.trim()) return Promise.reject(new Error('The studio owner needs to enable the Netlify connection first.'))
  if (new URL(callback).origin !== host.location.origin) return Promise.reject(new Error('The Netlify callback must belong to this studio.'))
  const state = crypto.randomUUID()
  const url = new URL('https://app.netlify.com/authorize')
  url.search = new URLSearchParams({ client_id: clientId, response_type: 'token', redirect_uri: callback, state }).toString()
  const popup = host.open(url.href, 'spatial-netlify-' + state, 'popup,width=620,height=760')
  if (!popup) return Promise.reject(new Error('Allow pop-ups for the studio, then choose Connect Netlify again.'))
  return new Promise((resolve, reject) => {
    const finish = (error?: Error, token?: string) => {
      clearInterval(closed); clearTimeout(timeout)
      host.removeEventListener('message', receive)
      signal.removeEventListener('abort', cancel)
      popup.close()
      if (error) reject(error)
      else resolve(token!)
    }
    const receive = (event: MessageEvent) => {
      if (!acceptsNetlifyReply(event, popup, host.location.origin, state)) return
      if (typeof event.data.token !== 'string' || !event.data.token || event.data.error)
        finish(new Error('Netlify connection was not approved. You can try again.'))
      else finish(undefined, event.data.token)
    }
    const cancel = () => finish(new DOMException('Connection cancelled.', 'AbortError'))
    const closed = setInterval(() => { if (popup.closed) finish(new Error('The Netlify sign-in window was closed.')) }, 500)
    const timeout = setTimeout(() => finish(new Error('Netlify sign-in timed out. Please try again.')), 180000)
    host.addEventListener('message', receive)
    signal.addEventListener('abort', cancel, { once: true })
  })
}
