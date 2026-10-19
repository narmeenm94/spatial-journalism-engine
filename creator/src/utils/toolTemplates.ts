import type { StoryConfig, CameraKeyframe } from '../state/types'
export type TemplateTool = 'camera' | 'lighting' | 'soundscape' | 'ending'
export const toolTemplates: Record<TemplateTool, {id:string; title:string; hint:string; icon:string}[]> = {
 camera: [
  {id:'hold',title:'Hold a view',hint:'A still opening · 8 seconds',icon:'camera'},
  {id:'reveal',title:'Slow reveal',hint:'Move gently forward · 8 seconds',icon:'arrow'},
  {id:'pan',title:'Look around',hint:'A gentle turn · 12 seconds',icon:'rotate'}],
 lighting: [
  {id:'clear',title:'Clear & natural',hint:'Even light for reporting',icon:'light'},
  {id:'intimate',title:'Intimate',hint:'Soft light for testimony',icon:'light'},
  {id:'dramatic',title:'Dramatic',hint:'Deep contrast and focus',icon:'light'}],
 soundscape: [
  {id:'bed',title:'Atmosphere',hint:'A quiet loop around the reader',icon:'audio'},
  {id:'place',title:'Sound in a place',hint:'A loop anchored in the scene',icon:'move'},
  {id:'cue',title:'One-time sound',hint:'Play once when the experience starts',icon:'play'}],
 ending: [
  {id:'reflection',title:'A final thought',hint:'A closing reflection and return home',icon:'text'},
  {id:'sources',title:'Continue the story',hint:'Sources, context and a next step',icon:'chapters'}]
}
export function applyToolTemplate(story: StoryConfig, sceneId: string, tool: TemplateTool, id: string, language: string) {
 const scene = story.scenes.find(s => s.id === sceneId)
 if (!toolTemplates[tool].some(p => p.id === id)) return
 if (tool === 'camera' && scene) {
   const route = (story.camera.guided ||= {})[sceneId] ||= []
   const last = [...route].sort((a,b) => a.time-b.time).at(-1)
   const time = last ? last.time + (last.duration || 0) / 1000 + 2 : 0
   const position: [number,number,number] = [...(last?.position || story.camera.initialPosition)]
   const rotation: [number,number,number] = [...(last?.rotation || story.camera.initialRotation)]
   const stop = (at:number, duration:number):CameraKeyframe => ({id:crypto.randomUUID(),time:at,position:[...position],rotation:[...rotation],duration,easing:'sine'})
   route.push(stop(time,0))
   if (id === 'pan') rotation[1] += Math.PI / 6
   if (id === 'reveal') {
     const bounds = story.camera.bounds, distance = Math.min(1, Math.max(.05,(bounds.maxZ-bounds.minZ)*.1))
     position[0] = Math.max(bounds.minX,Math.min(bounds.maxX,position[0] - Math.sin(rotation[1]) * distance))
     position[2] = Math.max(bounds.minZ,Math.min(bounds.maxZ,position[2] - Math.cos(rotation[1]) * distance))
   }
   const duration = id === 'pan' ? 12000 : 8000
   route.push(stop(time+1,duration))
   if (scene.duration && scene.duration < time+1+duration/1000) scene.duration=time+1+duration/1000
 } else if (tool === 'lighting' && scene) {
   scene.lighting.modifiers = id === 'clear' ? {ambient:1,directional:1,hemisphere:1} : id === 'intimate' ? {ambient:.45,directional:.6,hemisphere:.35} : {ambient:.15,directional:1,hemisphere:.1}
 } else if (tool === 'soundscape') {
   (story.ambience ||= []).push({id:crypto.randomUUID(),file:'',volume:id==='bed'?.2:.5,loop:id!=='cue',autoplay:true,positional:id==='place',position:[0,1,0],refDistance:2,maxDistance:30,rolloffFactor:1})
 } else if (tool === 'ending') {
   story.ending.text = {...story.ending.text,[language]:id==='reflection'?'What will you take away from this story?':'Explore the sources and context behind this story.'}
   story.ending.buttons.returnHome = {...story.ending.buttons.returnHome,[language]:'Return to the beginning'}
   if (id === 'sources') story.ending.buttons.learnMore = {...story.ending.buttons.learnMore,url:story.ending.buttons.learnMore?.url || '',[language]:'Explore the sources'}
 }
}
