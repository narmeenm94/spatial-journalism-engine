// Keep direct manipulation and numeric controls inside the artboard.
export function clampScreenLayout(layout) {
  const finite=(value,fallback)=>Number.isFinite(value)?value:fallback
  const width=Math.min(100,Math.max(1,finite(layout.width,20)))
  const height=Math.min(100,Math.max(1,finite(layout.height,10)))
  return {x:Math.min(100-width,Math.max(0,finite(layout.x,0))),y:Math.min(100-height,Math.max(0,finite(layout.y,0))),width,height}
}
// One renderer powers the studio artboard and the audience's launch screens.
export function screenDesignMedia(design) {
  return (design?.screens || []).flatMap(s => [s.background?.image,s.background?.video,s.mobileBackground?.image,s.mobileBackground?.video,...Object.values(s.introVideo?.sources || {}),...(s.elements || []).flatMap(e=>[e.src,...Object.values(e.srcByLanguage || {})])]).filter(Boolean)
}
const local = value => typeof value === 'string' ? {en:value} : value || {en:''}
export function createScreenDesign(ui, title, preset='editorial') {
  const dark = preset === 'cinema', home=ui?.homeScreen || {}
  const element=(id,type,text,layout,mobileLayout,style={},action)=>({id,type,text:local(text),layout,mobileLayout,style:{fontSize:24,color:dark?'#ffffff':'#171717',background:'transparent',radius:8,align:'left',font:ui?.branding?.font||'Arial, sans-serif',...style},animation:'none',...(action?{action}:{})})
  const homeScreen={id:'home',name:'Welcome',background:{color:dark?'#171717':'#f7f5ed',image:home.backgroundImageDesktop || home.backgroundImage || '',video:'',overlay:dark?.45:0},mobileBackground:{color:dark?'#171717':'#f7f5ed',image:home.backgroundImage || home.backgroundImageDesktop || '',video:'',overlay:dark?.45:0},elements:[
    element('eyebrow','text',{en:'AN IMMERSIVE STORY'},{x:8,y:14,width:80,height:6},{x:8,y:15,width:84,height:6},{fontSize:14}),
    element('title','text',home.title || {en:title},{x:8,y:26,width:78,height:25},{x:8,y:28,width:84,height:24},{fontSize:56}),
    element('subtitle','text',home.subtitle || {en:'A place. A perspective. A story.'},{x:8,y:55,width:72,height:12},{x:8,y:56,width:84,height:13},{fontSize:22}),
    element('begin','button',home.startButton || {en:'Enter the story'},{x:8,y:76,width:28,height:10},{x:8,y:77,width:84,height:8},{fontSize:18,color:'#171717',background:'#f4d451',align:'center'},{type:'screen',screenId:'choose'})
  ]}
  const choose={id:'choose',name:'Choose your experience',background:{color:'#f7f5ed',image:'',video:'',overlay:0},elements:[
    element('choose-title','text',{en:'How will you explore?'},{x:8,y:20,width:84,height:18},{x:8,y:16,width:84,height:20},{fontSize:44,color:'#171717'}),
    element('guided','button',{en:'Take the guided tour'},{x:8,y:49,width:39,height:12},{x:8,y:44,width:84,height:10},{fontSize:19,color:'#171717',background:'#f4d451',align:'center'},{type:'start',mode:'auto',navigation:'guided'}),
    element('explore','button',{en:'Explore at my own pace'},{x:52,y:49,width:39,height:12},{x:8,y:58,width:84,height:10},{fontSize:19,color:'#171717',background:'#ffffff',align:'center'},{type:'start',mode:'auto',navigation:'explore'}),
    element('back','button',{en:'Back'},{x:8,y:78,width:20,height:8},{x:8,y:77,width:84,height:8},{fontSize:16,color:'#555555',align:'center'},{type:'screen',screenId:'home'})
  ]}
  if(preset==='choice') homeScreen.elements=choose.elements.map(e=>({...e,id:'home-'+e.id})).filter(e=>e.id!=='home-back')
  const design = {enabled:true,homeScreenId:'home',screens:[homeScreen,choose]}
  if(preset==='journey') addIntroFlow(design)
  return design
}
export function screenActions(screen) {
  return [...(screen?.elements || []).filter(e=>e.type==='button').map(e=>e.action).filter(Boolean), ...(screen?.introVideo?.onEnd ? [screen.introVideo.onEnd] : []), ...(screen?.skipTo ? [{type:'screen',screenId:screen.skipTo}] : [])]
}
export function mergeLaunchChoice(previous, action) {
  return {...previous, ...(action.mode && action.mode!=='auto' ? {mode:action.mode} : {}), ...(['guided','explore'].includes(action.navigation) ? {navigation:action.navigation} : {})}
}
export function resolveScreenTarget(design, id, navigation) {
  const visited=new Set()
  while(id && !visited.has(id)) {
    visited.add(id)
    const screen=design.screens.find(s=>s.id===id)
    if(!screen)return null
    if(!screen.showFor || screen.showFor===navigation)return screen
    id=screen.skipTo
  }
  return null
}
export function screenChoice(screen, previous={}) {
  return {...previous, navigation:previous.navigation || screen.defaultNavigation}
}
/** Add an editable tutorial/video sequence without discarding existing screens. */
export function addIntroFlow(design) {
  let prefix='intro', n=1
  while(design.screens.some(s=>s.id.startsWith(prefix+'-'))) prefix='intro'+(++n)
  const make=(id,type,text,layout,action,src)=>({id,type,text:{en:text},layout,mobileLayout:{...layout},style:{fontSize:type==='button'?18:32,color:'#171717',background:type==='button'?'#f4d451':'transparent',radius:3,align:'center',font:'Arial, sans-serif'},animation:'fade',...(action?{action}:{}),...(src?{src}:{})})
  const icon=path=>'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#171717" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="'+path+'"/></svg>')
  const lessons=[['Listen closely','Wear headphones to hear the voices and the space.','M12 36V28a20 20 0 0 1 40 0v8M12 34H8v18h12V34Zm40 0h4v18H44V34Z'],['Find your way','Drag to look and move. In AR, you can also move through the space.','M32 8v48M8 32h48M24 16l8-8 8 8M24 48l8 8 8-8M16 24l-8 8 8 8M48 24l8 8-8 8'],['Return to your view','Open the menu to recenter whenever you need it.','M16 20a22 22 0 1 1-4 25M8 10v16h16']]
  const first=prefix+'-0', videoId=prefix+'-video'
  for(const screen of design.screens) for(const element of screen.elements) if(element.action?.type==='start') element.action={...element.action,type:'screen',screenId:first}
  const pages=lessons.map(([title,text,path],i)=>({id:prefix+'-'+i,name:title,background:{color:'#f7f5ed',image:'',video:'',overlay:0},elements:[
    make('step','text',(i+1)+' / 3',{x:10,y:8,width:80,height:6}),
    make('icon','image',title,{x:39,y:22,width:22,height:22},undefined,icon(path)),
    make('title','text',title,{x:10,y:48,width:80,height:10}),
    {...make('instruction','text',text,{x:12,y:60,width:76,height:15}),style:{fontSize:20,color:'#555555',background:'transparent',radius:0,align:'center'}},
    make('next','button',i===2?'Continue':'Next',{x:52,y:84,width:38,height:9},{type:'screen',screenId:i===2?videoId:prefix+'-'+(i+1)}),
    make('skip','button','Skip tutorial',{x:10,y:84,width:38,height:9},{type:'screen',screenId:videoId})
  ]}))
  pages.push({id:videoId,name:'Intro video',background:{color:'#000000',image:'',video:'',overlay:0},introVideo:{sources:{},muted:false,onEnd:{type:'start',mode:'auto'}},elements:[make('skip','button','Skip intro',{x:5,y:4,width:27,height:9},{type:'start',mode:'auto'})]})
  design.screens.push(...pages)
  return first
}
export function renderDesignedScreen(host, screen, options={}) {
  const focusedElement=host.contains(document.activeElement)?document.activeElement?.dataset?.elementId:host.dataset.restoreElementFocus
  delete host.dataset.restoreElementFocus
  let active=true
  host.replaceChildren();host.classList.add('sj-designed-screen');host.style.cssText='position:relative;width:100%;height:100%;overflow:hidden;container-type:inline-size;isolation:isolate;'
  const mobile=!!options.mobile, background=(mobile && screen.mobileBackground)||screen.background||{}, resolve=options.resolveAsset||((p)=>p), videos=[], timers=[]
  host.style.backgroundColor=background.color||'#f7f5ed'
  const style=document.createElement('style');style.textContent=`
    .sj-designed-screen *{box-sizing:border-box}.sj-designed-screen .sd-element{position:absolute;display:flex;align-items:center;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.15;margin:0;border:0;padding:0;box-shadow:none;text-decoration:none;cursor:default;transition:box-shadow .15s;}
    .sj-designed-screen button.sd-element{cursor:pointer;padding:8px 12px;min-height:36px}.sj-designed-screen .sd-element[aria-pressed=true]{outline:2px solid currentColor;outline-offset:2px}.sj-designed-screen .sd-element:focus-visible{outline:3px solid #d6ad16;outline-offset:4px}.sj-designed-screen .sd-element[data-selected=true]{outline:2px solid #f4c929;outline-offset:4px;box-shadow:0 0 0 5px #2229}.sj-designed-screen .sd-edit{touch-action:none;cursor:move!important;user-select:none}.sj-designed-screen .sd-animation-fade{animation:sd-fade .8s both}.sj-designed-screen .sd-animation-rise{animation:sd-rise .8s both}.sj-designed-screen .sd-animation-pulse{animation:sd-pulse 2.5s ease-in-out infinite}.sj-designed-screen .sd-sprite{position:absolute;inset:0;background-repeat:no-repeat;pointer-events:none}.sj-designed-screen .sd-media{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none}
    .sj-designed-screen .sd-animation-drift-vertical{animation:sd-vertical 2s ease-in-out infinite}.sj-designed-screen .sd-animation-drift-horizontal{animation:sd-horizontal 2s ease-in-out infinite}.sj-designed-screen .sd-animation-depth{animation:sd-depth 2s ease-in-out infinite}.sj-designed-screen .sd-animation-breathe{animation:sd-breathe 2s ease-in-out infinite}
    .sj-designed-screen .sd-element[data-action=choice][aria-pressed=true]::after{content:'\\2713';position:absolute;top:8px;right:8px;width:20px;height:20px;display:grid;place-items:center;border:1px solid currentColor;border-radius:50%;font-size:12px;line-height:1}
    @keyframes sd-vertical{50%{transform:translateY(-30px)}}@keyframes sd-horizontal{0%,100%{transform:translateX(-15px)}50%{transform:translateX(15px)}}@keyframes sd-depth{50%{transform:translateY(-30px) scale(.8)}}@keyframes sd-breathe{50%{transform:scale(.8)}}
    @keyframes sd-fade{from{opacity:0}to{opacity:1}}@keyframes sd-rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}@keyframes sd-pulse{50%{opacity:.6}}@keyframes sd-sprite{to{background-position:100% 0}}@media(prefers-reduced-motion:reduce){.sj-designed-screen *{animation:none!important}}
  `;host.appendChild(style)
  if(background.image){const img=document.createElement('img');img.className='sd-media';img.alt='';img.src=resolve(background.image);host.appendChild(img)}
  if(background.video){const video=document.createElement('video');video.className='sd-media';video.muted=true;video.loop=true;video.playsInline=true;video.autoplay=true;video.src=resolve(background.video);if(background.image)video.poster=resolve(background.image);host.appendChild(video);videos.push(video);if(!matchMedia('(prefers-reduced-motion: reduce)').matches)video.play().catch(()=>{});else video.autoplay=false}
  const shade=document.createElement('div');shade.style.cssText='position:absolute;inset:0;pointer-events:none;background:#000;';shade.style.opacity=String(background.overlay||0);host.appendChild(shade)
  if(screen.introVideo) {
    const source=screen.introVideo.sources?.[options.language||'en'] || Object.values(screen.introVideo.sources||{})[0]
    if(source) {
      const video=document.createElement('video');video.src=resolve(source);video.playsInline=true;video.controls=!options.editing;video.muted=!!screen.introVideo.muted;video.preload='metadata'
      video.setAttribute('aria-label','Intro video');video.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000;'
      host.appendChild(video);videos.push(video)
      const fallback=document.createElement('button');fallback.type='button';fallback.textContent='Play intro';fallback.style.cssText='position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);padding:14px 24px;background:white;color:#171717;border:0;border-radius:3px;z-index:2;cursor:pointer';fallback.hidden=true
      fallback.onclick=()=>video.play().then(()=>{fallback.hidden=true}).catch(()=>{fallback.textContent='Video unavailable. Continue';fallback.onclick=()=>options.onAction?.(screen.introVideo.onEnd)})
      host.appendChild(fallback)
      video.onended=()=>{if(!active||options.editing)return;if(options.requireStartGesture&&screen.introVideo.onEnd.type==='start'){fallback.hidden=false;fallback.textContent='Enter experience';fallback.onclick=()=>options.onAction?.(screen.introVideo.onEnd)}else options.onAction?.(screen.introVideo.onEnd)}
      video.onerror=()=>{if(!active||options.editing)return;fallback.hidden=false;fallback.textContent='Video unavailable. Continue';fallback.onclick=()=>options.onAction?.(screen.introVideo.onEnd)}
      if(!options.editing)video.play().catch(()=>{if(active)fallback.hidden=false})
    } else {
      const note=document.createElement('p');note.textContent=options.editing?'Choose an intro video in Screen settings':'No intro video added. Use Skip intro to continue.';note.style.cssText='position:absolute;top:40%;left:10%;width:80%;text-align:center;color:#fff;font:20px sans-serif';host.appendChild(note)
    }
  }
  for(const element of screen.elements||[]){
    const box=(mobile&&element.mobileLayout)||element.layout, text=element.text?.[options.language||'en']||Object.values(element.text||{})[0]||'', settings=element.style||{}
    const node=document.createElement(options.editing||element.type==='button'?'button':element.type==='text'?'div':'img')
    if(node.tagName==='BUTTON')node.type='button'
    node.className='sd-element'+(options.editing?' sd-edit':' sd-animation-'+(element.animation||'none'));node.dataset.elementId=element.id;node.dataset.action=element.action?.type||'';node.dataset.selected=String(options.selectedId===element.id)
    Object.assign(node.style,{left:box.x+'%',top:box.y+'%',width:box.width+'%',height:box.height+'%',color:settings.color||'#171717',backgroundColor:settings.background||'transparent',borderRadius:(settings.radius||0)+'px',fontFamily:settings.font||'Arial, sans-serif',fontWeight:settings.fontWeight||400,fontStyle:settings.fontStyle||'normal',fontSize:'clamp(12px, '+((settings.fontSize||24)/(mobile?5:10))+'cqw, '+(settings.fontSize||24)+'px)',textAlign:settings.align||'left',justifyContent:settings.align==='center'?'center':settings.align==='right'?'flex-end':'flex-start'})
    if(settings.borderWidth)node.style.border=settings.borderWidth+'px solid '+(settings.borderColor||settings.color||'#fff')
    if(element.scrollable&&element.type==='text'){node.style.overflowY='auto';node.style.display='block';node.style.lineHeight='1.5';node.style.padding='12px';if(!options.editing)node.tabIndex=0}
    if(!options.editing&&element.showAfter>0){node.style.visibility='hidden';timers.push(setTimeout(()=>{if(active)node.style.visibility='visible'},element.showAfter*1000))}
    if(element.action?.type==='choice')node.setAttribute('aria-pressed',String(element.action.navigation===options.navigation))
    if(element.action?.type==='language')node.setAttribute('aria-pressed',String(element.action.language===options.language))
    if(options.editing&&element.type!=='button'){node.style.padding='0';node.style.minHeight='0'}
    node.setAttribute('aria-label',options.editing?'Select '+(text||element.type):text||'Image')
    const elementSrc=element.srcByLanguage?.[options.language||'en'] || element.src || Object.values(element.srcByLanguage||{})[0]
    if(elementSrc){
      if(node.tagName==='IMG'){node.src=resolve(elementSrc);node.alt=text;node.style.objectFit='contain'}
      else if(element.sprite?.frames>1){const sprite=document.createElement('span');sprite.className='sd-sprite';sprite.style.backgroundImage='url('+JSON.stringify(resolve(elementSrc))+')';sprite.style.backgroundSize=(element.sprite.frames*100)+'% 100%';if(!options.editing)sprite.style.animation='sd-sprite '+(element.sprite.frames/(element.sprite.fps||12))+'s steps('+(element.sprite.frames-1)+') infinite';node.appendChild(sprite)}
      else {const img=document.createElement('img');img.src=resolve(elementSrc);img.alt='';img.style.cssText='width:100%;height:100%;object-fit:contain;pointer-events:none';node.appendChild(img)}
    }else node.textContent=text
    if(element.description){
      const title=document.createElement('strong');title.textContent=text
      const detail=document.createElement('span');detail.textContent=element.description[options.language||'en']||element.description.en||Object.values(element.description)[0]||''
      detail.style.cssText='font-size:clamp(12px,.8em,16px);line-height:1.3;font-weight:400;max-width:95%'
      if(elementSrc){const art=node.firstElementChild;if(art)art.style.cssText='width:clamp(24px,4cqw,36px);height:clamp(24px,4cqw,36px);object-fit:contain;pointer-events:none;flex-shrink:0'}else node.textContent=''
      node.append(title,detail);node.style.flexDirection='column';node.style.gap='4px';node.style.justifyContent='center';node.style.padding='10px'
    }
    if(options.editing){
      node.setAttribute('aria-keyshortcuts','ArrowUp ArrowDown ArrowLeft ArrowRight')
      node.onkeydown=e=>{const direction={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!direction)return;e.preventDefault();e.stopPropagation();const step=e.shiftKey?5:1;options.onMove?.(element.id,clampScreenLayout({...box,x:box.x+direction[0]*step,y:box.y+direction[1]*step}))}
      if(options.selectedId===element.id){const handle=document.createElement('span');handle.className='sd-resize-handle';handle.setAttribute('aria-hidden','true');handle.title='Drag to resize';handle.style.cssText='position:absolute;right:0;bottom:0;width:16px;height:16px;background:#ffdf4d;border:2px solid #242424;border-radius:5px;cursor:nwse-resize;touch-action:none;z-index:2';node.appendChild(handle)}
      node.onclick=()=>options.onSelect?.(element.id)
      node.onpointerdown=e=>{if(e.button!==0)return;const resizing=e.target.classList.contains('sd-resize-handle'),start={x:e.clientX,y:e.clientY}, rect=host.getBoundingClientRect();let next={...box};node.setPointerCapture(e.pointerId)
        node.onpointermove=ev=>{const dx=(ev.clientX-start.x)/rect.width*100,dy=(ev.clientY-start.y)/rect.height*100;next=resizing?clampScreenLayout({...box,width:Math.min(100-box.x,box.width+dx),height:Math.min(100-box.y,box.height+dy)}):clampScreenLayout({...box,x:box.x+dx,y:box.y+dy});Object.assign(node.style,{left:next.x+'%',top:next.y+'%',width:next.width+'%',height:next.height+'%'})}
        const finish=ev=>{node.onpointermove=null;node.onpointerup=null;node.onpointercancel=null;if(node.hasPointerCapture(ev.pointerId))node.releasePointerCapture(ev.pointerId);if(Math.abs(next.x-box.x)+Math.abs(next.y-box.y)+Math.abs(next.width-box.width)+Math.abs(next.height-box.height)>.1)options.onMove?.(element.id,next);else options.onSelect?.(element.id)};node.onpointerup=finish;node.onpointercancel=ev=>{node.onpointermove=null;node.onpointerup=null;node.onpointercancel=null;if(node.hasPointerCapture(ev.pointerId))node.releasePointerCapture(ev.pointerId);Object.assign(node.style,{left:box.x+'%',top:box.y+'%',width:box.width+'%',height:box.height+'%'})}
      }
    }else if(element.type==='button')node.onclick=()=>options.onAction?.(element.action||{type:'start',mode:'auto'})
    host.appendChild(node)
    if(options.editing&&focusedElement===element.id)node.focus({preventScroll:true})
  }
  return ()=>{active=false;timers.forEach(clearTimeout);if(options.editing&&host.contains(document.activeElement))host.dataset.restoreElementFocus=document.activeElement.dataset.elementId||'';for(const v of videos){v.onended=null;v.onerror=null;v.pause();v.removeAttribute('src');v.load()}host.replaceChildren()}
}

