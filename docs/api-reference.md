# API Reference

Programmatic interface for the Spatial Journalism Engine.

## Engine Class

### Initialization

```javascript
import Engine from 'spatial-journalism-engine'

// Create instance
const engine = new Engine({
  container: document.getElementById('app'),
  onReady: (engine) => console.log('Ready'),
  onSceneChange: (from, to) => console.log(`${from} -> ${to}`),
  onComplete: () => console.log('Experience complete'),
  onError: (error) => console.error(error)
})

// Initialize with story
await engine.init('./story.json')
// or
await engine.init(storyObject)
```

### Quick Start

```javascript
// One-liner initialization
const engine = await Engine.init({
  storyUrl: './story.json',
  container: document.getElementById('app')
})
```

### Methods

#### Scene Navigation

```javascript
// Go to specific scene
engine.goToScene('scene2')

// Next/previous scene
engine.nextScene()
engine.previousScene()

// Skip current scene
engine.skipScene()
```

#### Playback Control

```javascript
// Pause all audio/video
engine.pause()

// Resume playback
engine.resume()

// Recenter camera (AR mode)
engine.recenter()
```

#### State

```javascript
// Get current scene
const scene = engine.getCurrentScene()

// Get all scenes
const scenes = engine.getScenes()

// Get story configuration
const story = engine.getStory()
```

#### Language

```javascript
// Change language
engine.setLanguage('fi')
```

#### Cleanup

```javascript
// Dispose of all resources
engine.dispose()
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `isInitialized` | boolean | Engine initialized |
| `isRunning` | boolean | Experience is running |
| `mode` | string | Current mode (ar/3d) |
| `story` | object | Loaded story config |

### Events

```javascript
// Scene change
engine.onSceneChange = (fromId, toId) => {}

// Experience complete
engine.onComplete = () => {}

// Error handling
engine.onError = (error) => {}
```

## Individual Managers

For advanced usage, access managers directly:

### AudioManager

```javascript
const { audioManager } = engine

// Load audio
await audioManager.loadAudio('myAudio', {
  url: 'audio.mp3',
  volume: 0.8,
  positional: true,
  position: { x: 0, y: 0, z: 5 }
})

// Control playback
audioManager.play('myAudio')
audioManager.pause('myAudio')
audioManager.stop('myAudio')

// Volume
audioManager.setVolume('myAudio', 0.5)

// Fade out
await audioManager.fadeOut('myAudio', 1000)

// Check state
const isPlaying = audioManager.isPlaying('myAudio')
const time = audioManager.getCurrentTime('myAudio')
```

### VideoManager

```javascript
const { videoManager } = engine

// Create video projection
await videoManager.createVideo({
  id: 'myVideo',
  url: 'video.mp4',
  position: { x: -10, y: 0, z: 0 },
  rotation: { x: 0, y: Math.PI / 2, z: 0 },
  size: [64, 40]
})

// Control playback
videoManager.play('myVideo')
videoManager.pause('myVideo')
videoManager.stop('myVideo')

// Visibility
videoManager.show('myVideo')
videoManager.hide('myVideo')

// Transitions
await videoManager.fadeIn('myVideo', 500)
await videoManager.fadeOut('myVideo', 500)

// State
const hasEnded = videoManager.hasEnded('myVideo')
const duration = videoManager.getDuration('myVideo')
```

### CharacterManager

```javascript
const { characterManager } = engine

// Load character
const model = await characterManager.loadCharacter('char1', {
  model: 'character.glb',
  position: { x: 0, y: -10, z: 0 },
  scale: 5,
  animation: 'Talking'
})

// Fade effects
characterManager.fadeInCharacter('char1', 1000, 0.7)
characterManager.fadeOutCharacter('char1', 1000)

// Remove
characterManager.removeCharacter('char1')

// Update animations (call in render loop)
characterManager.update(deltaTime)
```

### LightingManager

```javascript
const { lightingManager } = engine

// Apply scene lighting
lightingManager.applySceneLighting({
  ambient: 0.5,
  directional: 0.8,
  hemisphere: 0.4
})

// Restore defaults
lightingManager.restoreOriginalLighting()

// Add dynamic lights
const pointLight = lightingManager.addPointLight({
  color: 0xffaa00,
  intensity: 1,
  position: { x: 5, y: 3, z: 0 }
})

// Enable flicker
lightingManager.enableFlicker(pointLight, {
  minIntensity: 0.3,
  maxIntensity: 1.0
})
```

### SceneManager

```javascript
const { sceneManager } = engine

// Activate scene
await sceneManager.activateScene('scene2')

// Change scene with transition
await sceneManager.changeScene('scene3')

// Get scene data
const current = sceneManager.getCurrentScene()
const all = sceneManager.getAllScenes()
const scene = sceneManager.getScene('scene1')
```

### UIManager

```javascript
const { uiManager } = engine

// Create screens
uiManager.createHomeScreen()

// Control visibility
uiManager.show('homeScreen')
uiManager.hide('homeScreen')

// Loading
uiManager.showLoading('Loading assets...')
uiManager.updateLoadingProgress(0.5)
uiManager.hideLoading()

// Language
uiManager.setLanguage('en')
```

## JSONParser

```javascript
import { JSONParser } from 'spatial-journalism-engine'

const parser = new JSONParser()

// Load schema
await parser.loadSchema('./schema/story.schema.json')

// Validate story
const validation = parser.validate(storyObject)
if (!validation.isValid) {
  console.error(validation.errors)
}

// Parse and normalize
const story = await parser.parse('./story.json')

// Get localized string
const title = parser.getLocalizedString(story.ui.homeScreen.title, 'fi')
```

## AssetLoader

```javascript
import { AssetLoader } from 'spatial-journalism-engine'

const loader = new AssetLoader()
loader.init()

// Preload assets
await loader.preload([
  'model.glb',
  'audio.mp3',
  'video.mp4'
], (progress) => {
  console.log(`${progress * 100}% loaded`)
})

// Load single asset
const gltf = await loader.load('model.glb')
const texture = await loader.load('texture.jpg')

// Check cache
if (loader.has('model.glb')) {
  const cached = loader.get('model.glb')
}

// Clear cache
loader.clear('model.glb')
loader.clearAll()
```

## TypeScript Support

The engine includes TypeScript definitions:

```typescript
import Engine, { 
  AudioManager, 
  VideoManager, 
  SceneManager,
  StoryConfig,
  SceneConfig 
} from 'spatial-journalism-engine'

const engine: Engine = await Engine.init({
  storyUrl: './story.json'
})

const scene: SceneConfig = engine.getCurrentScene()
```
