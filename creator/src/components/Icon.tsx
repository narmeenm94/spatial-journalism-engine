import type { CSSProperties } from 'react'
const paths: Record<string, string> = {
  phone: 'M7 2h10v20H7ZM10 18h4',
  expand: 'M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5',
  restore: 'M3 8h5V3m8 0v5h5M3 16h5v5m8 0v-5h5',
  minus: 'M5 12h14',
  plus: 'M12 5v14M5 12h14',
  close: 'm6 6 12 12M6 18 18 6',
  play: 'm8 5 11 7-11 7Z',
  folder: 'M3 7V5h6l2 2h10v13H3Z',
  download: 'M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5',
  undo: 'M8 4 3 9l5 5M3 9h10a6 6 0 0 1 0 12',
  redo: 'm16 4 5 5-5 5m5-5H11a6 6 0 0 0 0 12',
  move: 'M12 3v18M3 12h18m-12-6 3-3 3 3m-9 3-3 3 3 3m3 3 3 3 3-3m3-9 3 3-3 3',
  rotate: 'M20 10a8 8 0 1 0-2 8M20 3v7h-7',
  scale: 'M8 3H3v5m13 13h5v-5M3 3l7 7m4 4 7 7',
  grid: 'M3 3h18v18H3ZM3 9h18M3 15h18M9 3v18M15 3v18',
  camera: 'M3 7h4l2-3h6l2 3h4v14H3ZM16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  image: 'M3 3h18v18H3Zm0 14 5-5 4 4 3-3 6 6M8 7h.01',
  cube: 'm12 2 10 5v10l-10 5-10-5V7Zm0 10v10M2 7l10 5 10-5M7 4.5l10 5',
  audio: 'M9 18V5l11-2v13M9 9l11-2M9 18a3 3 0 1 1-3-3h3m11 1a3 3 0 1 1-3-3h3',
  video: 'M3 5h13v14H3Zm13 6 5-4v10l-5-4',
  chapters: 'M5 3h14v18H5ZM8 8h8M8 12h8M8 16h5',
  settings: 'M4 7h16M4 17h16M8 4v6m8 4v6',
  check: 'm5 12 4 4L19 6',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  light: 'M9 21h6M9 17c0-3-4-4-4-8a7 7 0 0 1 14 0c0 4-4 5-4 8Z',
  text: 'M4 5h16M12 5v15M8 20h8',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
  up: 'm6 14 6-6 6 6',
  down: 'm6 10 6 6 6-6',
  copy: 'M8 8h13v13H8ZM3 16V3h13',
  info: 'M12 11v6m0-10h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0'
}
export function Icon({
  name,
  size = 18,
  style
}: {
  name: string
  size?: number
  style?: CSSProperties
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d={paths[name] || paths.cube} />
    </svg>
  )
}
