import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUDownLeft, ArrowUDownRight, ArrowCounterClockwise, Stop } from '@phosphor-icons/react'
import { keyboardCommand, type DriveCommand, type DriveTelemetry } from '../content/robot-drive'

interface Props { available: boolean; command: DriveCommand; speed: number; follow: boolean; telemetry: DriveTelemetry; stopToken: number; onCommand: (command: DriveCommand) => void; onStop: () => void; onSpeed: (value: number) => void; onFollow: (value: boolean) => void; onReset: () => void }
export default function DrivePanel(props: Props) {
  const [keyboard, setKeyboard] = useState(false), keys = useRef(new Set<string>())
  const latest = useRef(props); latest.current = props
  useEffect(() => { keys.current.clear() }, [props.stopToken])
  useEffect(() => {
    const clear = () => { keys.current.clear(); latest.current.onStop() }
    const editable = (target: EventTarget | null) => target instanceof HTMLElement && Boolean(target.closest('input:not([type=checkbox]):not([type=button]), select, textarea, [contenteditable=true]'))
    const down = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (!keyboard || !latest.current.available || editable(event.target) || event.ctrlKey || event.metaKey || event.altKey) return
      if (event.code === 'Space') { event.preventDefault(); clear(); return }
      if (!['w', 'a', 's', 'd'].includes(key)) return
      event.preventDefault()
      if (event.repeat) return
      keys.current.add(key); latest.current.onCommand(keyboardCommand(keys.current))
    }
    const up = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (!keys.current.has(key)) return
      event.preventDefault(); keys.current.delete(key); latest.current.onCommand(keyboardCommand(keys.current))
    }
    const visibility = () => { if (document.hidden) clear() }
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', clear); document.addEventListener('visibilitychange', visibility)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', clear); document.removeEventListener('visibilitychange', visibility); clear() }
  }, [keyboard])
  const buttons = [
    { label: '前进', icon: ArrowUp, command: { left: 1, right: 1 }, area: 'forward' },
    { label: '左转', icon: ArrowUDownLeft, command: { left: -1, right: 1 }, area: 'left' },
    { label: '右转', icon: ArrowUDownRight, command: { left: 1, right: -1 }, area: 'right' },
    { label: '后退', icon: ArrowDown, command: { left: -1, right: -1 }, area: 'back' },
  ]
  return <section className="drive-panel" aria-label="履带驾驶">
    <div className="panel-heading"><h2>履带驾驶</h2><label className="drive-keyboard"><input type="checkbox" checked={keyboard} disabled={!props.available} onChange={event => { props.onStop(); setKeyboard(event.target.checked) }} />键盘驾驶</label></div>
    <p className="joint-range-note">按住按钮或 W/A/S/D 行驶，松开停止；空格制动。场地范围为 2.2 × 2.2 米。</p>
    <fieldset disabled={!props.available} className="drive-fields"><legend className="sr-only">虚拟履带控制</legend><div className="drive-pad">{buttons.map(item => { const Icon = item.icon; return <button key={item.area} style={{ gridArea: item.area }} aria-label={`${item.label}（按住）`} onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); props.onCommand(item.command) }} onPointerUp={props.onStop} onPointerCancel={props.onStop} onLostPointerCapture={props.onStop}><Icon size={20} /><span>{item.label}</span></button> })}<button className="drive-brake" style={{ gridArea: 'stop' }} aria-label="停止行驶" onClick={props.onStop}><Stop size={18} weight="fill" /><span>停止</span></button></div>
      <div className="drive-speed"><label>行驶速度 <output>{props.speed.toFixed(2)} m/s</output><input aria-label="行驶速度" type="range" min=".05" max=".25" step=".01" value={props.speed} onChange={event => props.onSpeed(Number(event.target.value))} /></label><label><input type="checkbox" checked={props.follow} onChange={event => props.onFollow(event.target.checked)} />跟随镜头</label><button onClick={props.onReset}><ArrowCounterClockwise size={14} />位置复位</button></div>
      <div className="drive-track-controls">{(['left', 'right'] as const).map(side => <label key={side}>{side === 'left' ? '左履带速度' : '右履带速度'}<output>{Math.round(props.command[side] * 100)}%</output><input aria-label={side === 'left' ? '左履带速度' : '右履带速度'} type="range" min="-100" max="100" step="1" value={Math.round(props.command[side] * 100)} onChange={event => props.onCommand({ ...props.command, [side]: Number(event.target.value) / 100 })} onPointerUp={props.onStop} onPointerCancel={props.onStop} onKeyUp={props.onStop} /></label>)}</div>
    </fieldset>
    <div className="drive-telemetry" data-x={props.telemetry.x.toFixed(4)} data-z={props.telemetry.z.toFixed(4)} data-heading={props.telemetry.heading.toFixed(4)}><span>X <strong>{props.telemetry.x.toFixed(2)} m</strong></span><span>Z <strong>{props.telemetry.z.toFixed(2)} m</strong></span><span>朝向 <strong>{Math.round(props.telemetry.heading * 180 / Math.PI)}°</strong></span><span>左右履带 <strong>{props.telemetry.leftVelocity.toFixed(2)} / {props.telemetry.rightVelocity.toFixed(2)}</strong></span></div>
    {props.telemetry.boundary && <p className="drive-boundary" role="status">已到场地边界，行驶已停止；可转向或后退。</p>}
  </section>
}
