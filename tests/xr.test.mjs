import test from 'node:test'
import assert from 'node:assert/strict'
import {
  loadEighthWall,
  createEighthWallScene
} from '../engine/src/xr/EighthWall.js'
function loader() {
  const events = new Map(),
    scripts = []
  const win = {
    addEventListener: (n, fn) => events.set(n, fn),
    removeEventListener: (n) => events.delete(n)
  }
  const doc = {
    baseURI: 'https://example.org/player/',
    createElement: () => ({
      setAttribute(k, v) {
        this[k] = v
      },
      remove() {
        this.removed = true
      }
    }),
    head: { appendChild: (s) => scripts.push(s) }
  }
  return { win, doc, events, scripts }
}
test('AR loader selects the MIT image tracker without requesting the SLAM binary', async () => {
  const m = loader()
  const pending = loadEighthWall({
    imageTracking: true,
    document: m.doc,
    window: m.win
  })
  assert.equal(m.scripts[0]['data-preload-chunks'], 'slam')
  assert.equal(
    m.scripts[0].src,
    'https://example.org/player/vendor/8thwall/xr.js'
  )
  m.win.XR8 = {}
  m.events.get('xrloaded')()
  assert.equal(await pending, m.win.XR8)
  assert.equal(m.events.size, 0)
})
test('world tracking explicitly loads the separately licensed, local SLAM chunk', async () => {
  const m = loader()
  const pending = loadEighthWall({ document: m.doc, window: m.win })
  assert.equal(
    m.scripts[0]['data-preload-chunks'],
    'slam: https://example.org/player/vendor/8thwall-slam/xr-slam.js'
  )
  m.win.XR8 = {}
  m.events.get('xrloaded')()
  await pending
})
test('AR download errors reject and remove listeners rather than hanging', async () => {
  const m = loader()
  const pending = loadEighthWall({ document: m.doc, window: m.win })
  m.scripts[0].onerror()
  await assert.rejects(pending, /could not load/)
  assert.equal(m.events.size, 0)
  assert.ok(m.scripts[0].removed)
})
test('image tracking is configured before camera startup and forwards tracking events', async () => {
  let modules, config
  const result = { scene: {}, camera: {}, renderer: {} }
  const seen = []
  globalThis.document = { createElement: () => ({ style: {}, remove() {} }) }
  const xr = {
    XrController: {
      configure: (c) => (config = c),
      pipelineModule: () => ({})
    },
    GlTextureRenderer: { pipelineModule: () => ({}) },
    Threejs: { pipelineModule: () => ({}), xrScene: () => result },
    XrConfig: { device: () => ({ ANY: 'any' }) },
    addCameraPipelineModules: (m) => (modules = m),
    stop() {},
    run() {
      assert.equal(config.disableWorldTracking, true)
      modules.at(-1).onStart()
    }
  }
  const built = await createEighthWallScene(xr, {
    container: { prepend() {} },
    imageTargets: [{ imagePath: 'target.jpg' }],
    onImage: (state, detail) => seen.push([state, detail])
  })
  assert.equal(built.scene, result.scene)
  modules
    .at(-1)
    .listeners.find((l) => l.event === 'reality.imagefound')
    .process({ detail: { name: 'target' } })
  assert.deepEqual(seen, [['found', { name: 'target' }]])
  delete globalThis.document
})

test('a stalled camera rejects with an actionable error and releases the camera', async () => {
  let stopped = 0,
    removed = 0
  globalThis.document = {
    createElement: () => ({
      style: {},
      remove() {
        removed++
      }
    })
  }
  const xr = {
    XrController: { configure() {}, pipelineModule: () => ({}) },
    GlTextureRenderer: { pipelineModule: () => ({}) },
    Threejs: { pipelineModule: () => ({}) },
    XrConfig: { device: () => ({ ANY: 'any' }) },
    addCameraPipelineModules() {},
    stop() {
      stopped++
    },
    run() {}
  }
  try {
    await assert.rejects(
      createEighthWallScene(xr, {
        container: { prepend() {} },
        startupTimeout: 5
      }),
      /camera did not start/
    )
    assert.equal(stopped, 1)
    assert.equal(removed, 1)
  } finally {
    delete globalThis.document
  }
})

test('Guided orientation and Explore world tracking are configured before startup', async () => {
  globalThis.document={createElement:()=>({style:{},remove(){}})}
  try { for (const orientation of [true,false]) {
    let modules,config;const statuses=[]
    const xr={XrController:{configure:c=>{config=c},pipelineModule:()=>{assert.ok(config);return {}}},GlTextureRenderer:{pipelineModule:()=>({})},Threejs:{pipelineModule:()=>({}),xrScene:()=>({})},XrConfig:{device:()=>({ANY:'any'})},addCameraPipelineModules:m=>{modules=m},stop(){},run(){modules.at(-1).onStart()}}
    await createEighthWallScene(xr,{container:{prepend(){}},disableWorldTracking:orientation,onTracking:d=>statuses.push(d.status)})
    assert.equal(config.disableWorldTracking,orientation)
    assert.equal(config.scale,orientation ? 'responsive' : 'absolute')
    modules.at(-1).listeners.find(l=>l.event==='coaching-overlay.show').process()
    modules.at(-1).listeners.find(l=>l.event==='coaching-overlay.hide').process()
    assert.deepEqual(statuses,['LIMITED','NORMAL'])
  }} finally {delete globalThis.document}
})
