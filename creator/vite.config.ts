import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import fs from 'node:fs'
function studioFiles(): Plugin {
  const player = path.resolve(__dirname, '../dist')
  return {
    name: 'studio-player',
    configureServer(server) {
      for (const [route, folder] of [
        ['/player', player],
        ['/examples', path.resolve(__dirname, '../examples')]
      ])
        server.middlewares.use(route, (req, res, next) => {
          let name: string
          try {
            name = decodeURIComponent((req.url || '/').split('?')[0])
          } catch {
            res.statusCode = 400
            res.end('Invalid path')
            return
          }
          const file = path.resolve(
            folder,
            '.' + (name === '/' ? '/index.html' : name)
          )
          if (!file.startsWith(folder + path.sep)) {
            res.statusCode = 403
            res.end()
            return
          }
          if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return next()
          const types: Record<string, string> = {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.glb': 'model/gltf-binary',
            '.gltf': 'model/gltf+json',
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
            '.mp4': 'video/mp4',
            '.webm': 'video/webm',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.svg': 'image/svg+xml',
            '.woff2': 'font/woff2'
          }
          res.setHeader(
            'Content-Type',
            types[path.extname(file)] || 'application/octet-stream'
          )
          if (req.method === 'HEAD') { res.setHeader('Content-Length', fs.statSync(file).size); res.end(); return }
          const size = fs.statSync(file).size,
            range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/)
          if (range) {
            const start = Number(range[1]),
              end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1
            if (start > end || start >= size) {
              res.statusCode = 416
              res.end()
              return
            }
            res.statusCode = 206
            res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`)
            res.setHeader('Content-Length', end - start + 1)
            fs.createReadStream(file, { start, end }).pipe(res)
          } else {
            res.setHeader('Content-Length', size)
            fs.createReadStream(file).pipe(res)
          }
        })
    },
    writeBundle() {
      if (!fs.existsSync(path.join(player, 'index.html')))
        throw new Error(
          'Build the player first: npm run build:studio from the repository root.'
        )
      fs.cpSync(player, path.resolve(__dirname, 'dist/player'), {
        recursive: true
      })
    }
  }
}
export default defineConfig({
  plugins: [react(), studioFiles()],
  server: { port: 3000, host: '127.0.0.1' },
  optimizeDeps: {
    include: ['three', '@react-three/fiber', '@react-three/drei']
  }
})
