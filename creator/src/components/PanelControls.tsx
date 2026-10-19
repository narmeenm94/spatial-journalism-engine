import { Icon } from './Icon'
export function PanelControls({name, expanded, collapsed = false, onExpand, onCollapse}: {
  name: string; expanded: boolean; collapsed?: boolean; onExpand: () => void; onCollapse: () => void
}) {
  return <span className="panel-controls">
    <button className="btn-icon panel-expand" aria-label={(expanded ? 'Restore ' : 'Expand ') + name + ' panel'} title={expanded ? 'Restore panel · Esc' : 'Expand panel'} aria-pressed={expanded} onClick={onExpand}><Icon name={expanded ? 'restore' : 'expand'} size={15}/></button>
    <button className="btn-icon" aria-label={(collapsed ? 'Show ' : 'Collapse ') + name + ' panel'} title={collapsed ? 'Show panel' : 'Collapse panel'} aria-expanded={!collapsed} onClick={onCollapse}><Icon name={collapsed ? 'up' : 'minus'} size={15}/></button>
  </span>
}
