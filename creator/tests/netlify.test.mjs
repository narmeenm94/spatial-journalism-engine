import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { netlifyClient } from '../src/utils/netlify.ts'
import { connectNetlify } from '../src/utils/netlifyAuth.ts'

const bytes = value => new TextEncoder().encode(value)
const sha = data => createHash('sha1').update(data).digest('hex')
const files = { 'index.html': bytes('entry'), 'story.json': bytes('{"story":"example"}'), 'player/index.html': bytes('player'), 'media/0001.mp4': bytes('video'), 'media/0002.mp4': bytes('video') }
const site = { id: 'site-1', name: 'spatial-story-example' }
const draft = { id: 'draft-1', site_id: site.id, state: 'ready', deploy_ssl_url: 'https://draft-1--spatial-story-example.netlify.app/' }
const json = (data, status = 200) => new Response(JSON.stringify(data), {status, headers:{'Content-Type':'application/json'}})
const signal = () => new AbortController().signal

test('digest deployment uploads only requested bytes, uses two workers and leaves production untouched', async () => {
  const calls = [], uploaded = [], expected = new Set(Object.values(files).map(sha))
  let active = 0, peak = 0
  const client = netlifyClient('test-only-credential', async (url, options) => {
    const path = new URL(url).pathname
    calls.push([path, options.method])
    assert.equal(new URL(url).origin, 'https://api.netlify.com')
    assert.equal(options.headers.Authorization, 'Bearer test-only-credential')
    assert.equal(options.redirect, 'error')
    assert.equal(options.credentials, 'omit')
    if (options.method === 'POST') {
      assert.equal(path, '/api/v1/sites/site-1/deploys')
      const body = JSON.parse(options.body)
      assert.equal(body.draft, true)
      assert.equal(body.files['/media/0001.mp4'], sha(files['media/0001.mp4']))
      assert.equal(body.files['/media/0002.mp4'], body.files['/media/0001.mp4'])
      return json({...draft, state:'uploading', required:[...expected]})
    }
    if (options.method === 'PUT') {
      active++; peak = Math.max(active, peak)
      await new Promise(resolve => setTimeout(resolve, 2))
      assert.equal(options.headers['Content-Type'], 'application/octet-stream')
      uploaded.push(sha(new Uint8Array(options.body)))
      active--
      return json({})
    }
    return json(draft)
  })
  const before = JSON.stringify(files), progress = []
  await client.draft(site, files, signal(), value => progress.push(value), () => {})
  const ready = await client.ready(site.id, draft.id, signal())
  assert.equal(ready.deploy_ssl_url, draft.deploy_ssl_url)
  assert.deepEqual(new Set(uploaded), expected)
  assert.equal(uploaded.length, expected.size)
  assert.equal(peak, 2)
  assert.equal(JSON.stringify(files), before)
  assert.ok(progress.some(value => value.includes('Uploading')))
  assert.ok(!calls.some(([path]) => path.endsWith('/restore')))
})

test('new sites are created only in the selected team and teams are paginated', async () => {
  const calls = []
  const client = netlifyClient('test', async (url, options) => {
    calls.push(url)
    if (url.includes('/accounts')) return json(new URL(url).searchParams.get('page') === '1' ? Array.from({length:100}, (_,i)=>({slug:'team-'+i,name:'Team '+i})) : [{slug:'newsroom',name:'Newsroom'}])
    assert.equal(url,'https://api.netlify.com/api/v1/newsroom/sites')
    assert.equal(options.method,'POST')
    assert.match(JSON.parse(options.body).name,/^spatial-story-/)
    return json(site)
  })
  assert.equal((await client.teams(signal())).length,101)
  assert.deepEqual(await client.createSite('newsroom',signal()),site)
  assert.equal(calls.length,3)
  await assert.rejects(client.createSite('../sites/other',signal()),/invalid identifier/)
  assert.equal(calls.length,3)
})

test('publication promotes exactly the ready tested deployment and returns the production HTTPS URL', async () => {
  const calls = []
  const client = netlifyClient('test',async(url,options)=>{
    calls.push([url,options.method])
    if(url.endsWith('/sites/site-1')) return json({...site,ssl_url:'https://spatial-story-example.netlify.app/'})
    return json(draft)
  })
  assert.equal(await client.publish(site.id,draft.id,signal()),'https://spatial-story-example.netlify.app/')
  assert.deepEqual(calls.map(([url,method])=>[new URL(url).pathname,method]),[
    ['/api/v1/deploys/draft-1','GET'],['/api/v1/sites/site-1/deploys/draft-1/restore','POST'],['/api/v1/sites/site-1','GET']
  ])
})

test('unready or foreign deployments cannot be published', async () => {
  for (const bad of [{...draft,state:'uploading'},{...draft,site_id:'other-site'},{...draft,id:'other-deploy'}]) {
    const calls=[]
    const client=netlifyClient('test',async(url,options)=>{calls.push(options.method);return json(bad)})
    await assert.rejects(client.publish(site.id,draft.id,signal()),/not ready/)
    assert.deepEqual(calls,['GET'])
  }
})

test('ready checks reject missing/insecure links and failed or mismatched deploys', async () => {
  for (const bad of [{...draft,deploy_ssl_url:undefined},{...draft,deploy_ssl_url:'http://unsafe.example'},{...draft,state:'error'},{...draft,site_id:'other'}]) {
    const client=netlifyClient('test',async()=>json(bad))
    await assert.rejects(client.ready(site.id,draft.id,signal()))
  }
})

