(() => {
  const result = new URLSearchParams(location.hash.slice(1))
  history.replaceState(null, '', location.pathname)
  if (!window.opener) {
    document.getElementById('status').textContent = 'Open Preview in the studio and choose Connect Netlify again.'
    return
  }
  window.opener.postMessage({
    type: 'spatial-netlify-auth',
    state: result.get('state'),
    token: result.get('access_token'),
    error: result.get('error')
  }, location.origin)
  document.getElementById('status').textContent = 'Connection returned. You can close this window.'
})()
