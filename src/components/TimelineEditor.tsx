import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Copy, DotsSixVertical, Play, Plus, Trash } from '@phosphor-icons/react'
import { JOINTS, PRESETS, type PresetId } from '../content/robot-motion'
import { durationMs, formatTime, type Timeline, type TimelineStep } from '../content/robot-timeline'

function SecondsInput({ label, value, minimum, disabled, onCommit }: { label: string; value: number; minimum: number; disabled: boolean; onCommit: (value: number) => void }) {
  const [draft, setDraft] = useState(String(value / 1000))
  useEffect(() => setDraft(String(value / 1000)), [value])
  const commit = () => {
    const next = durationMs(Number(draft) * 1000, minimum)
    setDraft(String(next / 1000)); onCommit(next)
  }
  return <label>{label}<span className="seconds-field"><input aria-label={label} type="number" min={minimum / 1000} max="10" step=".1" value={draft} disabled={disabled} onChange={event => setDraft(event.target.value)} onBlur={commit} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }} /><span>秒</span></span></label>
}

interface Props {
  steps: TimelineStep[]; timeline: Timeline; selectedId: string | null; cursor: number; speed: number; available: boolean; busy: boolean
  onAddPose: () => void; onAddPreset: (id: PresetId) => void; onSelect: (id: string) => void
  onChange: (step: TimelineStep) => void; onUpdatePose: () => void; onMove: (id: string, index: number) => void
  onDuplicate: (id: string) => void; onDelete: (id: string) => void; onClear: () => void
  onSeek: (ms: number) => void; onPlay: () => void; onSpeed: (value: number) => void
}

