import test from 'node:test'
import assert from 'node:assert/strict'
import { UIManager } from '../engine/src/managers/UIManager.js'
test('starting a locally opened JSON replaces the file picker with loading progress', () => {
 const loading = {style:{display:'none'},children:[],querySelector(){return this.children.find(c=>c.className==='sj-loading-text')},replaceChildren(...children){this.children=children}}
 globalThis.document={getElementById:()=>loading,createElement:()=>({})}
 const manager=Object.create(UIManager.prototype)
 manager.showLoading('Loading story')
 assert.equal(loading.style.display,'flex')
 assert.equal(loading.children.length,2)
 assert.equal(loading.querySelector().textContent,'Loading story')
 manager.showLoading('Loading media')
 assert.equal(loading.children.length,2)
 assert.equal(loading.querySelector().textContent,'Loading media')
 delete globalThis.document
})
