import { Icon } from './Icon'

/** Small, code-drawn diagrams: no external media needed by the learning UI. */
export function LessonArt({ kind, caption = 'Your story' }: { kind: string; caption?: string }) {
  if (kind === 'save') return <div className="lesson-art file-art" aria-label="Space, chapters and media packaged in one editable JSON">
    <div className="file-ingredients"><Icon name="cube"/><Icon name="chapters"/><Icon name="audio"/></div><Icon name="arrow"/><div className="json-sheet"><span>{'{ }'}</span><strong>story.json</strong><small>Open · edit · share</small></div>
  </div>
  return <div className={'lesson-art scene-art art-' + kind} aria-hidden="true">
    <svg viewBox="0 0 300 150" fill="none"><path d="M32 108 145 51 270 103 153 142Z" fill="#eeeae0" stroke="#b9b6ad"/><path d="M32 108V37L145 9V51M145 9 270 37V103" stroke="#b9b6ad"/><path d="M145 9V51" stroke="#d4d0c6"/><path d="m73 85 31-15 31 14-31 17Z" fill="#f4d451"/><path d="M73 85v24l31 16v-24Z" fill="#d5b637"/><path d="m104 101 31-17v25l-31 16Z" fill="#e9c846"/><path d="m187 39 44 13v34l-44-16Z" fill="white" stroke="#a9a69c"/>
    {kind === 'camera' && <><path className="lesson-route" d="M64 129C90 139 143 117 170 99S222 117 254 95" stroke="#252525" strokeWidth="2" strokeDasharray="4 5"/><circle cx="170" cy="99" r="7" fill="#f4d451" stroke="#252525"/><circle cx="64" cy="129" r="4" fill="#252525"/><circle cx="254" cy="95" r="4" fill="#252525"/></>}
    {kind === 'soundscape' && <><circle cx="185" cy="95" r="13" stroke="#ad9333"/><circle cx="185" cy="95" r="25" stroke="#cdbd80"/><circle cx="185" cy="95" r="37" stroke="#ded4b3"/></>}
    {kind === 'lighting' && <path d="M181 20 125 115 251 115Z" fill="#f7d450" opacity=".3"/>}
    </svg>
    {kind === 'subtitles' ? <span className="art-caption">{caption || 'Give this place a voice.'}</span> : <span className="art-label"><Icon name={kind === 'preview' ? 'play' : kind === 'camera' ? 'camera' : kind === 'timeline' ? 'chapters' : 'cube'} size={13}/>{kind === 'camera' ? 'Frame → capture → glide' : kind === 'preview' ? 'See it as your audience' : caption}</span>}
  </div>
}