export default function TimelineEditor(props: Props) {
  const { steps, timeline, selectedId, cursor, speed, available, busy } = props
  const [insertPreset, setInsertPreset] = useState<PresetId>('wave')
  const selected = steps.find(step => step.id === selectedId)
  const total = timeline.clip.duration
  const active = timeline.segments.find(segment => cursor >= segment.start && cursor < segment.end)?.id

  return <section className="timeline-editor" aria-label="动作编排编辑器">
    <div className="action-section-heading"><span className="small-heading">一帧姿态，一段回应</span><h2>动作编排</h2><p>记录当前姿态，安排过渡与停留，也可以串联内置动作。当前编排为页面草稿，刷新后清空。</p></div>
    <div className="timeline-toolbar"><button className="timeline-primary" disabled={!available || busy} onClick={props.onAddPose}><Plus size={16} />添加当前姿态</button><button disabled={!available || !steps.length || busy} onClick={props.onPlay}><Play size={14} weight="fill" />从头播放</button><button disabled={!steps.length || busy} onClick={props.onClear}><Trash size={14} />清空编排</button></div>
    <div className="timeline-insert"><label htmlFor="insert-preset">插入内置动作</label><select id="insert-preset" value={insertPreset} disabled={busy} onChange={event => setInsertPreset(event.target.value as PresetId)}>{PRESETS.map(preset => <option key={preset.id} value={preset.id}>{preset.title}</option>)}</select><button disabled={!available || busy} onClick={() => props.onAddPreset(insertPreset)}><Plus size={14} />添加动作</button></div>

    {steps.length === 0 ? <div className="timeline-empty"><span>01 → 02 → 03</span><h3>从一个姿态开始</h3><p>调节左侧关节，点击“添加当前姿态”，再为下一帧设置过渡和停留时间。</p><small>也可以先添加一个内置动作作为起点。</small></div> : <>
      <section className="timeline-ruler" aria-label="编排时间轴"><div className="timeline-summary"><span>{steps.length} 个步骤</span><strong>{formatTime(cursor)} <span>/ {formatTime(total)}</span></strong><label>编排速度<select aria-label="编排播放速度" value={speed} disabled={busy} onChange={event => props.onSpeed(Number(event.target.value))}>{[.5, 1, 1.5, 2].map(value => <option key={value} value={value}>{value}×</option>)}</select></label></div>
        <div className="timeline-track-scroll"><div className="timeline-track" style={{ minWidth: Math.max(0, steps.length * 95) }}>{steps.map((step, index) => { const segment = timeline.segments[index]; return <button key={step.id} className={`timeline-block ${step.kind}${selectedId === step.id ? ' selected' : ''}${active === step.id ? ' active' : ''}`} style={{ flexGrow: (segment.end - segment.start) / total, flexBasis: 0 }} aria-label={`时间轴步骤 ${index + 1}：${step.name}`} onClick={() => props.onSelect(step.id)} disabled={!available}><span>{String(index + 1).padStart(2, '0')}</span><strong>{step.name}</strong><small>{formatTime(segment.end - segment.start)}</small></button> })}</div></div>
        <input aria-label="时间轴播放位置" aria-valuetext={formatTime(cursor)} type="range" min="0" max={total} step="any" value={cursor} disabled={!available} onChange={event => props.onSeek(Number(event.target.value))} />
        <div className="timeline-ticks">{[0, .25, .5, .75, 1].map(fraction => <span key={fraction}>{formatTime(total * fraction)}</span>)}</div>
      </section>
      <ol className="timeline-steps" aria-label="编排步骤">{steps.map((step, index) => <li key={step.id} className={selectedId === step.id ? 'selected' : ''} onDragOver={event => { if (!busy) event.preventDefault() }} onDrop={event => { event.preventDefault(); if (!busy) props.onMove(event.dataTransfer.getData('text/plain'), index) }}>
        <span className="timeline-drag" draggable={!busy} onDragStart={event => { event.dataTransfer.setData('text/plain', step.id); event.dataTransfer.effectAllowed = 'move' }} title="拖动调整顺序"><DotsSixVertical size={17} /></span>
        <button className="timeline-step-select" disabled={!available} onClick={() => props.onSelect(step.id)}><span>{index + 1}</span><span><strong>{step.name}</strong><small>{step.kind === 'pose' ? `姿态 · 过渡 ${formatTime(step.transitionMs)} · 停留 ${formatTime(step.holdMs)}` : `内置动作 · ${formatTime(timeline.segments[index].end - timeline.segments[index].start)}`}</small></span></button>
        <div className="timeline-step-tools"><button aria-label={`上移步骤 ${index + 1}`} disabled={busy || index === 0} onClick={() => props.onMove(step.id, index - 1)}><ArrowUp size={14} /></button><button aria-label={`下移步骤 ${index + 1}`} disabled={busy || index === steps.length - 1} onClick={() => props.onMove(step.id, index + 1)}><ArrowDown size={14} /></button><button aria-label={`复制步骤 ${index + 1}`} disabled={busy} onClick={() => props.onDuplicate(step.id)}><Copy size={14} /></button><button aria-label={`删除步骤 ${index + 1}`} disabled={busy} onClick={() => props.onDelete(step.id)}><Trash size={14} /></button></div>
      </li>)}</ol>
      {selected && <fieldset className="timeline-step-editor" disabled={busy}><legend>编辑选中步骤</legend><label>步骤名称<input aria-label="步骤名称" value={selected.name} maxLength={40} onChange={event => props.onChange({ ...selected, name: event.target.value })} /></label>
        {selected.kind === 'pose' ? <><div className="timeline-time-fields"><SecondsInput key={`${selected.id}-transition`} label="过渡时间" value={selected.transitionMs} minimum={100} disabled={busy} onCommit={value => { if (value !== selected.transitionMs) props.onChange({ ...selected, transitionMs: value }) }} /><SecondsInput key={`${selected.id}-hold`} label="停留时间" value={selected.holdMs} minimum={0} disabled={busy} onCommit={value => { if (value !== selected.holdMs) props.onChange({ ...selected, holdMs: value }) }} /></div><div className="timeline-pose-values">{JOINTS.map(joint => <span key={joint.id}>{joint.label}<strong>{Math.round(selected.pose[joint.id])}°</strong></span>)}</div><div className="timeline-toolbar"><button disabled={!available} onClick={props.onUpdatePose}>更新为当前姿态</button><button disabled={!available} onClick={() => props.onSelect(selected.id)}>预览此步骤</button></div></> : <div className="timeline-preset-fields"><label>内置动作<select aria-label="步骤内置动作" value={selected.presetId} onChange={event => props.onChange({ ...selected, presetId: event.target.value as PresetId })}>{PRESETS.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label>速度<select aria-label="步骤动作速度" value={selected.options.speed} onChange={event => props.onChange({ ...selected, options: { ...selected.options, speed: Number(event.target.value) } })}>{Array.from({ length: 16 }, (_, index) => Number((.5 + index * .1).toFixed(1))).map(value => <option key={value} value={value}>{value}×</option>)}</select></label><label>重复次数<select aria-label="步骤动作次数" value={selected.options.repeat} onChange={event => props.onChange({ ...selected, options: { ...selected.options, repeat: Number(event.target.value) } })}>{[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value} 次</option>)}</select></label><label>左右方向<select aria-label="步骤动作方向" value={selected.options.direction} onChange={event => props.onChange({ ...selected, options: { ...selected.options, direction: event.target.value as 'left' | 'right' } })}><option value="right">右侧</option><option value="left">左侧</option></select></label><label>动作幅度 <output>{Math.round(selected.options.amplitude * 100)}%</output><input aria-label="步骤动作幅度" type="range" min=".25" max="1" step=".05" value={selected.options.amplitude} onChange={event => props.onChange({ ...selected, options: { ...selected.options, amplitude: Number(event.target.value) } })} /></label></div>}
      </fieldset>}
    </>}
    <p className="timeline-note">编排从初始姿态开始。拖动播放位置会停止播放并实时预览；步骤支持拖动排序和上下移动。本轮内容保留在当前页面，刷新或离开章节后清空。</p>
  </section>
}
