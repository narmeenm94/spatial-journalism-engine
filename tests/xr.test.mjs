import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three-runtime'
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

test('immersive startup seeds the tracker origin and facing from the authored pose, before returning its camera', async () => {
  const previous = globalThis.document
  globalThis.document = {createElement: () => ({style:{},remove(){}})}
  let modules, configured
  const camera = new THREE.PerspectiveCamera(), scene = {camera,scene:{},renderer:{}}
  const xr = {
    XrController: {configure(){}, pipelineModule:()=>({name:'tracker'}), updateCameraProjectionMatrix(value){configured=value}},
    GlTextureRenderer: {pipelineModule:()=>({name:'feed'})},
    Threejs: {xrScene:()=>scene,pipelineModule:()=>({name:'three'})},
    XrConfig: {device:()=>({ANY:'any'})},stop(){},
    addCameraPipelineModules(value){modules=value},run(){modules.at(-1).onStart()}
  }
  try {
    const initialPose={position:[1.5,1.6,-1.5],rotation:[0,Math.PI/2,0]}
    const result=await createEighthWallScene(xr,{container:{prepend(){}},initialPose})
    assert.equal(result.camera,camera)
    assert.deepEqual(configured.origin.toArray(),initialPose.position)
    assert.ok(configured.facing.angleTo(camera.quaternion)<1e-6)
    camera.position.set(0,0,0);camera.quaternion.identity()
    assert.deepEqual(configured.origin.toArray(),initialPose.position,'tracker origin must not alias the live sensor position')
    assert.ok(configured.facing.angleTo(camera.quaternion)>1)
  } finally {globalThis.document=previous}
})
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
  m.win.XR8 = { XrController: {} }
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
  m.win.XR8 = { XrController: {} }
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


test('exported runtime uses its paired framework; image tracking retains the standard framework', async () => {
  for (const imageTracking of [false, true]) {
    const m = loader()
    const pending = loadEighthWall({ runtime: 'exported', imageTracking, document: m.doc, window: m.win })
    assert.ok(m.scripts[0].src.endsWith(imageTracking ? '/8thwall/xr.js' : '/8thwall-slam/xr.js'))
    assert.equal(m.scripts[0]['data-preload-chunks'],'slam', 'The exported loader accepts chunk names, not the newer name: URL syntax')
    m.win.XR8 = { XrController: {} }; m.events.get('xrloaded')(); await pending
  }
})

test('XR8 keeps one render per frame and coaching only runs for world tracking', async () => {
  globalThis.document = { createElement: () => ({ style: {}, remove() {} }) }
  try {
    for (const orientation of [false, true]) for (const updateBeforeRender of [false, true]) {
      let modules, custom = false, normalRenders = 0, composerRenders = 0, updates = 0, guidance
      const xr = {
        XrController: { configure() {}, pipelineModule: () => ({name:'tracker'}) },
        GlTextureRenderer: { pipelineModule: () => ({name:'camera'}) },
        Threejs: { pipelineModule: () => ({name:'three', onRender(){normalRenders++}}), xrScene: () => ({}) },
        XrConfig: { device: () => ({ANY:'any'}) },
        addCameraPipelineModules(m){modules=m}, stop(){}, run(){modules.at(-1).onStart()}
      }
      const coach = {configure(c){guidance=c.promptText}, pipelineModule:()=>({name:'coach'})}
      await createEighthWallScene(xr,{container:{prepend(){}},disableWorldTracking:orientation,coachingOverlay:coach,language:'fi',updateBeforeRender,onUpdate(){updates++},onRender(){assert.equal(updates,normalRenders+composerRenders+1);if(custom){composerRenders++;return true}return false}})
      const render = modules.find(m=>m.name==='three').onRender
      modules.at(-1).onUpdate()
      assert.equal(updates,updateBeforeRender ? 0 : 1)
      render(); custom=true; modules.at(-1).onUpdate(); render()
      assert.equal(normalRenders,1);assert.equal(composerRenders,1)
      assert.equal(updates,2,'each frame updates once, before rendering')
      assert.equal(modules.some(m=>m.name==='coach'),!orientation)
      assert.equal(guidance,orientation?undefined:'Liikuta laitetta eteen ja taakse')
    }
  } finally { delete globalThis.document }
})

