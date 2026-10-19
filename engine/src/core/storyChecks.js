import { screenActions, resolveScreenTarget } from '../ui/screenDesign.js'

/** Legacy stories use endingTrigger; version 1.1 uses triggerMode. */
export function resolveEndingTrigger(ending, formatVersion) {
  return (formatVersion === '1.1'
    ? ending?.triggerMode || ending?.endingTrigger
    : ending?.endingTrigger || ending?.triggerMode) || 'audioEnd'
}

/** Semantic constraints shared by the editor and player. */
export function storyChecks(story) {
  const errors = [],
    ids = new Set()
  for (const scene of story.scenes || []) {
    if (ids.has(scene.id))
      errors.push('Chapter IDs must be unique: ' + scene.id)
    ids.add(scene.id)
    const cues = Array.isArray(scene.subtitles)
      ? scene.subtitles
      : Object.values(scene.subtitles || {}).flat()
    for (const cue of cues)
      if (cue.end <= cue.start)
        errors.push('A caption in ' + scene.id + ' must end after it starts.')
    for (const key of ['characters', 'objects', 'videos', 'audio', 'sceneButtons']) {
      const items = Array.isArray(scene[key])
          ? scene[key]
          : scene[key]
            ? [scene[key]]
            : [],
        seen = new Set()
      for (const item of items) {
        if (item.id && seen.has(item.id))
          errors.push(
            'Duplicate ' + key + ' ID in ' + scene.id + ': ' + item.id
          )
        if (item.id) seen.add(item.id)
        for (const field of [
          'delay',
          'duration',
          'fadeIn',
          'fadeOut',
          'triggerTime',
          'triggerAt'
        ])
          if (
            item[field] !== undefined &&
            (!Number.isFinite(item[field]) || item[field] < 0)
          )
            errors.push(
              field + ' in ' + scene.id + ' must be a non-negative number.'
            )
      }
    }
    if (
      scene.duration !== undefined &&
      (!Number.isFinite(scene.duration) || scene.duration < 0)
    )
      errors.push('Chapter length must be a non-negative number.')
  }
  for (const scene of story.scenes || [])
    if (scene.nextScene && !ids.has(scene.nextScene))
      errors.push('Unknown next chapter: ' + scene.nextScene)
  for (const scene of story.scenes || []) for (const button of scene.sceneButtons || []) {
    if (button.targetScene && !ids.has(button.targetScene)) errors.push('Scene button links to an unknown chapter: ' + button.targetScene)
    if (!Object.values(button.label || {}).some(v => typeof v === 'string' && v.trim())) errors.push('Give each scene button a label.')
    if (button.appearance === 'sprite' && !Object.values(button.image || {}).some(Boolean)) errors.push('Choose an image for the scene button ' + button.id)
    if (button.appearance === 'model' && !button.model) errors.push('Choose a model for the scene button ' + button.id)
  }
  if (
    story.project?.languages?.length &&
    !story.project.languages.includes(
      story.project.defaultLanguage || story.project.languages[0]
    )
  )
    errors.push('The default language must be one of the story languages.')
  for (const [sceneId, stops] of Object.entries(story.camera?.guided || {})) {
    if (!ids.has(sceneId))
      errors.push('Camera path refers to an unknown chapter: ' + sceneId)
    const times = new Set(),
      stopIds = new Set()
    for (const stop of stops) {
      if (times.has(stop.time))
        errors.push(
          'Camera stops in ' + sceneId + ' must have different start times.'
        )
      if (stopIds.has(stop.id))
        errors.push('Camera stop IDs in ' + sceneId + ' must be unique.')
      times.add(stop.time)
      stopIds.add(stop.id)
    }
  }
  if (story.camera?.navigation === 'immersive' && story.project?.ar?.tracking === 'image')
    errors.push('Full-space navigation uses world tracking. Select surface placement in Camera path to use an image target.')
  if (story.ending?.triggerSceneId && !ids.has(story.ending.triggerSceneId)) errors.push('Ending refers to an unknown chapter.')
  if (resolveEndingTrigger(story.ending, story.formatVersion) === 'characterFade' && story.ending.triggerCharacterId) {
    const chapter = (story.scenes || []).find(s => s.id === (story.ending.triggerSceneId || story.scenes.at(-1)?.id))
    if (!chapter?.characters?.some(c => c.id === story.ending.triggerCharacterId && c.duration > 0)) errors.push('The ending character needs a finite duration in the selected chapter.')
  }
  const soundIds = new Set()
  for (const sound of story.ambience || []) {
    if (soundIds.has(sound.id)) errors.push('Soundscape IDs must be unique: ' + sound.id)
    soundIds.add(sound.id)
    if (!sound.file) errors.push('Choose a file for each soundscape sound.')
    if (sound.objectId && !(story.interactableObjects || []).some(o => o.id === sound.objectId)) errors.push('Soundscape refers to an unknown object: ' + sound.objectId)
  }
  for (const scene of story.scenes || []) {
    const tracks = Array.isArray(scene.audio) ? scene.audio : scene.audio ? [scene.audio] : []
    for (const path of [...tracks.map(a => a.waypoints), scene.lighting?.walkingTour?.waypoints].filter(Boolean)) {
      const times = new Set()
      for (const point of path) {
        if (!Number.isFinite(point.time) || point.time < 0 || times.has(point.time)) errors.push('Waypoints in ' + scene.id + ' need distinct non-negative times.')
        times.add(point.time)
      }
    }
    for (const video of scene.videos || []) if (video.multiWall && !video.walls?.length) errors.push('Add a projection surface for multi-wall video in ' + scene.id + '.')
  }
  const design = story.ui?.screenDesigner
  if (design?.enabled) {
    const screenIds = new Set(design.screens.map(s => s.id))
    if(screenIds.size !== design.screens.length) errors.push('Screen IDs must be unique.')
    if(!screenIds.has(design.homeScreenId)) errors.push('Choose an existing home screen in Screen designer.')
    for(const screen of design.screens) {
      if(screen.showFor&&!screenIds.has(screen.skipTo))errors.push('A conditional screen needs an existing skip destination.')
      for(const navigation of ['guided','explore'])if(!resolveScreenTarget(design,screen.id,navigation))errors.push('Conditional screen routes must lead to a visible screen without a cycle.')
      const automatic=screen.introVideo?.onEnd
      if(automatic?.type==='screen'&&!screenIds.has(automatic.screenId))errors.push('Intro video links to a missing screen.')
      if(automatic?.type==='link')errors.push('Intro video completion must open a screen or start the experience.')
      if(automatic?.type==='start'&&automatic.mode&&automatic.mode!=='auto'&&!story.project.modes.includes(automatic.mode))errors.push('Enable the intro video platform in Project & AR settings.')
      const elementIds=new Set()
      for(const element of screen.elements) {
        if(elementIds.has(element.id))errors.push('Element IDs must be unique within a screen.')
        elementIds.add(element.id)
        for(const layout of [element.layout,element.mobileLayout].filter(Boolean))if(layout.x+layout.width>100.01||layout.y+layout.height>100.01)errors.push('Keep screen elements inside the desktop and mobile artboards.')
        if(element.type!=='button')continue
        if(!Object.values(element.text||{}).some(v=>v.trim()))errors.push('Give each screen button a text or accessible label.')
        const action=element.action
        if(!action)errors.push('Choose an action for every screen button.')
        if(action?.type==='choice'&&!['guided','explore'].includes(action.navigation))errors.push('Choose Guided or Explore for a mode card.')
        if(action?.type==='language'&&!story.project.languages.includes(action.language))errors.push('Language buttons must use a story language.')
        if(action?.type==='screen'&&!screenIds.has(action.screenId))errors.push('A button links to a missing screen.')
        if(action?.type==='link'){try{if(!['https:','http:'].includes(new URL(action.url).protocol))throw Error()}catch{errors.push('Button links must be complete HTTP or HTTPS URLs.')}}
        if(action?.type==='start'&&action.mode&&action.mode!=='auto'&&!story.project.modes.includes(action.mode))errors.push('Enable the button’s platform in Project & AR settings, or change its action.')
      }
    }
    const visited=new Set(),queue=[design.homeScreenId];let canStart=false
    while(queue.length){const id=queue.shift();if(visited.has(id))continue;visited.add(id);const screen=design.screens.find(s=>s.id===id);for(const action of screenActions(screen)){if(action.type==='start')canStart=true;if(action.type==='screen')queue.push(action.screenId)}}
    if(!canStart)errors.push('Connect the home screen to a Start experience button so readers can enter your story.')
  }
  return errors
}
