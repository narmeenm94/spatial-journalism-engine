import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_PANELS, readPanelSizes, fitPanelColumns } from '../src/utils/panelLayout.ts'

test('invalid stored layouts cannot make panels disappear or overflow', () => {
  for (const raw of [null, 'broken', 'null', '[]', '{"left":"500","right":null,"bottom":{}}']) assert.deepEqual(readPanelSizes(raw), DEFAULT_PANELS)
  assert.deepEqual(readPanelSizes('{"left":-90,"right":9000,"bottom":1}'), {left:220,right:560,bottom:160})
  assert.deepEqual(readPanelSizes('{"left":320,"right":380,"bottom":410}'), {left:320,right:380,bottom:410})
})
test('wide saved sidebars shrink to preserve a working canvas on a smaller display', () => {
  const fitted = fitPanelColumns(1101, {left:520,right:560,bottom:260}, true, true)
  assert.ok(fitted.left >= 220 && fitted.right >= 260)
  assert.ok(1101 - fitted.left - fitted.right - 16 >= 359)
  const expanded = fitPanelColumns(1800, {left:520,right:560,bottom:260}, true, true)
  assert.equal(expanded.left,520)
  assert.equal(expanded.right,560)
})
test('hidden panels release their full width and resize limits protect the canvas', () => {
  const leftOnly = fitPanelColumns(1101, DEFAULT_PANELS, true, false)
  assert.equal(leftOnly.right,0)
  assert.equal(leftOnly.leftMax,520)
  const both = fitPanelColumns(1101, DEFAULT_PANELS, true, true)
  assert.ok(both.leftMax + both.right + 16 + 360 <= 1101)
  assert.ok(both.rightMax + both.left + 16 + 360 <= 1101)
})