test('a loaded framework without its tracking chunk fails before scene creation',async()=>{
  const m=loader(),pending=loadEighthWall({document:m.doc,window:m.win})
  m.win.XR8={XrController:null};m.events.get('xrloaded')()
  await assert.rejects(pending,/tracking engine did not initialise/)
  await assert.rejects(loadEighthWall({document:m.doc,window:m.win}),/tracking engine is unavailable/)
})

test('AR canvas fills its host before startup and composer resize follows XR8 renderer resize',async()=>{
  const events=[];let modules,canvas
  globalThis.document={createElement:()=>({width:300,height:150,style:{},remove(){}})}
  const xr={
    XrController:{configure(){},pipelineModule:()=>({name:'tracker'})},
    GlTextureRenderer:{pipelineModule:()=>({name:'feed'})},
    Threejs:{xrScene:()=>({camera:{},renderer:{}}),pipelineModule:()=>({name:'three',onCanvasSizeChange:detail=>events.push(['renderer',detail.canvasWidth,detail.canvasHeight])})},
    XrConfig:{device:()=>({ANY:'any'})},stop(){},addCameraPipelineModules:m=>{modules=m},
    run(config){canvas=config.canvas;assert.equal(canvas.width,412);assert.equal(canvas.height,915);modules.at(-1).onStart()}
  }
  try{
    await createEighthWallScene(xr,{container:{clientWidth:412,clientHeight:915,prepend(){}},onResize:(w,h)=>events.push(['composer',w,h])})
    assert.equal(modules[0].name,'spatial-canvas-sizing')
    modules.find(m=>m.name==='three').onCanvasSizeChange({canvasWidth:576,canvasHeight:1280})
    assert.deepEqual(events,[['renderer',576,1280],['composer',576,1280]])
    assert.equal(canvas.style.width,'100%')
  }finally{delete globalThis.document}
})

test('early camera configuration waits for Threejs startup and is replayed without losing the authored pose',async()=>{
  globalThis.document={createElement:()=>({style:{},remove(){}})}
  let scene=null, modules
  const seen=[]
  const early={detail:{origin:{position:{x:1.5,y:1.6,z:-1.5}}}}
  const later={detail:{recenter:true}}
  const xr={
    XrController:{configure(){},pipelineModule:()=>({name:'tracker'})},
    GlTextureRenderer:{pipelineModule:()=>({name:'feed'})},
    Threejs:{xrScene:()=>scene,pipelineModule:()=>({
      name:'three',onBeforeRun(){scene=null},onStart(){scene={camera:{},scene:{},renderer:{}}},
      onAttach(){scene={camera:{},scene:{},renderer:{}}},onDetach(){scene=null},
      listeners:[{event:'reality.cameraconfigured',process:event=>{assert.ok(scene.camera);seen.push(event)}}]
    })},
    XrConfig:{device:()=>({ANY:'any'})},stop(){},addCameraPipelineModules:m=>{modules=m},
    run(){
      const renderer=modules.find(m=>m.name==='three')
      renderer.onBeforeRun()
      renderer.listeners[0].process(early)
      assert.equal(seen.length,0)
      renderer.onStart()
      assert.deepEqual(seen,[early])
      renderer.listeners[0].process(later)
      assert.deepEqual(seen,[early,later])
      modules.at(-1).onStart()
    }
  }
  try {
    const result=await createEighthWallScene(xr,{container:{prepend(){}}})
    assert.equal(result.camera,scene.camera)
    const renderer=modules.find(m=>m.name==='three')
    renderer.onDetach();renderer.listeners[0].process(early);renderer.onAttach()
    assert.deepEqual(seen,[early,later,early])
    renderer.onDetach();renderer.listeners[0].process(later);renderer.onBeforeRun();renderer.onStart()
    assert.equal(seen.length,3,'A new run must not replay stale configuration')
  } finally { delete globalThis.document }
})
