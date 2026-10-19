import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {normalizeStory} from '../src/utils/normalizeStory.ts'
import {matchesExampleMedia} from '../src/utils/exampleMedia.ts'
test('only matching Shadows media is reconnected; imported story edits are retained',()=>{
 const reference=normalizeStory(JSON.parse(fs.readFileSync(new URL('../../examples/shadows-rebuilt/story.json',import.meta.url))))
 const old=structuredClone(reference);old.scenes[0].title.en='My revised introduction'
 assert.ok(matchesExampleMedia(old,reference));assert.equal(old.scenes[0].title.en,'My revised introduction')
 old.project.title='A different documentary';assert.equal(matchesExampleMedia(old,reference),false)
 old.project.title=reference.project.title;old.ui.homeScreen.backgroundImage='unknown.png';assert.equal(matchesExampleMedia(old,reference),false)
})
