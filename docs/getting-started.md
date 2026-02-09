# Getting Started

This guide will help you set up and create your first spatial journalism experience.

## Prerequisites

- Node.js 16 or later
- npm or yarn
- 8th Wall account (for AR features)
- Basic understanding of JSON

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yle/spatial-journalism-engine.git
cd spatial-journalism-engine
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

Open `https://localhost:3000` in your browser.

## Creating Your First Story

### Option 1: Using the JSON Generator

1. Start the generator tool:
   ```bash
   npm run generator
   ```

2. Open `http://localhost:3001`

3. Fill in:
   - Project title and settings
   - Add scenes with audio, video, and characters
   - Configure UI and branding

4. Export your `story.json`

### Option 2: Manual JSON Creation

Create a `story.json` file:

```json
{
  "project": {
    "title": "My First Story",
    "languages": ["en"],
    "defaultLanguage": "en",
    "assets": {
      "basePath": "./assets/",
      "environment": "models/room.glb"
    }
  },
  "scenes": [
    {
      "id": "scene1",
      "name": "Introduction",
      "audio": {
        "url": "audio/narration.mp3",
        "autoplay": true
      }
    }
  ],
  "ui": {
    "homeScreen": {
      "title": "My Story",
      "startButtonText": "Begin"
    }
  }
}
```

## Project Structure

```
your-project/
├── story.json          # Your story configuration
├── assets/
│   ├── models/         # 3D models (GLB/GLTF)
│   ├── audio/          # Audio files (MP3)
│   ├── video/          # Video files (MP4)
│   ├── images/         # Images (JPG, PNG)
│   └── fonts/          # Custom fonts (WOFF2)
└── index.html          # Entry point
```

## Initializing the Engine

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script src="path/to/sj-engine.js"></script>
</head>
<body>
  <div id="sj-container"></div>
  
  <script>
    SJEngine.init({
      storyUrl: './story.json',
      container: document.getElementById('sj-container'),
      onReady: (engine) => {
        console.log('Engine ready!')
      }
    })
  </script>
</body>
</html>
```

## Using Templates

Copy a template as your starting point:

```bash
cp -r templates/interview my-story
cd my-story
# Edit story.json and replace assets
```

## 8th Wall Integration

For AR features, you'll need to integrate with 8th Wall:

1. Create an 8th Wall project at [8thwall.com](https://8thwall.com)
2. Get your app key
3. Include the 8th Wall scripts before the engine:

```html
<script src="//apps.8thwall.com/xrweb?appKey=YOUR_KEY"></script>
<script src="path/to/sj-engine.js"></script>
```

4. Initialize with Three.js references from 8th Wall:

```javascript
XR8.addCameraPipelineModules([
  XR8.GlTextureRenderer.pipelineModule(),
  XR8.Threejs.pipelineModule(),
  {
    name: 'sj-engine',
    onStart: ({ canvas }) => {
      const { scene, camera, renderer } = XR8.Threejs.xrScene()
      
      SJEngine.init({
        storyUrl: './story.json'
      }).then(engine => {
        engine.initThree({ scene, camera, renderer })
      })
    }
  }
])

XR8.run({ canvas: document.getElementById('camerafeed') })
```

## Next Steps

- Read the [JSON Schema Reference](./json-reference.md) for all available options
- Check the [API Reference](./api-reference.md) for programmatic control
- See [Deployment Guide](./deployment-guide.md) for hosting your experience