test('unknown required files and unsafe or incomplete packages fail without uploads', async () => {
  let uploads=0, creates=0
  const client=netlifyClient('test',async(url,options)=>{
    if(options.method==='PUT') uploads++
    creates++
    return json({...draft,required:['unknown-hash']})
  })
  await assert.rejects(client.draft(site,files,signal(),()=>{},()=>{}),/unknown file/)
  assert.equal(uploads,0)
  await assert.rejects(client.draft(site,{'story.json':bytes('story')},signal(),()=>{},()=>{}),/incomplete/)
  await assert.rejects(client.draft(site,{...files,'../secret':bytes('bad')},signal(),()=>{},()=>{}),/Invalid website/)
  assert.equal(creates,1)
})

test('cancelling during uploads stops work and cannot yield a test URL', async () => {
  const controller=new AbortController(), calls=[]
  const client=netlifyClient('test',async(url,options)=>{
    calls.push(options.method)
    if(options.method==='POST')return json({...draft,required:[...new Set(Object.values(files).map(sha))]})
    controller.abort(new DOMException('Stopped','AbortError'))
    options.signal.throwIfAborted()
  })
  await assert.rejects(client.draft(site,files,controller.signal,()=>{},()=>{}),{name:'AbortError'})
  assert.equal(calls.filter(method=>method==='PUT').length,1)
  assert.ok(!calls.includes('GET'))
})

test('cancelled requests do not connect to Netlify and failures never echo credentials', async () => {
  let calls=0
  const controller=new AbortController();controller.abort()
  const client=netlifyClient('test-secret',async()=>{calls++;return json({})})
  await assert.rejects(client.teams(controller.signal),{name:'AbortError'})
  assert.equal(calls,0)
  for(const [status,message] of [[401,/expired/],[403,/permissions/],[429,/Wait a minute/],[500,/500/]]) {
    const failed=netlifyClient('test-secret',async()=>json({error:'test-secret'},status))
    await assert.rejects(failed.createSite('newsroom',signal()),error=>message.test(error.message)&&!error.message.includes('test-secret'))
  }
})

test('an unknown create outcome is not automatically retried', async () => {
  let calls=0
  const client=netlifyClient('test',async()=>{calls++;throw new TypeError('Network unavailable')})
  await assert.rejects(client.createSite('newsroom',signal()))
  assert.equal(calls,1)
})

function oauthHost() {
  const listeners=new Map()
  const popup={closed:false,close(){this.closed=true}}
  const host={location:{origin:'https://studio.example'},open(url){host.url=new URL(url);return popup},addEventListener(type,handler){listeners.set(type,handler)},removeEventListener(type){listeners.delete(type)}}
  return {host,popup,listeners,send(data,origin=host.location.origin,source=popup){listeners.get('message')?.({data,origin,source})}}
}
test('OAuth binds its callback to this popup, origin and random state', async () => {
  const auth=oauthHost()
  const promise=connectNetlify('public-client-id','https://studio.example/netlify-callback.html',signal(),auth.host)
  assert.equal(auth.host.url.origin,'https://app.netlify.com')
  assert.equal(auth.host.url.searchParams.get('response_type'),'token')
  const data={type:'spatial-netlify-auth',state:auth.host.url.searchParams.get('state'),token:'test-token'}
  auth.send(data,'https://another.example')
  auth.send(data,undefined,{})
  auth.send({...data,state:'wrong-state'})
  assert.equal(auth.popup.closed,false)
  auth.send(data)
  assert.equal(await promise,'test-token')
  assert.equal(auth.popup.closed,true)
  assert.equal(auth.listeners.size,0)
})

test('OAuth denial, blocked popups and cancellation give recoverable errors', async () => {
  const auth=oauthHost(), controller=new AbortController()
  const pending=connectNetlify('public-id','https://studio.example/netlify-callback.html',controller.signal,auth.host)
  controller.abort()
  await assert.rejects(pending,{name:'AbortError'})
  assert.equal(auth.listeners.size,0)
  const denied=oauthHost()
  const failure=connectNetlify('public-id','https://studio.example/netlify-callback.html',signal(),denied.host)
  denied.send({type:'spatial-netlify-auth',state:denied.host.url.searchParams.get('state'),error:'access_denied'})
  await assert.rejects(failure,/not approved/)
  await assert.rejects(connectNetlify('public-id','https://studio.example/netlify-callback.html',signal(),{...auth.host,open(){return null}}),/pop-ups/)
  await assert.rejects(connectNetlify('public-id','https://other.example/callback',signal(),auth.host),/belong to this studio/)
})

test('callback removes credential fragment before replying, uses exact origin and loads no remote resources', () => {
  const source=readFileSync(new URL('../public/netlify-callback.js',import.meta.url),'utf8')
  const events=[], status={}
  runInNewContext(source,{
    URLSearchParams,
    location:{hash:'#access_token=test-token&state=test-state',pathname:'/studio/netlify-callback.html',origin:'https://studio.example'},
    history:{replaceState(...args){events.push(['clear',...args])}},
    document:{getElementById(){return status}},
    window:{opener:{postMessage(data,origin){events.push(['reply',data,origin])}}}
  })
  assert.equal(events[0][0],'clear')
  assert.equal(events[1][0],'reply')
  assert.equal(events[1][1].token,'test-token')
  assert.equal(events[1][2],'https://studio.example')
  const html=readFileSync(new URL('../public/netlify-callback.html',import.meta.url),'utf8')
  assert.ok(html.includes("default-src 'none'"))
  assert.ok(!html.includes('https://'))
})
