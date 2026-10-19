import { useEffect, useRef, useState } from 'react'
import { useStore } from '../../state/store'
import { mediaPaths, mediaType } from '../../utils/media'
import { Icon } from '../Icon'
const kind = (name: string) =>
  /\.(glb|gltf)$/i.test(name)
    ? 'model'
    : /\.(mp3|wav|ogg)$/i.test(name)
      ? 'audio'
      : /\.(mp4|webm)$/i.test(name)
        ? 'video'
        : /\.(png|jpe?g|webp|svg)$/i.test(name)
          ? 'image'
          : 'file'
const icons: Record<string, string> = {
  model: 'cube',
  audio: 'audio',
  video: 'video',
  image: 'image',
  file: 'folder'
}
export function AssetBrowser() {
  const files = useStore((s) => s.assetFiles),
    embedded = useStore((s) => s.story.embeddedAssets),
    story = useStore((s) => s.story),
    baseUrl = useStore((s) => s.assetsBaseUrl)
  const input = useRef<HTMLInputElement>(null),
    [error, setError] = useState(''),
    [drag, setDrag] = useState(false)
  const [checks, setChecks] = useState<Record<string, string>>({})
  const [checking, setChecking] = useState(false)
  useEffect(() => setChecks({}), [baseUrl, story])
  const names = [
    ...new Set([
      ...Object.keys(embedded || {}),
      ...Object.keys(files),
      ...mediaPaths(story)
    ])
  ]
  const isLinked = (path: string) => !!baseUrl || /^(https?:|blob:)/.test(path)
  const checkFiles = async () => {
    setChecking(true)
    const results: Record<string, string> = {}
    await Promise.all(
      names
        .filter(
          (path) =>
            !files[path] && !embedded?.[path] && !path.startsWith('data:')
        )
        .map(async (path) => {
          if (!isLinked(path)) {
            results[path] = 'Needs a file or media folder'
            return
          }
          try {
            const url = /^(https?:|blob:)/.test(path)
              ? path
              : new URL(
                  (story.project.assets.basePath || '') + path,
                  baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'
                ).href
            const response = await fetch(url, {
              method: 'HEAD',
              signal: AbortSignal.timeout(15000)
            })
            results[path] =
              response.ok &&
              !response.headers.get('content-type')?.includes('text/html')
                ? 'Available'
                : 'Unavailable · check media URL'
          } catch {
            results[path] = 'Could not verify · check URL or CORS'
          }
        })
    )
    setChecks(results)
    setChecking(false)
  }
  const importFiles = (list: FileList) => {
    setError('')
    for (const file of Array.from(list)) {
      if (/\.gltf$/i.test(file.name)) {
        setError(
          'Use a GLB model with textures included. Convert separate .gltf files to GLB before adding them.'
        )
        continue
      }
      const type = kind(file.name),
        folder =
          type === 'model'
            ? 'models'
            : type === 'image'
              ? 'images'
              : type === 'file'
                ? 'files'
                : type
      const references = mediaPaths(useStore.getState().story).filter(
        (p) => p.split('/').pop() === file.name
      )
      let path =
          references.length === 1 ? references[0] : folder + '/' + file.name,
        n = 2
      while (
        useStore.getState().assetFiles[path] ||
        useStore.getState().story.embeddedAssets?.[path]
      )
        path = folder + '/' + n++ + '-' + file.name
      const mime = mediaType(file.name, file.type)
      useStore
        .getState()
        .addAssetFile(path, new File([file], file.name, { type: mime }))
    }
  }
  const useAsset = (path: string, action: string) => {
    const s = useStore.getState(),
      id = s.activeSceneId
    if (!id) return
    if (action === 'space') {
      s.updateStory((d) => {
        d.project.assets.environment = path
      }, 'Set space')
      s.setSelection({ type: 'environment' })
      return
    }
    if (action === 'cover') {
      s.updateStory((d) => {
        d.ui.homeScreen.backgroundImage = path
      }, 'Set cover')
      return
    }
    if (action === 'model') {
      s.addCharacter(id)
      s.updateCharacter(id, useStore.getState().selection.itemId!, {
        model: path,
        opacity: 1,
        fadeIn: 0
      })
    }
    if (action === 'audio') {
      s.addAudio(id)
      s.updateAudio(id, useStore.getState().selection.itemId!, { file: path })
    }
    if (action === 'video') {
      s.addVideo(id)
      s.updateVideo(id, useStore.getState().selection.itemId!, { url: path })
    }
  }
  return (
    <div
      className="media-library"
      onDragOver={(e) => {
        e.preventDefault()
        setDrag(true)
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDrag(false)
        importFiles(e.dataTransfer.files)
      }}
    >
      <input
        ref={input}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) importFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <div className="media-topline">
        <p>
          {names.length
            ? names.length + ' media files · local, embedded or linked'
            : 'Your media, ready for the story'}
        </p>
        <button className="btn btn-sm" onClick={() => input.current?.click()}>
          <Icon name="plus" size={14} />
          Add media
        </button>
      </div>
      <details className="media-sources">
        <summary>
          Media links & file check (
          {
            mediaPaths(story).filter(
              (p) => !files[p] && !embedded?.[p] && !p.startsWith('data:')
            ).length
          }
          )
        </summary>
        <label>
          Media folder URL
          <input
            className="form-input"
            aria-label="Media folder URL"
            placeholder="https://your-site.example/story/"
            value={baseUrl}
            onChange={(e) =>
              useStore.getState().setAssetsBaseUrl(e.target.value)
            }
          />
        </label>
        <p>
          For an existing story, add its missing files here. Matching filenames
          reconnect automatically. Export embeds reachable media in the JSON.
        </p>
        {mediaPaths(story)
          .filter((p) => !files[p] && !embedded?.[p] && !p.startsWith('data:'))
          .map((p) => (
            <div key={p} className="missing-file">
              {p}
            </div>
          ))}
      </details>
      <div className="media-topline">
        <button className="btn btn-sm" disabled={checking} onClick={checkFiles}>
          {checking ? 'Checking files…' : 'Check linked files'}
        </button>
        {Object.keys(checks).length > 0 && (
          <p role="status">
            {Object.values(checks).filter((v) => v === 'Available').length}{' '}
            available ·{' '}
            {Object.values(checks).filter((v) => v !== 'Available').length} need
            attention
          </p>
        )}
      </div>
      {error && <p role="alert">{error}</p>}
      {!names.length || drag ? (
        <div className="media-drop">
          <Icon name="folder" size={24} />
          <h3>
            {drag ? 'Drop your files here' : 'Bring your story into the room'}
          </h3>
          <p>
            3D models, audio, video and images. Local files travel with your
            exported JSON.
          </p>
          <button className="btn" onClick={() => input.current?.click()}>
            Choose files
          </button>
        </div>
      ) : (
        <div className="media-list">
          {names.map((path) => (
            <article className="media-card" key={path}>
              <Icon name={icons[kind(path)]} size={22} />
              <strong title={path}>{path.split('/').pop()}</strong>
              <small>
                {files[path]
                  ? (files[path].size / 1024 / 1024).toFixed(1) + ' MB'
                  : embedded?.[path] || path.startsWith('data:')
                    ? 'Included in story'
                    : checks[path] ||
                      (isLinked(path) ? 'Linked media' : 'Needs a file')}{' '}
                · {kind(path)}
              </small>
              <div className="media-actions">
                {kind(path) === 'model' ? (
                  <>
                    <button
                      className="btn btn-sm"
                      onClick={() => useAsset(path, 'space')}
                    >
                      Use as space
                    </button>
                    <button
                      className="btn btn-sm"
                      onClick={() => useAsset(path, 'model')}
                    >
                      Add to chapter
                    </button>
                  </>
                ) : kind(path) === 'image' ? (
                  <button
                    className="btn btn-sm"
                    onClick={() => useAsset(path, 'cover')}
                  >
                    Use as cover
                  </button>
                ) : ['audio', 'video'].includes(kind(path)) ? (
                  <button
                    className="btn btn-sm"
                    onClick={() => useAsset(path, kind(path))}
                  >
                    Add to chapter
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
