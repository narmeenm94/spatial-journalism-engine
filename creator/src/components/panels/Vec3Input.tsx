import { Icon } from '../Icon'
/**
 * Reusable Vec3 input component for editing position/rotation/scale
 */

interface Vec3InputProps {
  label: string
  value: [number, number, number]
  onChange: (value: [number, number, number]) => void
  step?: number
  labels?: [string, string, string]
}

export function Vec3Input({
  label,
  value,
  onChange,
  step = 0.01,
  labels = ['X', 'Y', 'Z']
}: Vec3InputProps) {
  const handleChange = (index: number, val: string) => {
    const num = parseFloat(val)
    if (!Number.isFinite(num)) return
    const next: [number, number, number] = [...value]
    next[index] = num
    onChange(next)
  }

  return (
    <details className="form-group vector-setting">
      <summary><Icon name={/rotat/i.test(label)?'rotate':/scale/i.test(label)?'scale':'move'} size={20}/>{label}</summary>
      <div className="vec3-input">
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ flex: 1, minWidth: 0 }}>
            <span className="vec3-label">{labels[i]}</span>
            <input
              type="number"
              aria-label={`${label} ${labels[i]}`}
              step={step}
              value={value[i]}
              onChange={(e) => handleChange(i, e.target.value)}
            />
          </div>
        ))}
      </div>
    </details>
  )
}