/** A reusable selectable-card pattern, separate from the Continue action. */
export function addModeChooser(design) {
  let id='mode-choice',n=1
  while(design.screens.some(s=>s.id===id))id='mode-choice-'+(++n)
  const screen=createScreenDesign({},'','editorial').screens[1]
  screen.id=id;screen.name='Choose a mode';screen.defaultNavigation='explore';screen.elements.find(e=>e.id==='back').action.screenId=design.homeScreenId
  for(const e of screen.elements) {
    if(['guided','explore'].includes(e.id)) {
      e.action={type:'choice',navigation:e.id}
      e.description={en:e.id==='guided'?'Follow a gentle camera journey. You can still look around.':'Move at your own pace and discover the space.'}
      e.layout={...e.layout,y:40,height:26};e.mobileLayout={x:8,y:e.id==='guided'?34:59,width:84,height:20}
      e.style.borderWidth=1;e.style.borderColor='#b5b2a6';e.style.background='#fff'
    }
  }
  screen.elements.push({id:'continue',type:'button',text:{en:'Continue'},layout:{x:58,y:80,width:34,height:10},mobileLayout:{x:52,y:84,width:40,height:9},style:{fontSize:18,color:'#171717',background:'#f4d451',radius:3,align:'center'},animation:'none',action:{type:'start',mode:'auto'}})
  design.screens.push(screen)
  return id
}
