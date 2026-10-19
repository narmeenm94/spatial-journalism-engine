import { Vec3Input } from './Vec3Input'
export type TimedPoint = { time:number; position:[number,number,number] }
export function WaypointEditor({points,onChange,label='Movement waypoints'}:{points:TimedPoint[];onChange:(points:TimedPoint[])=>void;label?:string}) {
  return <details><summary>{label} · {points.length}</summary><p>Times are seconds. Positions are inside the environment model. The sound or light moves between these points.</p>
    {points.map((point,i) => <fieldset className="feature-item" key={i}><legend>Point {i+1}</legend><label>At (seconds)<input aria-label={label+' time '+(i+1)} className="form-input" type="number" min="0" step="0.5" value={point.time} onChange={e => onChange(points.map((p,j) => j===i ? {...p,time:Math.max(0,Number(e.target.value))} : p))}/></label><Vec3Input label="Position" value={point.position} onChange={position => onChange(points.map((p,j) => j===i ? {...p,position} : p))}/><button className="btn" onClick={() => onChange(points.filter((_,j) => i!==j))}>Remove point {i+1}</button></fieldset>)}
    <button className="btn" onClick={() => onChange([...points,{time:points.length ? Math.max(...points.map(p => p.time))+5 : 0,position:points.at(-1)?.position || [0,1,0]}])}>Add waypoint</button>
  </details>
}
