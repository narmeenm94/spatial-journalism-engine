/**
 * Spatial Journalism Engine - Story Creator
 * Main application layout with toolbar, panels, viewport, and timeline
 */
import { useEffect } from 'react'
import { Toolbar } from './components/panels/Toolbar'
import { SceneHierarchy } from './components/panels/SceneHierarchy'
import { PropertyInspector } from './components/panels/PropertyInspector'
import { Viewport3D } from './components/viewport/Viewport3D'
import { BottomPanel } from './components/panels/BottomPanel'
import { useStore } from './state/store'

export default function App() {
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const store = useStore.getState()

      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        store.undo()
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        store.redo()
      }

      // Transform shortcuts
      if (e.key === 'w' && !e.ctrlKey && !e.metaKey) store.setTransformMode('translate')
      if (e.key === 'e' && !e.ctrlKey && !e.metaKey) store.setTransformMode('rotate')
      if (e.key === 'r' && !e.ctrlKey && !e.metaKey) store.setTransformMode('scale')

      // Delete selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const sel = store.selection
        if (sel.type === 'character' && sel.sceneId && sel.itemId) {
          store.removeCharacter(sel.sceneId, sel.itemId)
        } else if (sel.type === 'video' && sel.sceneId && sel.itemId) {
          store.removeVideo(sel.sceneId, sel.itemId)
        } else if (sel.type === 'spotlight' && sel.sceneId && sel.itemId) {
          store.removeSpotlight(sel.sceneId, sel.itemId)
        } else if (sel.type === 'cameraKeyframe' && sel.sceneId && sel.itemId) {
          store.removeCameraKeyframe(sel.sceneId, sel.itemId)
        } else if (sel.type === 'interactiveObject' && sel.itemId) {
          store.removeInteractiveObject(sel.itemId)
        }
      }

      // Focus on selected object
      if (e.key === 'f' && !e.ctrlKey && !e.metaKey && e.target === document.body) {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('sj-focus-selected'))
      }

      // Escape to clear selection
      if (e.key === 'Escape') {
        store.clearSelection()
      }

      // Space to toggle play
      if (e.key === ' ' && e.target === document.body) {
        e.preventDefault()
        store.setIsPlaying(!store.isPlaying)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="editor-layout">
      {/* Top toolbar */}
      <Toolbar />

      {/* Main area: left panel + center (viewport + timeline) + right panel */}
      <div className="editor-main">
        {/* Left panel: Scene hierarchy */}
        <SceneHierarchy />

        {/* Center: Viewport + Bottom panel */}
        <div className="editor-center">
          <Viewport3D />
          <BottomPanel />
        </div>

        {/* Right panel: Property inspector */}
        <PropertyInspector />
      </div>
    </div>
  )
}
