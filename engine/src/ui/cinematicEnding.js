import { createEndingPlayback } from './endingPlayback.js'
/** Timed closing sequence, shared by author preview and the audience player. */
export const cinematicDefaults={fadeIn:4,textDelay:2,textDuration:13,textFade:3,quoteFade:2,videoDelay:1,actionsDelay:1,videoOn:'all',muted:true,quoteTimings:[]}
export function endingTimeline(config) {
 const c={...cinematicDefaults,...config.cinematic}
 const textStart=c.fadeIn+c.textDelay, textEnd=textStart+c.textDuration, quoteStart=textEnd+c.textFade
 let cursor=quoteStart
 const quotes=(config.quotes||[]).map((_,index)=>{const timing=c.quoteTimings[index]||{hold:4,gap:2};const entry={index,start:cursor,fadeStart:cursor+timing.hold,end:cursor+timing.hold+timing.gap};cursor=entry.end;return entry})
 return {settings:c,textStart,textEnd,quoteStart,quotes,videoStart:quoteStart+c.videoDelay,duration:cursor+c.actionsDelay}
}
const fraction=(value,duration)=>duration>0?Math.max(0,Math.min(1,value/duration)):1
export function sampleEnding(config,time) {
 const t=endingTimeline(config), clock=Math.max(0,time), quote=t.quotes.find(q=>clock>=q.start&&clock<q.end)
 const textOpacity=clock<t.textStart?0:clock<t.textEnd?fraction(clock-t.textStart,t.settings.textFade):1-fraction(clock-t.textEnd,t.settings.textFade)
 const quoteOpacity=!quote?0:clock<quote.fadeStart?fraction(clock-quote.start,t.settings.quoteFade):1-fraction(clock-quote.fadeStart,t.settings.quoteFade)
 return {duration:t.duration,overlayOpacity:fraction(clock,t.settings.fadeIn),textOpacity,quoteIndex:quote?.index??-1,quoteOpacity,videoVisible:clock>=t.videoStart&&clock<t.duration,videoTime:Math.max(0,clock-t.videoStart),complete:clock>=t.duration}
}
export function renderCinematicEnding(host,config,options={}) {
 const local=value=>typeof value==='string'?value:value?.[options.language||'en']||value?.en||Object.values(value||{})[0]||''
 const c={...cinematicDefaults,...config.cinematic},timeline=endingTimeline(config)
 host.replaceChildren();host.style.cssText='position:relative;width:100%;height:100%;min-height:300px;overflow:hidden;color:#fff;font:18px/1.6 '+(options.font||'Arial, sans-serif')+';isolation:isolate'
 const backdrop=document.createElement('div');backdrop.style.cssText='position:absolute;inset:0;background:#000';host.appendChild(backdrop)
 const video=document.createElement('video');video.playsInline=true;video.muted=c.muted;video.preload='metadata';video.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none';video.setAttribute('aria-label','Ending film')
 const showFilm=config.video&&c.videoOn!=='none'&&(c.videoOn!=='mobile'||options.mobile)
 if(showFilm){video.src=options.resolveAsset?.(config.video)||config.video;host.appendChild(video)}
 const message=document.createElement('p');message.textContent=local(config.text);message.style.cssText='position:absolute;top:50%;left:10%;width:80%;transform:translateY(-50%);text-align:center;white-space:pre-line;margin:0;font-size:clamp(16px,2vw,22px)';host.appendChild(message)
 const quote=document.createElement('p');quote.style.cssText='position:absolute;top:20%;left:10%;width:80%;text-align:center;white-space:pre-line;margin:0;font-size:clamp(17px,2vw,24px)';quote.setAttribute('aria-live','polite');host.appendChild(quote)
 const actions=document.createElement('div');actions.style.cssText='position:absolute;left:10%;right:10%;bottom:20%;display:flex;gap:12px;flex-wrap:wrap;justify-content:center';host.appendChild(actions)
 const buttonStyle='padding:10px 20px;border:1px solid #fff;background:#0008;color:#fff;font:inherit;cursor:pointer;text-decoration:none;border-radius:0'
 if(config.buttons?.learnMore?.url){try{const url=new URL(config.buttons.learnMore.url);if(['http:','https:'].includes(url.protocol)){const link=document.createElement('a');link.href=url.href;link.rel='noopener noreferrer';link.target='_blank';link.textContent=local(config.buttons.learnMore)||'Learn more';link.style.cssText=buttonStyle;actions.appendChild(link)}}catch{}}
 const replay=document.createElement('button');replay.textContent=local(config.buttons?.returnHome)||'Return to story';replay.style.cssText=buttonStyle;replay.onclick=()=>options.onReplay?.();actions.appendChild(replay)
 const controls=document.createElement('div');controls.style.cssText='position:absolute;left:12px;right:12px;bottom:12px;display:flex;gap:8px;align-items:center;justify-content:center;font-size:13px';host.appendChild(controls)
 const pause=document.createElement('button');pause.textContent='Pause ending';pause.style.cssText=buttonStyle;controls.appendChild(pause)
 const seek=document.createElement('input');seek.type='range';seek.min='0';seek.max=String(timeline.duration);seek.step='.1';seek.setAttribute('aria-label','Ending playhead');seek.style.cssText='width:clamp(80px,25%,240px);accent-color:#fff';controls.appendChild(seek)
 const skip=document.createElement('button');skip.textContent='Skip ending';skip.style.cssText=buttonStyle;controls.appendChild(skip)
 const playFilm=document.createElement('button');playFilm.textContent='Play ending film';playFilm.style.cssText=buttonStyle+';position:absolute;right:12px;top:12px';playFilm.hidden=true;host.appendChild(playFilm)
 const playback=options.playback||createEndingPlayback()
 let elapsed=0,paused=false,linked=false,disposed=false,last=performance.now(),frame,previousQuote=-2,videoFailed=false
 const sync=(delta=0)=>{const state=playback.sample(delta);elapsed=state.elapsed;paused=state.paused;linked=state.linked}
 const paint=()=>{
  const state=sampleEnding(config,elapsed);backdrop.style.opacity=String(state.overlayOpacity);message.style.opacity=String(state.textOpacity);message.hidden=state.textOpacity<=0
  if(state.quoteIndex!==previousQuote){quote.textContent=state.quoteIndex<0?'':local(config.quotes[state.quoteIndex]);previousQuote=state.quoteIndex}
  quote.style.opacity=String(state.quoteOpacity);quote.hidden=state.quoteOpacity<=0;actions.hidden=!state.complete;actions.style.display=state.complete?'flex':'none'
  playFilm.hidden=!state.videoVisible||!videoFailed;pause.hidden=state.complete&&!linked;skip.hidden=state.complete||linked;seek.value=String(Math.min(elapsed,timeline.duration))
  pause.textContent=paused?'Play ending':'Pause ending';seek.disabled=linked;seek.title=linked?'Follows chapter narration':''
  if(showFilm){video.hidden=!state.videoVisible;if(!state.videoVisible||paused)video.pause();else if(!videoFailed){if(Number.isFinite(video.duration)&&Math.abs(video.currentTime-state.videoTime)>.5)video.currentTime=Math.min(state.videoTime,video.duration);if(video.paused&&!video.ended)video.play().catch(()=>{if(!disposed){videoFailed=true;playFilm.hidden=false}})}}
 }
 playFilm.onclick=()=>{playback.setPaused(false);sync();if(paused)return;video.play().then(()=>{videoFailed=false;playFilm.hidden=true}).catch(()=>{playFilm.textContent='Film unavailable';playFilm.disabled=true})}
 pause.onclick=()=>{sync();playback.setPaused(!paused);sync();last=performance.now();paint()}
 seek.oninput=()=>{playback.seek(Number(seek.value));sync();last=performance.now();paint()}
 skip.onclick=()=>{playback.seek(timeline.duration);sync();paint();if(!linked)replay.focus()}
 const tick=now=>{if(disposed)return;sync((now-last)/1000);last=now;paint();frame=requestAnimationFrame(tick)}
 sync();paint();frame=requestAnimationFrame(tick)
 return ()=>{disposed=true;cancelAnimationFrame(frame);video.pause();video.removeAttribute('src');video.load();host.replaceChildren()}
}

/** Chapter-clock trigger keeps pauses, seeking and original fade thresholds consistent. */
export function characterEndingTime(character,ending={}) {
 if(!(character.duration>0))return Infinity
 const opacity=character.opacity??.7,threshold=Math.max(0,Math.min(opacity,ending.triggerOpacity||0))
 const fadeOut=character.fadeOut??character.fadeOutDuration??1000
 const crossing=opacity>0?character.duration-fadeOut*threshold/opacity:character.duration
 return ((character.delay||0)+Math.max(character.fadeIn??character.fadeInDuration??1000,crossing)+(ending.triggerDelay||0))/1000
}
