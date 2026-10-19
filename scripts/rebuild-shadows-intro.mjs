import fs from 'node:fs'
import path from 'node:path'
const original=path.resolve('../vcc-stabilisation-point/src')
const target=path.resolve('examples/shadows-rebuilt')
const story=JSON.parse(fs.readFileSync(path.join(target,'story.json'),'utf8'))
const read=p=>fs.readFileSync(path.join(original,p),'utf8')
const copy=p=>{fs.mkdirSync(path.dirname(path.join(target,'assets',p)),{recursive:true});fs.copyFileSync(path.join(original,'assets',p),path.join(target,'assets',p));return p}
for(const p of ['bg-video.mp4','icons/info-icon2.png','icons/close_button.svg','logos/HXRC_logo_white_PNG.png'])copy(p)
const css=read('styles/mode-selection.css')
for(const name of ['guided','exploration']) {
 const data=css.match(new RegExp('\\.'+name+'-icon \\{[\\s\\S]*?url\\("(data:[^"]+)"\\)'))[1]
 fs.writeFileSync(path.join(target,'assets/icons/'+name+'.svg'),decodeURIComponent(data.split(',').slice(1).join(',')))
}
const loc=(en,fi=en)=>({en,fi})
const box=(x,y,width,height)=>({x,y,width,height})
const element=(id,type,text,layout,mobileLayout,extra={})=>({id,type,text,layout,mobileLayout,style:{fontSize:20,color:'#ffffff',background:'transparent',radius:0,align:'center',font:'Arial, sans-serif'},animation:'none',...extra})
const button=(id,text,layout,mobileLayout,action,extra={})=>element(id,'button',text,layout,mobileLayout,{action,...extra,style:{fontSize:18,color:'#fff',background:'#00000080',radius:0,align:'center',font:'Arial, sans-serif',borderWidth:1,borderColor:'#ffffff',...extra.style}})
const img=(id,src,text,l,m,extra={})=>element(id,'image',text,l,m,{src,...extra})
const background={color:'#000000',image:'',video:'bg-video.mp4',overlay:0}
const screen=(id,name,elements,extra={})=>({id,name,background:{...background},elements,...extra})
const logos=()=>[img('yle','logos/Yle-logo_RGB_valkoinen.png',loc('Yle'),box(35,90,7,6),box(20,91,14,5)),img('hxrc','logos/HXRC_logo_white_PNG.png',loc('Helsinki XR Center'),box(58,90,7,6),box(66,91,14,5))]
const home=screen('home','Shadows welcome',[
 img('ulkolinja','logos/ulkolinja_logo_musta.png',loc('Ulkolinja'),box(42,5,16,8),box(30,5,40,7)),
 element('subtitle','text',loc('LIFE AND DEATH BATTLE AT THE FRONTLINE CLINIC','ELÄMÄ JA KUOLEMA TAISTELEVAT RINTAMAKLINIKALLA'),box(15,21,70,8),box(10,18,80,9)),
 img('title','images/bg-text.png',loc('Shadows of the stabilisation point','Rintamaklinikan varjot'),box(10,31,80,28),box(10,29,80,28),{srcByLanguage:{en:'images/bg-text.png',fi:'images/fin-bg-text.png'}}),
 element('language-label','text',loc('Language','Kieli'),box(20,63,20,6),box(10,61,25,6),{style:{fontSize:18,color:'#fff',background:'transparent',radius:0,align:'left',font:'Arial, sans-serif'}}),
 button('english',loc('ENGLISH'),box(47,63,15,6),box(39,61,24,6),{type:'language',language:'en'}),
 button('finnish',loc('SUOMI'),box(65,63,15,6),box(66,61,24,6),{type:'language',language:'fi'}),
 button('start',loc('START','ALOITA'),box(20,73,60,8),box(10,72,80,7),{type:'screen',screenId:'choose'}),
 button('info',loc('Info','Tiedot'),box(93,3,4,7),box(86,3,10,6),{type:'screen',screenId:'info'},{src:'icons/info-icon2.png',style:{borderWidth:0,radius:50}}),
 ...logos()
],{background:{color:'#000000',image:'images/bg_desktop.png',video:'',overlay:.4},mobileBackground:{color:'#000000',image:'images/home-page-image.jpg',video:'',overlay:.4}})
const choose=screen('choose','Choose mode',[
 element('title','text',loc('Choose Mode','Valitse tila'),box(15,19,70,8),box(10,13,80,7)),
 button('guided',loc('GUIDED','OHJATTU'),box(12,33,36,32),box(10,25,80,22),{type:'choice',navigation:'guided'},{src:'icons/guided.svg',description:loc("You are automatically guided through the experience. Recommended when you don't have space to move.",'Liikut automaattisesti kokemuksen läpi. Suositellaan jos sinulla ei ole tilaa liikkua.'),style:{borderColor:'#ffffff66'}}),
 button('explore',loc('EXPLORATION','TUTKIMUS'),box(52,33,36,32),box(10,51,80,22),{type:'choice',navigation:'explore'},{src:'icons/exploration.svg',description:loc('You can move freely in the space using your phone. The best option for exploring details.','Voit liikkua tilassa vapaasti puhelimesi avulla. Paras vaihtoehto yksityiskohtien tutkimiseen.'),style:{borderColor:'#ffffff66'}}),
 button('next',loc('NEXT','SEURAAVA'),box(40,75,20,8),box(30,80,40,7),{type:'screen',screenId:'tutorial-0'})
],{defaultNavigation:'guided'})
// Read the original text and icon layers, including the embedded animation inside the SVG files.
let tutorialSource=read('config/tutorials.js').replace(/^import .*$/gm,'')
const paths={phoneIcon:'icons/phone.svg',handIcon:'icons/hand.svg',arrowIcon:'icons/arrows.svg',headphones:'icons/headphones.svg',Moveicon:'icons/Moveicon.svg',Rotateicon:'icons/Rotateicon.svg',recenterIcon:'icons/recenter.png'}
for(const [key,value] of Object.entries(paths))tutorialSource='const '+key+'='+JSON.stringify(value)+';\n'+tutorialSource
const {tutorials}=await import('data:text/javascript;base64,'+Buffer.from(tutorialSource).toString('base64'))
const names=['Headphones','Move through the space','Recenter','Move with a finger','Look around']
const pages=tutorials.map((t,i)=>{
 const text=Object.fromEntries(Object.entries(t.text).map(([lang,value])=>[lang,value.replace(/<[^>]*>/g,'')]))
 const layers=[]
 if(i<3)layers.push(img('illustration',t.icon,loc(names[i]),box(i===2?44:40,34,i===2?12:20,30),box(i===2?35:22,34,i===2?30:56,30),{animation:i===1?'depth':i===2?'breathe':'none'}))
 else {
  layers.push(img('device',t.icon[2],loc('Gesture demonstration','Eleohje'),box(40,28,20,43),box(25,28,50,43)))
  layers.push(img('arrows',t.icon[0],loc('Direction','Suunta'),box(69,43,7,9),box(78,43,14,9)))
  layers.push(img('hand',t.icon[1],loc('Swipe gesture','Pyyhkäisyele'),box(45,42,10,15),box(39,42,22,15),{animation:i===3?'drift-vertical':'drift-horizontal'}))
 }
 const buttons=i===4?[button('next',loc('START','ALOITA'),box(40,83,20,7),box(25,83,50,7),{type:'screen',screenId:'intro-film'})]:[
 button('next',loc('NEXT','SEURAAVA'),box(40,79,20,7),box(25,79,50,7),{type:'screen',screenId:'tutorial-'+(i+1)}),
 button('skip',loc('SKIP','OHITA'),box(40,88,20,7),box(25,88,50,7),{type:'screen',screenId:'intro-film'})]
 return screen('tutorial-'+i,names[i],[element('instruction','text',text,box(15,14,70,16),box(6,12,88,18)),...layers,...buttons],i===1?{showFor:'explore',skipTo:'tutorial-2'}:{})
})
let infoSource=read('config/infoContent.js').split('// Create a proxy')[0].replace(/^import .*$/gm,'')
const {infoPageContentData:info}=await import('data:text/javascript;base64,'+Buffer.from(infoSource).toString('base64'))
const infoText=Object.fromEntries(['en','fi'].map(lang=>[lang,info.infoTextContent[lang].replace(/<br\s*\/?>(\s*)/g,'\n')+'\n\n'+info.creditsTitle[lang]+'\n\n'+info.credits.map(c=>c.role[lang]+'\n'+c.name).join('\n\n')+'\n\n'+info.copyrightText[lang]]))
const information=screen('info','Information and credits',[
 element('title','text',info.infoTitleText,box(15,8,70,8),box(10,8,80,7)),
 element('content','text',infoText,box(20,20,60,65),box(6,20,88,65),{scrollable:true,style:{fontSize:18,color:'#fff',background:'#00000055',radius:0,align:'left',font:'Arial, sans-serif'}}),
 button('close',loc('Close','Sulje'),box(93,3,4,7),box(86,3,10,6),{type:'screen',screenId:'home'},{src:'icons/close_button.svg',style:{borderWidth:0}}),...logos()
])
const film=screen('intro-film','Intro film',[button('skip',loc('SKIP','OHITA'),box(80,5,15,7),box(65,5,30,6),{type:'start',mode:'auto'},{showAfter:2})],{background:{color:'#000000',image:'',video:'',overlay:0},introVideo:{sources:{en:'video/Intro_EN.mp4',fi:'video/Intro_FIN.mp4'},muted:false,onEnd:{type:'start',mode:'auto'}}})
const endingSource=read('scenes/EndingSequence.js').replace(/^import .*$/gm,'')
const {EndingSequence}=await import('data:text/javascript;base64,'+Buffer.from(endingSource).toString('base64'))
const originalEnding=new EndingSequence()
story.formatVersion='1.1'
delete story.ending.endingTrigger
const fadeCharacter=story.scenes.find(s=>s.id==='scene4').characters.find(c=>c.id==='oleh-scene4')
Object.assign(fadeCharacter,{duration:69000,fadeIn:3000,fadeOut:66000})
story.ending={...story.ending,triggerMode:'characterFade',triggerOpacity:.05,triggerDelay:6000,text:originalEnding.texts,quotes:originalEnding.quotes,presentation:'cinematic',returnToTitle:true,cinematic:{fadeIn:4,textDelay:2,textDuration:13,textFade:3,quoteFade:2,videoDelay:1,actionsDelay:1,videoOn:'mobile',muted:true,quoteTimings:[{hold:3,gap:4},{hold:4,gap:2},{hold:2,gap:1},{hold:2,gap:1}]}}
story.ui.controls={...story.ui.controls,recenterPlacement:'overlay',recenterIcon:'icons/recenter.png'}
story.ui.screenDesigner={enabled:true,homeScreenId:'home',screens:[home,choose,...pages,film,information]}
for(const scene of story.scenes)for(const b of scene.sceneButtons||[])b.glow=true
const out=path.join(target,'story.json');fs.writeFileSync(out+'.tmp',JSON.stringify(story,null,2)+'\n');fs.renameSync(out+'.tmp',out)
console.log('Rebuilt source-derived intro: '+story.ui.screenDesigner.screens.length+' editable screens. Original source untouched.')
