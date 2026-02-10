/**
 * Asset Browser Panel - Drag-and-drop file import with thumbnail previews
 */
import { useState, useCallback, useRef } from 'react'
import { useStore } from '../../state/store'

const ASSET_ICONS: Record<string, string> = {
  glb: '🧊',
  gltf: '🧊',
  mp3: '🔊',
  wav: '🔊',
  mp4: '🎬',
  webm: '🎬',
  png: '🖼',
  jpg: '🖼',
  jpeg: '🖼',
  svg: '🖼',
  woff: '🔤',
  woff2: '🔤',
  ttf: '🔤',
}

function getExtension(name: string): string {
  return name.split('.').pop()?.toLowerCase() || ''
}

function getAssetIcon(name: string): string {
  return ASSET_ICONS[getExtension(name)] || '📄'
}

function getAssetType(name: string): string {
  const ext = getExtension(name)
  if (['glb', 'gltf'].includes(ext)) return 'model'
  if (['mp3', 'wav', 'ogg'].includes(ext)) return 'audio'
  if (['mp4', 'webm'].includes(ext)) return 'video'
  if (['png', 'jpg', 'jpeg', 'svg', 'webp'].includes(ext)) return 'image'
  if (['woff', 'woff2', 'ttf', 'otf'].includes(ext)) return 'font'
  return 'other'
}

export function AssetBrowser() {
  const assetFiles = useStore((s) => s.assetFiles)
  const addAssetFile = useStore((s) => s.addAssetFile)
  const removeAssetFile = useStore((s) => s.removeAssetFile)
  const story = useStore((s) => s.story)
  const updateStory = useStore((s) => s.updateStory)

  const [dragOver, setDragOver] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(
    (files: FileList) => {
      Array.from(files).forEach((file) => {
        // Use a type-based subdirectory as key so it matches story config paths
        const type = getAssetType(file.name)
        const subDir = type === 'model' ? 'models'
          : type === 'audio' ? 'audio'
          : type === 'video' ? 'video'
          : type === 'image' ? 'images'
          : type === 'font' ? 'fonts'
          : 'assets'
        const relativePath = `${subDir}/${file.name}`
        addAssetFile(relativePath, file)

        // Auto-add to preload list if it's a model
        if (type === 'model' && file.name !== story.project.assets.environment) {
          updateStory((d) => {
            const modelPath = `models/${file.name}`
            if (!d.project.assets.preload.includes(modelPath)) {
              d.project.assets.preload.push(modelPath)
            }
          }, `Import ${file.name}`)
        }
      })
    },
    [addAssetFile, updateStory, story]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files)
      }
    },
    [handleFiles]
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const assets = Object.entries(assetFiles).filter(([name]) => {
    if (filter === 'all') return true
    return getAssetType(name) === filter
  })

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Filter tabs */}
      <div className="tab-bar">
        {['all', 'model', 'audio', 'video', 'image', 'font'].map((f) => (
          <div
            key={f}
            className={`tab ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </div>
        ))}
      </div>

      {/* Drop zone / asset grid */}
      <div
        style={{ flex: 1, overflow: 'auto', padding: 8 }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragOver(false)}
      >
        {assets.length === 0 ? (
          <div
            className={`drop-zone ${dragOver ? 'active' : ''}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>📁</div>
            <div>Drop files here or click to import</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>
              GLB, MP3, MP4, PNG, WOFF, etc.
            </div>
          </div>
        ) : (
          <>
            <div
              className={`drop-zone ${dragOver ? 'active' : ''}`}
              style={{ padding: 8, marginBottom: 8 }}
              onClick={() => fileInputRef.current?.click()}
            >
              + Add more assets
            </div>
            <div className="asset-grid">
              {assets.map(([name, file]) => (
                <div key={name} className="asset-item" title={name}>
                  <span className="asset-icon">{getAssetIcon(name)}</span>
                  <span className="asset-name">{file.name}</span>
                  <button
                    className="btn-icon btn-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeAssetFile(name)
                    }}
                    style={{ fontSize: 10 }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files)
          e.target.value = '' // Reset
        }}
      />
    </div>
  )
}
