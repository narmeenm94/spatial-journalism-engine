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

export function Vec3Input({ label, value, onChange, step = 0.01, labels = ['X', 'Y', 'Z'] }: Vec3InputProps) {
  const handleChange = (index: number, val: string) => {
    const num = parseFloat(val)
    if (isNaN(num)) return
    const next: [number, number, number] = [...value]
    next[index] = num
    onChange(next)
  }

  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div className="vec3-input">
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ flex: 1 }}>
            <span className="vec3-label">{labels[i]}</span>
            <input
              type="number"
              step={step}
              value={value[i]}
              onChange={(e) => handleChange(i, e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
