import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { clamp, DEFAULT_PANELS, fitPanelColumns, readPanelSizes, type PanelSizes } from '../utils/panelLayout'

export function usePanelLayout(leftVisible: boolean, rightVisible: boolean, storageKey = 'sj-studio-panel-sizes-v1', active = true) {
  const [preferred, setPreferred] = useState(() => {
    try { return readPanelSizes(localStorage.getItem(storageKey)) } catch { return { ...DEFAULT_PANELS } }
  })
  const mainRef = useRef<HTMLElement>(null)
  const centerRef = useRef<HTMLDivElement>(null)
  const [bounds, setBounds] = useState({ width: window.innerWidth - 16, height: window.innerHeight - 170 })
  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      setBounds(previous => {
        const next = { ...previous }
        for (const entry of entries) {
          if (entry.target === mainRef.current && entry.contentRect.width) next.width = entry.contentRect.width
          if (entry.target === centerRef.current && entry.contentRect.height) next.height = entry.contentRect.height
        }
        return next.width === previous.width && next.height === previous.height ? previous : next
      })
    })
    if (mainRef.current) observer.observe(mainRef.current)
    if (centerRef.current) observer.observe(centerRef.current)
    return () => observer.disconnect()
  }, [active])
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try { localStorage.setItem(storageKey, JSON.stringify(preferred)) } catch { /* Layout remains usable if storage is unavailable. */ }
    }, 200)
    return () => window.clearTimeout(timeout)
  }, [preferred, storageKey])
  useEffect(() => {
    const reset = () => setPreferred({ ...DEFAULT_PANELS })
    window.addEventListener('sj-reset-panel-layout', reset)
    return () => window.removeEventListener('sj-reset-panel-layout', reset)
  }, [])
  const columns = fitPanelColumns(bounds.width, preferred, leftVisible, rightVisible)
  const bottomMax = Math.max(160, bounds.height - 280)
  const bottom = clamp(preferred.bottom, 160, bottomMax)
  const change = (key: keyof PanelSizes, value: number) => setPreferred(previous => ({ ...previous, [key]: value }))
  return {
    mainRef, centerRef, ...columns, bottom, bottomMax, change,
    reset: () => setPreferred({ ...DEFAULT_PANELS }),
    style: { '--chapters-width': `${columns.left}px`, '--details-width': `${columns.right}px`, '--tools-height': `${bottom}px` } as CSSProperties
  }
}
