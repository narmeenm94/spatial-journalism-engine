import type { StarterKind } from '../utils/starter'
export function TemplateArt({ kind }: { kind: StarterKind }) {
  return (
    <div className="template-art" aria-hidden="true">
      <svg viewBox="0 0 320 110" fill="none">
        <path d="M65 77 160 105 255 66 160 40Z" fill="#e4e4df" />
        {kind === 'gallery' ? (
          <>
            <path
              d="M65 77V25l95 28v52M160 53l95-39v52"
              fill="#fdfdfb"
              stroke="#d2d2cd"
            />
            <path d="m111 66 30 9v22l-30-9Z" fill="#fff" />
            <circle cx="126" cy="57" r="15" stroke="#222" strokeWidth="8" />
            <path d="m188 56 18-9 17 13-6 19-22 2-13-14Z" fill="#edc93b" />
          </>
        ) : kind === 'field' ? (
          <>
            <path
              d="m86 80 112-44M126 95l-8-71"
              stroke="#aaa"
              strokeWidth="5"
            />
            {[0, 1, 2, 3].map((i) => (
              <g
                key={i}
                transform={
                  'translate(' + (140 + i * 24) + ' ' + (60 - i * 6) + ')'
                }
              >
                <path
                  d="m0 0 15 5 12-6V-30l-15-5L0-29Z"
                  fill={i === 2 ? '#edc93b' : '#fafaf7'}
                  stroke="#c4c4bf"
                />
              </g>
            ))}
          </>
        ) : kind === 'interview' ? (
          <>
            <path d="M65 77V20l190-7v53" fill="#e9e9e4" />
            <path
              d="m101 73 24 8V48l-24-7Zm90-7 24-8V28l-24 7Z"
              fill="#252525"
            />
            <path d="m149 77 22 6 13-7V58l-22-6-13 7Z" fill="#edc93b" />
            <path d="M89 64V22h32" stroke="#222" strokeWidth="3" />
          </>
        ) : (
          <>
            <ellipse cx="160" cy="73" rx="70" ry="22" fill="#f9f9f6" />
            <path d="M140 50v26c0 12 40 12 40 0V50" fill="#fff" />
            <ellipse cx="160" cy="50" rx="20" ry="6" fill="#e3e3de" />
            <path
              d="M144 44c-17-26 35-44 30-14s-42 3-18-14"
              stroke="#edc93b"
              strokeWidth="9"
              strokeLinecap="round"
            />
          </>
        )}
      </svg>
    </div>
  )
}
