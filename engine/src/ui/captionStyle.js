export const DEFAULT_CAPTION_STYLE = Object.freeze({
  font: '', fontSize: 18, mobileFontSize: 16, fontWeight: 400, lineHeight: 1.5,
  color: '#ffffff', backgroundColor: '#000000', backgroundOpacity: .6,
  align: 'center', position: 'bottom', offset: 80, width: 90, maxWidth: 800,
  padding: 12, radius: 8, textShadow: true
})
const bounded = (value, fallback, min, max) => typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback
const hex = (value, fallback) => /^#[0-9a-f]{6}$/i.test(value || '') ? value : fallback
export function normalizeCaptionStyle(input = {}) {
  const d = DEFAULT_CAPTION_STYLE, s = { ...d, ...input }
  return { ...s, font: typeof s.font === 'string' ? s.font : '',
    fontSize: bounded(s.fontSize,d.fontSize,12,64), mobileFontSize: bounded(s.mobileFontSize,d.mobileFontSize,12,40),
    fontWeight: bounded(s.fontWeight,d.fontWeight,100,900), lineHeight: bounded(s.lineHeight,d.lineHeight,1,2.5),
    color: hex(s.color,d.color), backgroundColor: hex(s.backgroundColor,d.backgroundColor),
    backgroundOpacity: bounded(s.backgroundOpacity,d.backgroundOpacity,0,1),
    width: bounded(s.width,d.width,30,100), maxWidth: bounded(s.maxWidth,d.maxWidth,240,1600),
    offset: bounded(s.offset,d.offset,0,200), padding: bounded(s.padding,d.padding,0,40), radius: bounded(s.radius,d.radius,0,40),
    align: ['left','center','right'].includes(s.align) ? s.align : d.align,
    position: s.position === 'top' ? 'top' : 'bottom', textShadow: s.textShadow !== false }
}
export function captionStyles(input, fallbackFont = 'sans-serif', mobile = false) {
  const s = normalizeCaptionStyle(input), c = s.backgroundColor
  return {
    container: { position: 'absolute', left: '50%', right: 'auto', transform: 'translateX(-50%)',
      width: s.width + '%', maxWidth: s.maxWidth + 'px', boxSizing: 'border-box',
      top: s.position === 'top' ? 'calc(' + s.offset + 'px + env(safe-area-inset-top, 0px))' : 'auto',
      bottom: s.position === 'bottom' ? 'calc(' + s.offset + 'px + env(safe-area-inset-bottom, 0px))' : 'auto', pointerEvents: 'none' },
    text: { fontFamily: s.font || fallbackFont, fontSize: (mobile ? s.mobileFontSize : s.fontSize) + 'px', fontWeight: String(s.fontWeight),
      lineHeight: String(s.lineHeight), color: s.color, textAlign: s.align, padding: s.padding + 'px ' + (s.padding * 1.6) + 'px',
      background: 'rgba(' + [parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16),s.backgroundOpacity].join(',') + ')',
      borderRadius: s.radius + 'px', margin: '0', boxSizing: 'border-box', overflowWrap: 'anywhere',
      textShadow: s.textShadow ? '0 2px 4px rgba(0,0,0,.8)' : 'none' }
  }
}
