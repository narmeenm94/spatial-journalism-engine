export const DEFAULT_PANELS = { left: 260, right: 300, bottom: 260 }
export type PanelSizes = typeof DEFAULT_PANELS
export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(min, max), Math.max(min, value))
export function readPanelSizes(raw: string | null): PanelSizes {
  try {
    const data = JSON.parse(raw || '{}')
    const number = (key: keyof PanelSizes, min: number, max: number) => typeof data?.[key] === 'number' && Number.isFinite(data[key]) ? clamp(data[key], min, max) : DEFAULT_PANELS[key]
    return { left: number('left', 220, 520), right: number('right', 260, 560), bottom: number('bottom', 160, 900) }
  } catch { return { ...DEFAULT_PANELS } }
}
/** Keep a useful canvas even when restoring a wide layout on a smaller display. */
export function fitPanelColumns(width: number, sizes: PanelSizes, leftVisible: boolean, rightVisible: boolean) {
  let left = leftVisible ? clamp(sizes.left, 220, 520) : 0
  let right = rightVisible ? clamp(sizes.right, 260, 560) : 0
  const available = Math.max(0, width - 360 - (Number(leftVisible) + Number(rightVisible)) * 8)
  const flexible = Math.max(0, left - 220) + Math.max(0, right - 260)
  const excess = Math.max(0, left + right - available)
  if (flexible && excess) {
    const share = Math.min(1, excess / flexible)
    if (leftVisible) left -= (left - 220) * share
    if (rightVisible) right -= (right - 260) * share
  }
  return { left: Math.round(left), right: Math.round(right), leftMax: Math.max(220, Math.min(520, available - right)), rightMax: Math.max(260, Math.min(560, available - left)) }
}
