# Spatial Journalism Engine

An open-source, JSON-driven platform for creating immersive WebAR journalism experiences. Built on 8th Wall and Three.js.

## Overview

The Spatial Journalism Engine allows journalists to create immersive AR storytelling experiences without writing code. Define your story in a simple JSON format, and the engine handles the rest.

## Features

- **JSON-Driven**: Define entire experiences through configuration files
- **Multi-Language Support**: Built-in internationalization
- **Video Projection**: Display documentary footage in 3D space
- **Positional Audio**: Immersive spatial sound
- **Character Animation**: Animated 3D characters with lip-sync support
- **Cross-Platform**: Works on iOS Safari, Android Chrome, and desktop browsers
- **Visual Generator**: Web-based tool for creating stories without editing JSON

## Quick Start

```bash
# Clone the repository
git clone https://github.com/yle/spatial-journalism-engine.git
cd spatial-journalism-engine

# Install dependencies
npm install

# Start development server
npm run dev
```

## Creating a Story

### 1. Using JSON directly

Create a `story.json` file:

```json
{
  "project": {
    "title": "My Story",
    "languages": ["en"],
    "defaultLanguage": "en",
    "assets": {
      "basePath": "./assets/",
      "environment": "models/scene.glb"
    }
  },
  "scenes": [
    {
      "id": "intro",
      "name": "Introduction",
      "audio": {
        "url": "audio/narration.mp3",
        "volume": 0.5
      }
    }
  ]
}
```

### 2. Using the Generator Tool

```bash
npm run generator
```

Open `http://localhost:3001` and use the visual interface to create your story.

## Documentation

- [Getting Started](docs/getting-started.md)
- [JSON Schema Reference](docs/json-reference.md)
- [Deployment Guide](docs/deployment-guide.md)
- [API Reference](docs/api-reference.md)

## Story Templates

- **Interview**: Character-driven narration with documentary footage
- **Historical**: Timeline-based archival reconstruction

## Requirements

- Node.js 16+
- 8th Wall account (for AR features)
- HTTPS hosting (required for camera/sensor access)

## License

MIT License - See [LICENSE](LICENSE) for details.

## Credits

Developed by Yle in collaboration with Metropolia University of Applied Sciences.

Based on technology from "Shadows of the Stabilisation Point" - an immersive documentary about Ukrainian medics.
