import { useRef, useState, type KeyboardEvent } from 'react'
import { clamp } from '../utils/panelLayout'

type Props = {
  name: string
  axis: 'horizontal' | 'vertical'
  value: number
  min: number
  max: number
  reverse?: boolean
  onChange: (value: number) => void
  onReset: () => void
}
/** A dock divider with pointer capture, keyboard resizing and cancellation. */
export function PanelDivider({ name, axis, value, min, max, reverse = false, onChange, onReset }: Props) {
  const drag = useRef<{ pointer: number; origin: number; value: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const sign = reverse ? -1 : 1
  const vertical = axis === 'vertical'
  const keyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    let next: number | undefined
    const step = event.shiftKey ? 40 : 10
    if (event.key === (vertical ? 'ArrowLeft' : 'ArrowUp')) next = value - step * sign
    if (event.key === (vertical ? 'ArrowRight' : 'ArrowDown')) next = value + step * sign
    if (event.key === 'Home') next = min
    if (event.key === 'End') next = max
    if (event.key === 'Enter') { event.preventDefault(); onReset() }
    if (event.key === 'Escape' && drag.current) {
      event.preventDefault(); onChange(drag.current.value); drag.current = null; setDragging(false)
    }
    if (next !== undefined) { event.preventDefault(); onChange(clamp(next, min, max)) }
  }
  return <div className={'panel-divider divider-' + axis} role="separator" tabIndex={0}
    aria-label={'Resize ' + name} aria-orientation={axis} aria-valuemin={min} aria-valuemax={Math.round(max)} aria-valuenow={Math.round(value)} aria-valuetext={Math.round(value) + ' pixels'}
    title={'Drag to resize ' + name + ' · Double-click to reset · Arrow keys to adjust'} data-dragging={dragging || undefined}
    onKeyDown={keyboard} onDoubleClick={onReset}
    onPointerDown={event => {
      if (event.button !== 0) return
      event.preventDefault(); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId)
      drag.current = { pointer: event.pointerId, origin: vertical ? event.clientX : event.clientY, value }; setDragging(true)
    }}
    onPointerMove={event => {
      if (!drag.current || drag.current.pointer !== event.pointerId) return
      const position = vertical ? event.clientX : event.clientY
      onChange(clamp(drag.current.value + (position - drag.current.origin) * sign, min, max))
    }}
    onPointerUp={event => {
      drag.current = null; setDragging(false)
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    }}
    onPointerCancel={() => { if (drag.current) onChange(drag.current.value); drag.current = null; setDragging(false) }}
    onLostPointerCapture={() => { drag.current = null; setDragging(false) }}
  ><span aria-hidden="true" /></div>
}
