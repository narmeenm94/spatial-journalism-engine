import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

/**
 * Vite plugin to serve the ../examples directory at /examples/*
 * so that the editor can load GLB models and other assets directly.
 */
function serveExamplesPlugin(): Plugin {
  const examplesDir = path.resolve(__dirname, '../examples')
  return {
    name: 'serve-examples',
    configureServer(server) {
      server.middlewares.use('/examples', (req: any, res: any, next: any) => {
        const filePath = path.join(examplesDir, decodeURIComponent(req.url || ''))
        try {
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            res.setHeader('Access-Control-Allow-Origin', '*')
            // Set content type for common 3D/media files
            const ext = path.extname(filePath).toLowerCase()
            const mimeTypes: Record<string, string> = {
              '.glb': 'model/gltf-binary',
              '.gltf': 'model/gltf+json',
              '.bin': 'application/octet-stream',
              '.png': 'image/png',
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg',
              '.mp4': 'video/mp4',
              '.mp3': 'audio/mpeg',
              '.json': 'application/json',
              '.woff2': 'font/woff2',
              '.woff': 'font/woff',
            }
            if (mimeTypes[ext]) {
              res.setHeader('Content-Type', mimeTypes[ext])
            }
            fs.createReadStream(filePath).pipe(res)
          } else {
            next()
          }
        } catch {
          next()
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), serveExamplesPlugin()],
  server: {
    port: 3000,
    open: true,
  },
  optimizeDeps: {
    include: ['three', '@react-three/fiber', '@react-three/drei'],
  },
})
