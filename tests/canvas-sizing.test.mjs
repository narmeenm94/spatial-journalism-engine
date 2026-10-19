import test from 'node:test'
import assert from 'node:assert/strict'
import { createARCanvasSizing } from '../engine/src/xr/CanvasSizing.js'

function fixture() {
  const listeners = new Map(), viewport = new Map()
  let writes = 0, width = 300, height = 150
  const canvas = { style: {}, get width(){return width},set width(value){width=value;writes++},get height(){return height},set height(value){height=value;writes++} }
  const container = {clientWidth:360,clientHeight:640}
  const win = {devicePixelRatio:3,innerWidth:360,innerHeight:640,
    addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name),
    visualViewport:{addEventListener:(name,fn)=>viewport.set(name,fn),removeEventListener:name=>viewport.delete(name)}}
  return {canvas,container,win,listeners,viewport,get writes(){return writes}}
}

test('AR starts at full display size rather than the default 300 by 150 canvas',()=>{
  const f=fixture(), sizing=createARCanvasSizing({canvas:f.canvas,container:f.container,window:f.win})
  sizing.resize()
  assert.equal(f.canvas.width,1080); assert.equal(f.canvas.height,1920)
  assert.equal(f.canvas.style.width,'100%'); assert.equal(f.canvas.style.height,'100%')
})

test('camera resolution bounds the buffer while portrait and landscape fill the display',()=>{
  const f=fixture(), module=createARCanvasSizing({canvas:f.canvas,container:f.container,window:f.win}).pipelineModule()
  module.onAttach({videoWidth:1280,videoHeight:720})
  assert.equal(f.canvas.width,720); assert.equal(f.canvas.height,1280)
  // XR8's renderer writes inline pixel sizes; the helper must restore CSS sizing.
  f.canvas.style.width='720px'; f.canvas.style.height='1280px'
  const writes=f.writes
  module.onUpdate()
  assert.equal(f.canvas.style.width,'100%'); assert.equal(f.canvas.style.height,'100%')
  assert.equal(f.writes,writes,'unchanged frames must not reset the drawing buffer')
  f.container.clientWidth=640; f.container.clientHeight=360
  module.onDeviceOrientationChange({orientation:90})
  assert.equal(f.canvas.width,1280); assert.equal(f.canvas.height,720)
  module.onDetach()
  assert.equal(f.listeners.size,0); assert.equal(f.viewport.size,0)
})

test('browser toolbar and embedded preview resizes retain aspect and follow new video sizes',()=>{
  const f=fixture(), module=createARCanvasSizing({canvas:f.canvas,container:f.container,window:f.win}).pipelineModule()
  module.onAttach({videoWidth:1280,videoHeight:720})
  f.container.clientHeight=720
  f.viewport.get('resize')()
  assert.equal(f.canvas.width,640); assert.equal(f.canvas.height,1280)
  module.onVideoSizeChange({videoWidth:640,videoHeight:480})
  assert.equal(f.canvas.width,320); assert.equal(f.canvas.height,640)
  f.container.clientWidth=200;f.container.clientHeight=100;f.win.devicePixelRatio=1
  f.listeners.get('resize')()
  assert.equal(f.canvas.width,200); assert.equal(f.canvas.height,100)
  module.onDetach()
})
