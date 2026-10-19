import type { InteractiveObjectConfig } from '../state/types'
import * as THREE from 'three'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { useStore } from '../state/store.ts'
export type StarterKind = 'gallery' | 'field' | 'interview' | 'exhibit'
export const starterTemplates = [
  {
    id: 'gallery' as const,
    title: 'Gallery walkthrough',
    category: 'Spatial exhibition',
    description: 'A composed gallery with a guided route, inspectable sculptures and a light-led final chapter.'
  },
  {
    id: 'field' as const,
    title: 'The story on the ground',
    category: 'Tabletop AR · spatial reporting',
    description:
      'An illustrated city, three reporting angles and an inspectable landmark, ready for tabletop AR.'
  },
  {
    id: 'interview' as const,
    title: 'In their own words',
    category: 'Interview · oral history',
    description:
      'A quiet interview set with three camera compositions and space for testimony, context and sources.'
  },
  {
    id: 'exhibit' as const,
    title: 'One object, many stories',
    category: 'Museum · object storytelling',
    description:
      'An artifact you can lift and inspect, with a guided orbit, detail lighting and a three-part narrative.'
  }
]
export async function createStarter(kind: StarterKind = 'gallery') {
  const scene = new THREE.Scene()
  const inspectable: Array<{ mesh: THREE.Mesh; title: string; text: string }> = []
  const inspect = (mesh: THREE.Mesh, title: string, text: string) => { inspectable.push({mesh,title,text}); return mesh }
  const material = (color: string) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.8 })
  const chalk = material('#e9e6df'),
    pale = material('#dad8d2'),
    green = material('#242424'),
    brass = material('#edc93b')
  const box = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    mat: THREE.Material
  ) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
    m.position.set(x, y, z)
    scene.add(m)
    return m
  }
  if (kind === 'gallery') {
    box(0, -0.15, 0, 8, 0.3, 6, chalk)
    box(-4, 1.1, 0, 0.16, 2.5, 6, pale)
    box(0, 1.1, -3, 8, 2.5, 0.16, chalk)
    box(-1.7, 0.45, -0.7, 1.4, 0.9, 1.4, chalk)
    box(1.6, 0.3, 0.6, 1.2, 0.6, 1.2, pale)
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.65, 0.17, 20, 64),
      green
    )
    ring.position.set(-1.7, 1.6, -0.7)
    ring.rotation.y = 0.25
    inspect(ring, 'Form and material', 'An example sculpture. Replace this with your object, its provenance and the detail you want readers to notice.')
    const sculpture = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.58, 0),
      brass
    )
    sculpture.position.set(1.6, 1.2, 0.6)
    sculpture.rotation.y = 0.3
    inspect(sculpture, 'A different perspective', 'Tap to bring the object closer. Replace this example with a sourced artifact and a concise explanation.')
    box(0.5, 1.3, -2.85, 1.5, 0.95, 0.07, green)
  } else if (kind === 'field') {
    box(0, -0.15, 0, 7, 0.3, 6, chalk)
    box(0, 0.02, 0, 7, 0.03, 0.5, green)
    box(-0.6, 0.02, 0, 0.5, 0.03, 6, green)
    for (const [x, z, h] of [
      [-2, -1.5, 1.2],
      [1, -1.5, 1.9],
      [2.4, -1.5, 0.8],
      [-2, 1.4, 0.7],
      [1, 1.4, 1],
      [2.4, 1.4, 1.5]
    ]) {
      box(x, h / 2, z, 0.9, h, 0.9, pale)
      box(x, h + 0.03, z, 0.92, 0.06, 0.92, brass)
    }
  } else if (kind === 'interview') {
    box(0, -0.15, 0, 7, 0.3, 6, chalk)
    box(0, 1.3, -2.8, 7, 3, 0.12, pale)
    for (const x of [-1.3, 1.3]) {
      box(x, 0.55, 0, 0.9, 0.18, 0.9, green)
      box(x, 1.1, -0.4, 0.9, 1.1, 0.12, green)
      for (const dx of [-0.32, 0.32])
        for (const dz of [-0.32, 0.32])
          box(x + dx, 0.25, dz, 0.08, 0.5, 0.08, green)
    }
    box(0, 0.3, 0.5, 0.7, 0.6, 0.7, brass)
    box(-2.6, 1.4, -1.5, 0.05, 2.8, 0.05, green)
    box(-2.6, 2.8, -1.5, 0.9, 0.08, 0.7, brass)
    box(0.8, 1.7, -2.7, 2, 0.7, 0.06, chalk)
  } else {
    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(1.05, 1.05, 0.7, 64),
      chalk
    )
    plinth.position.y = 0.35
    scene.add(plinth)
    const artifact = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.45, 0.13, 96, 12),
      brass
    )
    artifact.position.y = 1.25
    inspect(artifact, 'The artifact', 'This is an illustrative form. Add your own model and explain who made it, where it came from and why it matters.')
    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(3.3, 3.3, 0.18, 64),
      pale
    )
    floor.position.y = -0.09
    scene.add(floor)
    for (let a = 0; a < 3; a++) {
      const angle = (a * Math.PI * 2) / 3
      const panel = box(
        Math.sin(angle) * 2.6,
        1,
        Math.cos(angle) * 2.6,
        1.35,
        1.8,
        0.08,
        chalk
      )
      panel.rotation.y = angle
    }
  }
  if (kind === 'field' || kind === 'interview') {
    const object = kind === 'field'
      ? new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,.65,32),brass)
      : new THREE.Mesh(new THREE.BoxGeometry(.65,.04,.45),brass)
    object.position.set(...(kind==='field' ? [1,.4,.45] as [number,number,number] : [0,.64,.5] as [number,number,number]))
    inspect(object, kind==='field' ? 'The reporting location' : 'The source notebook', kind==='field' ? 'An illustrative marker. Replace this text with the location, date and sources behind your reporting.' : 'Use this object to share context, sources and how this interview was recorded. This starter contains no recorded testimony.')
  }
  const objectFiles: Record<string,File> = {}
  const objectConfigs: InteractiveObjectConfig[] = []
  for (const [index,item] of inspectable.entries()) {
    const position = item.mesh.position.toArray() as [number,number,number]
    const rotation = [item.mesh.rotation.x,item.mesh.rotation.y,item.mesh.rotation.z] as [number,number,number]
    const clone = item.mesh.clone(); clone.position.set(0,0,0); clone.rotation.set(0,0,0)
    const path = 'models/'+kind+'-detail-'+(index+1)+'.glb'
    const data = await new GLTFExporter().parseAsync(clone,{binary:true})
    objectFiles[path]=new File([data as ArrayBuffer],path,{type:'model/gltf-binary'})
    objectConfigs.push({unlit:false,id:kind+'-detail-'+(index+1),name:{en:item.title},model:path,original:{position,rotation,scale:[1,1,1] as [number,number,number]},transformed:{position:[position[0],position[1]+.35,position[2]+.3] as [number,number,number],rotation,scale:[1.5,1.5,1.5] as [number,number,number]},hasInfoBox:true,infoBoxMessage:{en:item.text},enableRotation:kind!=='interview'})
  }
  const result = await new GLTFExporter().parseAsync(scene, { binary: true })
  scene.traverse((o) => {
    if (o instanceof THREE.Mesh) o.geometry.dispose()
  })
  const file = new File([result as ArrayBuffer], kind + '.glb', {
    type: 'model/gltf-binary'
  })
  const store = useStore.getState()
  store.resetStory()
  store.addAssetFile('models/' + kind + '.glb', file)
  for (const [path,asset] of Object.entries(objectFiles)) store.addAssetFile(path,asset)
  store.updateStory(
    (d) => {
      d.project.title = starterTemplates.find((t) => t.id === kind)!.title
      d.project.modes = ['3d', 'ar', 'vr']
      d.interactableObjects = objectConfigs
      d.camera.chooseMode = true
      d.camera.defaultMode = 'guided'
      d.camera.navigation = 'standard'
      d.project.assets.environment = 'models/' + kind + '.glb'
      d.project.assets.preload = []
      d.environment = { scale: 1, position: [0, 0, 0] }
      d.camera.initialPosition = [4, 2.5, 5]
      d.camera.initialRotation = [-0.25, 0.6, 0]
      d.camera.recenterPosition = [4, 2.5, 5]
      d.camera.recenterRotation = [-0.25, 0.6, 0]
      d.camera.bounds = {
        minX: -10,
        maxX: 10,
        minY: 0,
        maxY: 8,
        minZ: -10,
        maxZ: 10
      }
      d.lighting.ambient = { color: '#ffffff', intensity: 1 }
      d.lighting.directional = {
        color: '#ffffff',
        intensity: 2,
        position: [3, 8, 5]
      }
      d.rendering = { toneMapping: 'ACESFilmic', toneMappingExposure: 1 }
      d.particles = undefined
      d.ui.homeScreen.title = { en: d.project.title }
      d.ui.homeScreen.subtitle = { en: 'An example space. Make it your own.' }
      d.ui.branding.primaryColor = '#222222'
      d.scenes = [
        {
          id: 'scene1',
          title: { en: 'Step inside' },
          duration: 24,
          audio: [],
          characters: [],
          videos: [],
          lighting: {},
          subtitles: [
            {
              id: 's1',
              start: 0,
              end: 18,
              text: {
                en: 'Every place has a story. This is where yours begins.'
              }
            }
          ]
        },
        {
          id: 'scene2',
          title: { en: 'Look a little closer' },
          duration: 12,
          audio: [],
          characters: [],
          videos: [],
          lighting: {},
          subtitles: [
            {
              id: 's2',
              start: 0,
              end: 8,
              text: {
                en: 'Add a voice, an object or a moment that deserves a closer look.'
              }
            }
          ]
        },
        {
          id: 'scene3',
          title: { en: 'A new perspective' },
          duration: 12,
          audio: [],
          characters: [],
          videos: [],
          lighting: {},
          subtitles: [
            {
              id: 's3',
              start: 0,
              end: 8,
              text: {
                en: 'Bring the story together. What would you like your audience to take away?'
              }
            }
          ]
        }
      ]
      const chapters: Record<StarterKind, string[]> = {
        gallery: ['Step inside', 'Look a little closer', 'A new perspective'],
        field: ['The place', 'What changed', 'What comes next'],
        interview: ['Meet the speaker', 'A turning point', 'In their words'],
        exhibit: ['The object', 'The hidden detail', 'Why it matters']
      }
      const captions: Record<StarterKind, string[]> = {
        gallery: [
          'Welcome to the exhibition. Replace this caption with your opening.',
          'Introduce the details your audience should notice.',
          'Bring the story together with your final thought.'
        ],
        field: [
          'This model is an illustrative place. Introduce your reporting location here.',
          'Add evidence and explain what changed. Replace the example city with your own model.',
          'What does the audience need to understand about the future of this place?'
        ],
        interview: [
          'Introduce your speaker. Add their recording from the media library.',
          'Give the audience context for the story they are about to hear.',
          'Close with a quote, reflection or source. Replace this text with your own reporting.'
        ],
        exhibit: [
          'Introduce the artifact and where it comes from.',
          'Invite the audience to look closer at a revealing detail.',
          'Explain why this object matters today.'
        ]
      }
      d.scenes.forEach((chapter, index) => {
        chapter.title = { en: chapters[kind][index] }
        chapter.subtitles[0].text = { en: captions[kind][index] }
      })
      if (kind === 'field') {
        d.environment.scale = 0.18
        d.camera.initialPosition = [1, 1.1, 1.4]
        d.camera.initialRotation = [-0.5, 0.5, 0]
        d.camera.recenterPosition = [...d.camera.initialPosition]
        d.camera.recenterRotation = [...d.camera.initialRotation]
      }
      const views: Record<StarterKind, Array<[[number,number,number],[number,number,number]]>> = {
        gallery: [[[3.8,2.3,5],[0,1,-.5]],[[.5,1.8,2.7],[-1.7,1.5,-.7]],[[3.5,1.9,3.2],[1.6,1.2,.6]]],
        field: [[[1.1,1.1,1.4],[0,.15,0]],[[.9,.65,.65],[.18,.15,-.15]],[[-.8,.8,.9],[0,.15,0]]],
        interview: [[[3,2,4.5],[0,1,0]],[[.4,1.6,3],[-1.3,1.1,0]],[[-2.6,1.8,3.2],[.4,1,0]]],
        exhibit: [[[3.5,2.2,4],[0,1,0]],[[1.8,1.7,2],[0,1.25,0]],[[-3.2,2,3],[0,1.1,0]]]
      }
      const rotationFor = (position:[number,number,number], target:[number,number,number]):[number,number,number] => {
        const c=new THREE.PerspectiveCamera();c.position.fromArray(position);c.lookAt(new THREE.Vector3(...target));return [c.rotation.x,c.rotation.y,c.rotation.z]
      }
      d.camera.initialPosition=views[kind][0][0]
      d.camera.initialRotation=rotationFor(...views[kind][0])
      d.camera.recenterPosition=[...d.camera.initialPosition]
      d.camera.recenterRotation=[...d.camera.initialRotation]
      d.camera.buffer=0
      d.camera.guided={}
      d.scenes.forEach((chapter,i) => {
        const [position,target]=views[kind][i]
        const closer=position.map((v,j) => target[j]+(v-target[j])*.85) as [number,number,number]
        d.camera.guided![chapter.id]=[
          {id:chapter.id+'-arrival',time:0,position,rotation:rotationFor(position,target),duration:3500,easing:'sine'},
          {id:chapter.id+'-detail',time:12,position:closer,rotation:rotationFor(closer,target),duration:5000,easing:'sine'}
        ]
        chapter.activateInteractionOutlines=true
        chapter.lighting.modifiers={ambient:i===1 ? .75 : 1,directional:1,hemisphere:1}
        chapter.subtitles.push({id:chapter.id+'-prompt',start:19,end:23,text:{en:i===0 ? 'Try dragging to choose your own viewpoint.' : i===1 ? 'Tap the highlighted object to inspect it.' : 'Continue to the closing note when you are ready.'}})
      })
      d.scenes[2].lighting.walkingTour={waypoints:[{id:'light-start',time:0,position:[-1,1,0],intensity:1.5},{id:'light-detail',time:8,position:[1,1,.4],intensity:2},{id:'light-end',time:18,position:[0,1,0],intensity:1.5}],dimLights:{ambient:.5,directional:.65,hemisphere:.5},endLights:{ambient:1,directional:1,hemisphere:1},guidanceText:{en:'Notice how light changes what you see.'}}
      d.ending.triggerMode='audioEnd'
      d.ending.text = { en: 'Every detail needs a source.\n\nUse this space for your conclusion, credits and the evidence behind your story.' }
      d.ending.quotes=[]
      d.ending.buttons={returnHome:{en:'Explore again'}}
    },
    'Create ' + kind + ' starter'
  )
  store.setActiveScene('scene1')
}
