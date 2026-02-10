/**
 * Timeline Component — Multi-track timeline with playhead, zoom, scrub,
 * draggable/resizable blocks with snap-to-grid.
 *
 * Block semantics (all times stored in the story JSON):
 *   Subtitle:   start / end (seconds)
 *   Video:      triggerTime / duration (seconds)
 *   Character:  delay / duration (milliseconds)
 *   Audio:      delay / duration (milliseconds)
 *   Camera KF:  time / duration (seconds / ms)
 */
import { useRef, useState, useMemo, useCallback, useEffect } from 'react'
import { useStore } from '../../state/store'

const PIXELS_PER_SECOND = 8
const SNAP_SECONDS = 0.5 // snap granularity in seconds
const LABEL_WIDTH = 72 // left label column width in px
const DEFAULT_CHAR_DURATION_SEC = 60 // visual fallback when duration == 0 ("until scene ends")
const DEFAULT_AUDIO_DURATION_SEC = 120

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function snap(value: number, grid: number): number {
  return Math.round(value / grid) * grid
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// ─────────────────────────────────────────────
// Types for dragging state
// ─────────────────────────────────────────────

type DragAction = 'move' | 'resize-left' | 'resize-right'

interface DragState {
  blockKey: string
  action: DragAction
  startMouseX: number
  /** Start time of block in *seconds* at drag start */
  startTimeSec: number
  /** Duration of block in *seconds* at drag start */
  startDurSec: number
}

// ═══════════════════════════════════════════════
// Main Timeline component
// ═══════════════════════════════════════════════

export function Timeline() {
  const story = useStore((s) => s.story)
  const activeSceneId = useStore((s) => s.activeSceneId)
  const timelinePosition = useStore((s) => s.timelinePosition)
  const isPlaying = useStore((s) => s.isPlaying)
  const setTimelinePosition = useStore((s) => s.setTimelinePosition)
  const setIsPlaying = useStore((s) => s.setIsPlaying)
  const setSelection = useStore((s) => s.setSelection)
  const language = useStore((s) => s.language)
  const updateSubtitle = useStore((s) => s.updateSubtitle)
  const updateVideo = useStore((s) => s.updateVideo)
  const updateCharacter = useStore((s) => s.updateCharacter)
  const updateCameraKeyframe = useStore((s) => s.updateCameraKeyframe)
  const updateAudio = useStore((s) => s.updateAudio)

  const [zoom, setZoom] = useState(1)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [dragDelta, setDragDelta] = useState<{ time: number; duration: number } | null>(null)

  const activeScene = story.scenes.find((s) => s.id === activeSceneId)
  const pxPerSec = PIXELS_PER_SECOND * zoom

  // ── Calculate total duration ──
  const totalDuration = useMemo(() => {
    if (!activeScene) return 60
    let maxTime = 60
    activeScene.subtitles.forEach((s) => {
      if (s.end > maxTime) maxTime = s.end
    })
    activeScene.videos.forEach((v) => {
      const end = v.triggerTime + (v.duration || 30)
      if (end > maxTime) maxTime = end
    })
    activeScene.characters.forEach((c) => {
      const endSec = (c.delay + (c.duration || DEFAULT_CHAR_DURATION_SEC * 1000)) / 1000
      if (endSec > maxTime) maxTime = endSec
    })
    activeScene.audio.forEach((a) => {
      const endSec = ((a.delay || 0) + (a.duration || DEFAULT_AUDIO_DURATION_SEC * 1000)) / 1000
      if (endSec > maxTime) maxTime = endSec
    })
    const cameraKfs = story.camera.guided?.[activeScene.id] || []
    cameraKfs.forEach((kf) => {
      if (kf.time + 10 > maxTime) maxTime = kf.time + 10
    })
    return Math.ceil(maxTime / 10) * 10 + 30
  }, [activeScene, story.camera.guided])

  const totalWidth = totalDuration * pxPerSec + 200

  // ── Ruler click to scrub ──
  const handleRulerClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left + (scrollRef.current?.scrollLeft || 0) - LABEL_WIDTH
      const time = Math.max(0, x / pxPerSec)
      setTimelinePosition(time)
    },
    [pxPerSec, setTimelinePosition]
  )

  // ── Playback timer ──
  useEffect(() => {
    if (!isPlaying) return
    const start = performance.now()
    const startTime = timelinePosition
    let raf: number
    const tick = () => {
      const elapsed = (performance.now() - start) / 1000
      setTimelinePosition(startTime + elapsed)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isPlaying]) // intentionally only isPlaying

  // ── Global mouse handlers for dragging ──
  useEffect(() => {
    if (!drag) return

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.pageX - drag.startMouseX
      const dtSec = dx / pxPerSec

      if (drag.action === 'move') {
        const newStart = snap(Math.max(0, drag.startTimeSec + dtSec), SNAP_SECONDS)
        setDragDelta({ time: newStart - drag.startTimeSec, duration: 0 })
      } else if (drag.action === 'resize-left') {
        const maxShrink = drag.startDurSec - SNAP_SECONDS
        const clampedDt = Math.min(dtSec, maxShrink)
        const snappedDt = snap(clampedDt, SNAP_SECONDS)
        const finalDt = Math.max(-drag.startTimeSec, snappedDt)
        setDragDelta({ time: finalDt, duration: -finalDt })
      } else if (drag.action === 'resize-right') {
        const snappedDt = snap(dtSec, SNAP_SECONDS)
        const newDur = Math.max(SNAP_SECONDS, drag.startDurSec + snappedDt)
        setDragDelta({ time: 0, duration: newDur - drag.startDurSec })
      }
    }

    const handleMouseUp = () => {
      if (dragDelta && activeScene) {
        commitDrag(drag, dragDelta)
      }
      setDrag(null)
      setDragDelta(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [drag, dragDelta, pxPerSec, activeScene])

  // ── Commit drag delta to the store ──
  const commitDrag = useCallback(
    (d: DragState, delta: { time: number; duration: number }) => {
      if (!activeScene) return
      const sid = activeScene.id
      const [kind, id] = d.blockKey.split('::')

      if (kind === 'sub') {
        const sub = activeScene.subtitles.find((s) => s.id === id)
        if (!sub) return
        const newStart = round2(Math.max(0, sub.start + delta.time))
        const newEnd = round2(Math.max(newStart + SNAP_SECONDS, sub.end + delta.time + delta.duration))
        updateSubtitle(sid, id, { start: newStart, end: newEnd })
      } else if (kind === 'vid') {
        const vid = activeScene.videos.find((v) => v.id === id)
        if (!vid) return
        const newTrigger = round2(Math.max(0, vid.triggerTime + delta.time))
        const newDur = round2(Math.max(SNAP_SECONDS, (vid.duration || 30) + delta.duration))
        updateVideo(sid, id, { triggerTime: newTrigger, duration: newDur })
      } else if (kind === 'char') {
        const char = activeScene.characters.find((c) => c.id === id)
        if (!char) return
        const curStartSec = (char.delay || 0) / 1000
        const curDurSec = (char.duration || DEFAULT_CHAR_DURATION_SEC * 1000) / 1000
        const newStartSec = Math.max(0, curStartSec + delta.time)
        const newDurSec = Math.max(SNAP_SECONDS, curDurSec + delta.duration)
        updateCharacter(sid, id, {
          delay: round2(newStartSec * 1000),
          duration: round2(newDurSec * 1000),
        })
      } else if (kind === 'audio') {
        const audioTrack = activeScene.audio.find((a) => a.id === id)
        if (!audioTrack) return
        const curDelaySec = (audioTrack.delay || 0) / 1000
        const curDurSec = (audioTrack.duration || DEFAULT_AUDIO_DURATION_SEC * 1000) / 1000
        const newDelaySec = Math.max(0, curDelaySec + delta.time)
        const newDurSec = Math.max(SNAP_SECONDS, curDurSec + delta.duration)
        updateAudio(sid, id, {
          delay: round2(newDelaySec * 1000),
          duration: round2(newDurSec * 1000),
        })
      } else if (kind === 'cam') {
        const newTime = round2(Math.max(0, d.startTimeSec + delta.time))
        const newDurMs = round2(Math.max(100, (d.startDurSec + delta.duration) * 1000))
        updateCameraKeyframe(sid, id, { time: newTime, duration: newDurMs })
      }
    },
    [activeScene, updateSubtitle, updateVideo, updateCharacter, updateCameraKeyframe, updateAudio]
  )

  // ── Start a drag ──
  const beginDrag = useCallback(
    (
      e: React.MouseEvent,
      blockKey: string,
      action: DragAction,
      timeSec: number,
      durationSec: number
    ) => {
      e.stopPropagation()
      e.preventDefault()
      setDrag({
        blockKey,
        action,
        startMouseX: e.pageX,
        startTimeSec: timeSec,
        startDurSec: durationSec,
      })
      setDragDelta(null)
    },
    []
  )

  // ═══════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════

  if (!activeScene) {
    return (
      <div className="timeline-container">
        <div className="timeline-toolbar">
          <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
            Select a scene to view its timeline
          </span>
        </div>
      </div>
    )
  }

  const playheadX = LABEL_WIDTH + timelinePosition * pxPerSec
  const cameraKfs = story.camera.guided?.[activeScene.id] || []

  /** Compute visual left/width for a block (with live drag preview). */
  function blockStyle(
    key: string,
    startSec: number,
    durSec: number
  ): { left: number; width: number } {
    let t = startSec
    let d = durSec
    if (drag?.blockKey === key && dragDelta) {
      t += dragDelta.time
      d += dragDelta.duration
    }
    return {
      left: Math.max(0, t) * pxPerSec,
      width: Math.max(d * pxPerSec, 6),
    }
  }

  return (
    <div className="timeline-container">
      {/* ── Toolbar ── */}
      <div className="timeline-toolbar">
        <button className="btn btn-sm" onClick={() => setTimelinePosition(0)} title="Reset">
          ⏮
        </button>
        <button
          className={`btn btn-sm ${isPlaying ? 'btn-danger' : 'btn-primary'}`}
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <span
          style={{
            color: 'var(--text-secondary)',
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            minWidth: 48,
          }}
        >
          {formatTime(timelinePosition)}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>
          snap {SNAP_SECONDS}s
        </span>
        <div style={{ flex: 1 }} />
        <label
          style={{
            fontSize: 11,
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          Zoom
          <input
            type="range"
            min={0.5}
            max={5}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            style={{ width: 80 }}
          />
        </label>
      </div>

      {/* ── Scrollable tracks area ── */}
      <div
        className="timeline-tracks"
        ref={scrollRef}
        style={{ cursor: drag ? (drag.action === 'move' ? 'grabbing' : 'col-resize') : undefined }}
      >
        {/* Ruler */}
        <div className="timeline-ruler" style={{ width: totalWidth }} onClick={handleRulerClick}>
          {Array.from({ length: Math.ceil(totalDuration / 10) + 1 }, (_, i) => {
            const time = i * 10
            return (
              <span
                key={i}
                style={{
                  position: 'absolute',
                  left: LABEL_WIDTH + time * pxPerSec,
                  top: 6,
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  transform: 'translateX(-50%)',
                }}
              >
                {formatTime(time)}
              </span>
            )
          })}
          {/* Snap grid lines */}
          {zoom >= 2 &&
            Array.from({ length: Math.ceil(totalDuration) + 1 }, (_, i) => (
              <div
                key={`g${i}`}
                style={{
                  position: 'absolute',
                  left: LABEL_WIDTH + i * pxPerSec,
                  top: 0,
                  bottom: 0,
                  width: 1,
                  background: 'rgba(255,255,255,0.04)',
                  pointerEvents: 'none',
                }}
              />
            ))}
          <div className="timeline-playhead" style={{ left: playheadX, height: '100%' }} />
        </div>

        {/* ─── Audio tracks ─── */}
        {activeScene.audio.map((aud) => {
          const key = `audio::${aud.id}`
          const startSec = (aud.delay || 0) / 1000
          const durSec = (aud.duration || DEFAULT_AUDIO_DURATION_SEC * 1000) / 1000
          return (
            <Track key={key} label={`🔊 ${aud.id.slice(0, 8)}`} width={totalWidth}>
              <DraggableBlock
                blockKey={key}
                className="timeline-block audio"
                style={blockStyle(key, startSec, durSec)}
                onClick={() => setSelection({ type: 'audio', sceneId: activeScene.id, itemId: aud.id })}
                onDragStart={(e, action) => beginDrag(e, key, action, startSec, durSec)}
                isDragging={drag?.blockKey === key}
                resizable
              >
                {(aud.file || 'untitled').split('/').pop()}
              </DraggableBlock>
            </Track>
          )
        })}

        {/* ─── Subtitle track ─── */}
        <Track label="💬 Subs" width={totalWidth}>
          {activeScene.subtitles.map((sub) => {
            const key = `sub::${sub.id}`
            const dur = sub.end - sub.start
            return (
              <DraggableBlock
                key={key}
                blockKey={key}
                className="timeline-block subtitle"
                style={blockStyle(key, sub.start, dur)}
                title={sub.text[language] || sub.text.en || ''}
                onClick={() =>
                  setSelection({ type: 'subtitle' as any, sceneId: activeScene.id, itemId: sub.id })
                }
                onDragStart={(e, action) => beginDrag(e, key, action, sub.start, dur)}
                isDragging={drag?.blockKey === key}
                resizable
              >
                {sub.text[language] || sub.text.en || '…'}
              </DraggableBlock>
            )
          })}
        </Track>

        {/* ─── Video track ─── */}
        <Track label="📹 Video" width={totalWidth}>
          {activeScene.videos.map((vid) => {
            const key = `vid::${vid.id}`
            const dur = vid.duration || 30
            return (
              <DraggableBlock
                key={key}
                blockKey={key}
                className="timeline-block video"
                style={blockStyle(key, vid.triggerTime, dur)}
                onClick={() =>
                  setSelection({ type: 'video', sceneId: activeScene.id, itemId: vid.id })
                }
                onDragStart={(e, action) => beginDrag(e, key, action, vid.triggerTime, dur)}
                isDragging={drag?.blockKey === key}
                resizable
              >
                {vid.id}
              </DraggableBlock>
            )
          })}
        </Track>

        {/* ─── Character track ─── */}
        <Track label="🧑 Chars" width={totalWidth}>
          {activeScene.characters.map((char) => {
            const key = `char::${char.id}`
            const startSec = (char.delay || 0) / 1000
            const durSec = (char.duration || DEFAULT_CHAR_DURATION_SEC * 1000) / 1000
            return (
              <DraggableBlock
                key={key}
                blockKey={key}
                className="timeline-block character"
                style={blockStyle(key, startSec, durSec)}
                onClick={() =>
                  setSelection({ type: 'character', sceneId: activeScene.id, itemId: char.id })
                }
                onDragStart={(e, action) => beginDrag(e, key, action, startSec, durSec)}
                isDragging={drag?.blockKey === key}
                resizable
              >
                {char.id}
              </DraggableBlock>
            )
          })}
        </Track>

        {/* ─── Camera track ─── */}
        <Track label="📷 Cam" width={totalWidth}>
          {cameraKfs.map((kf) => {
            const key = `cam::${kf.id}`
            const durSec = (kf.duration || 1000) / 1000
            return (
              <DraggableBlock
                key={key}
                blockKey={key}
                className="timeline-block camera"
                style={blockStyle(key, kf.time, durSec)}
                onClick={() =>
                  setSelection({
                    type: 'cameraKeyframe',
                    sceneId: activeScene.id,
                    itemId: kf.id,
                  })
                }
                onDragStart={(e, action) => beginDrag(e, key, action, kf.time, durSec)}
                isDragging={drag?.blockKey === key}
                resizable
              >
                📷 {formatTime(kf.time)}
              </DraggableBlock>
            )
          })}
        </Track>

        {/* ─── Lighting track ─── */}
        <Track label="💡 Light" width={totalWidth}>
          {activeScene.lighting.flicker && (
            <div
              className="timeline-block light"
              style={{
                left: activeScene.lighting.flicker.triggerTime * pxPerSec,
                width: Math.max(activeScene.lighting.flicker.duration * pxPerSec, 10),
              }}
            >
              Flicker
            </div>
          )}
          {activeScene.lighting.walkingTour && (
            <div
              className="timeline-block light"
              style={{
                left: 0,
                width: Math.max(totalDuration * pxPerSec * 0.9, 40),
                background: 'rgba(100,200,255,0.3)',
                borderColor: 'rgba(100,200,255,0.6)',
              }}
            >
              Walking Tour
            </div>
          )}
          {(activeScene.lighting.spotlights || []).map((spot) => (
            <div
              key={spot.id}
              className="timeline-block light"
              style={{ left: 0, width: 50 }}
              onClick={() =>
                setSelection({ type: 'spotlight', sceneId: activeScene.id, itemId: spot.id })
              }
            >
              {spot.id}
            </div>
          ))}
        </Track>

        {/* Playhead across all tracks */}
        <div
          className="timeline-playhead"
          style={{ left: playheadX, top: 0, height: '100%', position: 'absolute' }}
        />
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════
// Draggable + Resizable block wrapper
// ═══════════════════════════════════════════════

interface DraggableBlockProps {
  blockKey: string
  className: string
  style: { left: number; width: number }
  onClick?: () => void
  onDragStart: (e: React.MouseEvent, action: DragAction) => void
  isDragging: boolean
  resizable: boolean
  title?: string
  children: React.ReactNode
}

function DraggableBlock({
  className,
  style,
  onClick,
  onDragStart,
  isDragging,
  resizable,
  title,
  children,
}: DraggableBlockProps) {
  const HANDLE = 6

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const localX = e.clientX - rect.left

    if (resizable && localX <= HANDLE) {
      onDragStart(e, 'resize-left')
    } else if (resizable && localX >= rect.width - HANDLE) {
      onDragStart(e, 'resize-right')
    } else {
      onDragStart(e, 'move')
    }
  }

  const getCursor = (e: React.MouseEvent) => {
    if (!resizable) return 'grab'
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const localX = e.clientX - rect.left
    if (localX <= HANDLE || localX >= rect.width - HANDLE) return 'col-resize'
    return 'grab'
  }

  return (
    <div
      className={`${className} ${isDragging ? 'dragging' : ''}`}
      style={{
        ...style,
        position: 'absolute',
        userSelect: 'none',
        boxShadow: isDragging ? '0 0 8px rgba(0,183,255,0.5)' : undefined,
        opacity: isDragging ? 0.85 : undefined,
        zIndex: isDragging ? 10 : undefined,
      }}
      title={title}
      onClick={(e) => {
        if (!isDragging && onClick) {
          e.stopPropagation()
          onClick()
        }
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={(e) => {
        ;(e.currentTarget as HTMLElement).style.cursor = getCursor(e)
      }}
    >
      {/* Visual resize handles */}
      {resizable && (
        <>
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: HANDLE,
              cursor: 'col-resize',
              borderRadius: '3px 0 0 3px',
              background: isDragging ? 'rgba(255,255,255,0.2)' : 'transparent',
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: HANDLE,
              cursor: 'col-resize',
              borderRadius: '0 3px 3px 0',
              background: isDragging ? 'rgba(255,255,255,0.2)' : 'transparent',
            }}
          />
        </>
      )}
      {children}
    </div>
  )
}

// ═══════════════════════════════════════════════
// Reusable track row
// ═══════════════════════════════════════════════

function Track({
  label,
  width,
  children,
}: {
  label: string
  width: number
  children: React.ReactNode
}) {
  return (
    <div className="timeline-track" style={{ width }}>
      <div className="timeline-track-label">{label}</div>
      <div className="timeline-track-content">{children}</div>
    </div>
  )
}
