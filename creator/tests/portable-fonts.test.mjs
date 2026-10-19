import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { portableStory } from '../src/utils/export.ts'
import { normalizeStory } from '../src/utils/normalizeStory.ts'
import { assertValidStory } from '../src/utils/storyDocument.ts'
import { useStore } from '../src/state/store.ts'
import { TestFileReader } from './file-reader.mjs'
import { createScreenDesign } from '../../engine/src/ui/screenDesign.js'
import { storyFontFaces } from '../../engine/src/ui/storyFonts.js'
import { JSONParser } from '../../engine/src/core/JSONParser.js'

globalThis.FileReader = TestFileReader

test('screen typography and actual font bytes survive export, reopen and player resolution', async () => {
  useStore.getState().resetStory()
  const story = structuredClone(useStore.getState().story)
  const src = 'fonts/source-serif.woff2'
  const bytes = readFileSync(new URL('../node_modules/@fontsource-variable/source-serif-4/files/source-serif-4-latin-wght-normal.woff2', import.meta.url))
  story.ui.branding.font = '"Source Serif 4 Variable"'
  story.ui.branding.fonts = [{id:'source-serif',name:'Source Serif 4',family:'Source Serif 4 Variable',license:'OFL-1.1',files:[{src,weight:'200 900',style:'normal'}]}]
  story.ui.captions = {font: '"Source Serif 4 Variable"',fontSize:24,mobileFontSize:18}
  story.ui.screenDesigner = createScreenDesign(story.ui,'Portable typography')
  story.ui.screenDesigner.screens[0].elements[1].style.fontWeight = 700
  story.ui.screenDesigner.screens[0].elements[1].style.fontStyle = 'italic'
  const exported = await portableStory(story,{[src]:new File([bytes],'source-serif.woff2')})
  const reopened = normalizeStory(JSON.parse(JSON.stringify(exported)))
  assertValidStory(reopened)
  assert.deepEqual(Buffer.from(reopened.embeddedAssets[src].split(',')[1],'base64'),bytes)
  assert.deepEqual(reopened.ui.screenDesigner,story.ui.screenDesigner)
  assert.deepEqual(reopened.ui.branding.fonts,story.ui.branding.fonts)
  assert.deepEqual(reopened.ui.captions,story.ui.captions)
  assert.equal((await portableStory(reopened)).embeddedAssets[src],exported.embeddedAssets[src])
  const parser = new JSONParser()
  await parser.loadSchema(JSON.parse(readFileSync(new URL('../../engine/schema/story.schema.json', import.meta.url),'utf8')))
  parser.storyBaseUrl = 'https://story.example/'
  await parser.parse(reopened)
  assert.equal(parser.resolvePath(src,'./assets/'),exported.embeddedAssets[src])
  assert.equal(storyFontFaces(reopened.ui.branding)[0].weight,'200 900')
})
test('missing font files block a supposedly portable export', async () => {
  useStore.getState().resetStory()
  const story=structuredClone(useStore.getState().story)
  story.ui.branding.fonts=[{id:'missing',name:'Missing',family:'Missing',files:[{src:'fonts/missing.woff2'}]}]
  await assert.rejects(portableStory(story),/Missing media: fonts\/missing.woff2/)
})
test('old single-font stories remain supported and malformed font descriptors fail validation', () => {
  assert.deepEqual(storyFontFaces({font:'Old Font',fontFiles:{woff2:'old.woff2',woff:'old.woff'}}),[{family:'Old Font',src:'old.woff2',weight:'400',style:'normal'}])
  useStore.getState().resetStory()
  const story=structuredClone(useStore.getState().story)
  story.ui.branding.fonts=[{id:'x',name:'Test',family:'Test',files:[{src:'font.woff2',weight:'bogus'}]}]
  assert.throws(()=>assertValidStory(story),/weight/)
})
