# JSON Schema Reference

Complete reference for the `story.json` configuration file.

## Top-Level Structure

```json
{
  "project": { ... },
  "scenes": [ ... ],
  "ui": { ... },
  "ending": { ... }
}
```

## Project Configuration

```json
{
  "project": {
    "title": "Story Title",
    "version": "1.0",
    "languages": ["en", "fi"],
    "defaultLanguage": "en",
    "modes": ["ar", "3d"],
    "assets": {
      "basePath": "./assets/",
      "environment": "models/room.glb",
      "preload": ["models/character.glb"]
    }
  }
}
```

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `title` | string | Yes | - | Story title |
| `version` | string | No | "1.0" | Story format version |
| `languages` | string[] | No | ["en"] | Supported language codes |
| `defaultLanguage` | string | No | "en" | Default language |
| `modes` | string[] | No | ["ar", "3d"] | Available modes: ar, 3d, guided, exploration |
| `assets.basePath` | string | No | "./assets/" | Base path for all assets |
| `assets.environment` | string | Yes | - | Path to 3D environment model |
| `assets.preload` | string[] | No | [] | Assets to preload |

## Scenes

```json
{
  "scenes": [
    {
      "id": "scene1",
      "name": "Introduction",
      "audio": { ... },
      "characters": [ ... ],
      "objects": [ ... ],
      "videos": [ ... ],
      "lighting": { ... },
      "nextScene": "scene2"
    }
  ]
}
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | Yes | Unique scene identifier |
| `name` | string/object | Yes | Scene name (supports localization) |
| `audio` | object | No | Scene audio configuration |
| `characters` | array | No | Animated character models |
| `objects` | array | No | Static 3D objects |
| `videos` | array | No | Video projections |
| `lighting` | object | No | Lighting configuration |
| `nextScene` | string | No | ID of next scene (auto-advance) |

### Audio Configuration

```json
{
  "audio": {
    "url": "audio/narration.mp3",
    "volume": 0.5,
    "loop": false,
    "autoplay": true,
    "delay": 1000,
    "positional": false,
    "position": [0, 0, 0],
    "refDistance": 15,
    "maxDistance": 50,
    "waypoints": [
      { "time": 5, "position": [10, 0, 0] },
      { "time": 15, "position": [10, 0, 10] }
    ]
  }
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `url` | string | - | Path to audio file |
| `volume` | number | 0.5 | Volume (0-1) |
| `loop` | boolean | false | Loop audio |
| `autoplay` | boolean | true | Auto-play on scene start |
| `delay` | number | 0 | Delay before playing (ms) |
| `positional` | boolean | false | Enable 3D positional audio |
| `position` | number[] | [0,0,0] | Audio source position [x,y,z] |
| `refDistance` | number | 15 | Reference distance for falloff |
| `maxDistance` | number | 50 | Maximum audible distance |
| `waypoints` | array | [] | Position waypoints for moving audio |

### Character Configuration

```json
{
  "characters": [
    {
      "id": "narrator",
      "model": "models/character.glb",
      "position": [0, -10, -5],
      "scale": 10,
      "rotation": [0, 45, 0],
      "animation": "Talking",
      "delay": 0,
      "opacity": 0.7
    }
  ]
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `id` | string | auto | Unique character ID |
| `model` | string | - | Path to character model (GLB) |
| `position` | number[] | [0,0,0] | Position [x, y, z] |
| `scale` | number/array | 1 | Uniform scale or [x, y, z] |
| `rotation` | number[] | [0,0,0] | Rotation in degrees [x, y, z] |
| `animation` | string | - | Animation clip name |
| `delay` | number | 0 | Delay before appearing (ms) |
| `opacity` | number | 0.7 | Material opacity |

### Video Configuration

```json
{
  "videos": [
    {
      "id": "intro-video",
      "url": "video/intro.mp4",
      "position": [-10, 0, 5],
      "rotation": [0, 90, 0],
      "size": [64, 40],
      "opacity": 0.9,
      "loop": false,
      "muted": true,
      "triggerAt": 5.0,
      "multiWall": false,
      "walls": []
    }
  ]
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `id` | string | - | Unique video ID |
| `url` | string | - | Path to video file |
| `position` | number[] | [0,0,0] | Plane position [x, y, z] |
| `rotation` | number[] | [0,0,0] | Rotation in degrees |
| `size` | number[] | [64,40] | Plane size [width, height] |
| `opacity` | number | 0.9 | Video opacity |
| `loop` | boolean | false | Loop video |
| `muted` | boolean | true | Mute video audio |
| `triggerAt` | number | - | Audio timestamp to trigger (seconds) |
| `multiWall` | boolean | false | Display on multiple walls |
| `walls` | array | [] | Wall positions for multi-wall |

### Lighting Configuration

```json
{
  "lighting": {
    "position": [0, 5, 0],
    "ambient": 0.5,
    "directional": 0.8,
    "hemisphere": 0.4,
    "volumetric": false,
    "flicker": false
  }
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `position` | number[] | null | Focal lighting position |
| `ambient` | number | 1 | Ambient light multiplier (0-2) |
| `directional` | number | 1 | Directional light multiplier |
| `hemisphere` | number | 1 | Hemisphere light multiplier |
| `volumetric` | boolean | false | Enable volumetric effects |
| `flicker` | boolean | false | Enable flickering effect |

## UI Configuration

```json
{
  "ui": {
    "homeScreen": {
      "backgroundImage": "images/bg.jpg",
      "backgroundImageDesktop": "images/bg_desktop.png",
      "title": { "en": "Title", "fi": "Otsikko" },
      "subtitle": { "en": "Subtitle" },
      "startButtonText": { "en": "Start" }
    },
    "branding": {
      "logo": "logos/logo.png",
      "primaryColor": "#ffffff",
      "font": "CustomFont",
      "fontFiles": {
        "woff2": "fonts/custom.woff2",
        "woff": "fonts/custom.woff"
      }
    },
    "controls": {
      "showRecenter": true,
      "showSkip": true,
      "showSettings": true
    }
  }
}
```

## Ending Configuration

```json
{
  "ending": {
    "video": "video/ending.mp4",
    "text": { "en": "Thank you for watching" },
    "credits": [
      { "role": { "en": "Producer" }, "name": "Name" }
    ]
  }
}
```

## Localized Strings

Any text field can be either a simple string or an object with language codes:

```json
// Simple string
"title": "My Title"

// Localized object
"title": {
  "en": "My Title",
  "fi": "Otsikkoni",
  "sv": "Min titel"
}
```

## Vector3 Values

Position, rotation, and scale can be specified as arrays:

```json
// Position: [x, y, z]
"position": [10, -5, 3]

// Rotation: [x, y, z] in degrees
"rotation": [0, 90, 0]

// Scale: uniform or [x, y, z]
"scale": 10
"scale": [10, 10, 10]
```
