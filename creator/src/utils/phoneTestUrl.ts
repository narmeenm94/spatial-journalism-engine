export function phoneTestUrl(input: string): string {
  let url: URL
  try { url = new URL(input.trim()) } catch { throw new Error('Paste the full HTTPS address of your hosted experience.') }
  if (url.protocol !== 'https:') throw new Error('Phone AR needs HTTPS. Host the exported website first.')
  const host = url.hostname.toLowerCase().replace(/\.$/, '')
  if (host === 'localhost' || host.endsWith('.localhost') || host === '[::1]' || host === '0.0.0.0' || host.startsWith('127.'))
    throw new Error('This address points to the current device. Use your hosted website address so your phone can reach it.')
  if (url.username || url.password) throw new Error('Use a website address without an embedded username or password.')
  if (url.searchParams.get('source') === 'postMessage' || /^(blob:|data:)/i.test(url.searchParams.get('story') || ''))
    throw new Error('This is a studio-only preview link. Export and host the website, then paste its address.')
  if (url.href.length > 1800) throw new Error('This link is too long for a clear QR code. Use the hosted website entry address.')
  return url.href
}
