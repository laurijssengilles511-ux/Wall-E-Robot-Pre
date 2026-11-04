import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowCounterClockwise, ArrowsIn, ArrowsLeftRight, ArrowsOut, CaretDown, DoorOpen, Eye, Hand, HandGrabbing, Pause, Play, Plus, Shuffle, Stop, Target } from '@phosphor-icons/react'
import RobotViewer, { type ViewerStatus } from './RobotViewer'
import TimelineEditor from './TimelineEditor'
import DrivePanel from './DrivePanel'
import ViewerSettingsPanel from './ViewerSettingsPanel'
import ExpressionLab from './ExpressionLab'
import { buildClip, clampPose, DEFAULT_OPTIONS, JOINTS, mirrorPose, neutralPose, PRESETS, sampleClip, type Clip, type JointId, type MotionOptions, type Pose, type PresetId } from '../content/robot-motion'
import { compileTimeline, duplicateStep, moveStep, type TimelineStep } from '../content/robot-timeline'
import { calibrationErrors, clampToCalibration, loadSettings, SETTINGS_KEY, type Appearance, type Calibration, type ViewerSettings } from '../content/robot-settings'
import { initialDrive, normalizeCommand, STOP_DRIVE, type DriveCommand, type DriveTelemetry } from '../content/robot-drive'
import type { HighlightPart } from './vehicle-visuals'
import { buildExpression, compileExpressionPreviews, expressionSteps, EXPRESSION_EXAMPLES, initialExpressionSelection, type ExpressionPlan, type ExpressionPreview, type ExpressionSelection } from '../content/robot-expression'

const icons = { eye: Eye, nod: CaretDown, wave: Hand, grip: HandGrabbing, door: DoorOpen, turn: ArrowsLeftRight, show: Target, reset: ArrowCounterClockwise }
const tabs = [{ id: 'expression', label: '表达实验' }, { id: 'presets', label: '内置动作' }, { id: 'timeline', label: '动作编排' }, { id: 'drafts', label: '我的动作' }, { id: 'status', label: '校准与状态' }] as const
type Tab = typeof tabs[number]['id']
type Playback = 'idle' | 'playing' | 'paused'
type Source = 'preset' | 'timeline' | 'expression'

export default function RobotPlayground() {
  const [pose, setPose] = useState<Pose>(neutralPose), poseRef = useRef(pose)
  const [settings, setSettings] = useState<ViewerSettings>(loadSettings), calibrationRef = useRef(settings.calibration)
  calibrationRef.current = settings.calibration
  const [settingsNotice, setSettingsNotice] = useState('可将校准与外观配置保存到当前浏览器。')
  const [highlight, setHighlight] = useState<HighlightPart>(null), [controlMode, setControlMode] = useState<'pose' | 'drive'>('pose')
  const [driveCommand, setDriveCommand] = useState<DriveCommand>(STOP_DRIVE), [driveSpeed, setDriveSpeed] = useState(.12), [follow, setFollow] = useState(true)
  const [driveResetToken, setDriveResetToken] = useState(0), [driveStopToken, setDriveStopToken] = useState(0)
  const [telemetry, setTelemetry] = useState<DriveTelemetry>(initialDrive)
  const [viewerStatus, setViewerStatus] = useState<ViewerStatus>('loading')
  const [selected, setSelected] = useState<PresetId>('look')
  const [options, setOptions] = useState<MotionOptions>(DEFAULT_OPTIONS)
  const [expression, setExpression] = useState<ExpressionSelection>(initialExpressionSelection)
  const expressionExample = EXPRESSION_EXAMPLES.find(item => item.id === expression.exampleId)!
  const expressionPlan = useMemo(() => buildExpression(expressionExample, expression.settings), [expressionExample, expression.settings])
  const expressionCues = useRef<{ start: number; label: string }[]>([])
  const [playback, setPlayback] = useState<Playback>('idle')
  const [progress, setProgress] = useState(0), [completed, setCompleted] = useState(false)
  const [tab, setTab] = useState<Tab>('expression'), [expanded, setExpanded] = useState(false)
  const [steps, setSteps] = useState<TimelineStep[]>([]), [selectedStep, setSelectedStep] = useState<string | null>(null)
  const [timelineCursor, setTimelineCursor] = useState(0), [timelineSpeed, setTimelineSpeed] = useState(1)
  const [source, setSource] = useState<Source>('preset'), sourceRef = useRef<Source>('preset')
  const [playbackLabel, setPlaybackLabel] = useState('预设动作')
  const expandButton = useRef<HTMLButtonElement>(null)
  const frame = useRef(0), clip = useRef<Clip | null>(null), elapsed = useRef(0), lastTime = useRef(0), rate = useRef(1)
  const playing = useRef(false)
  const timeline = useMemo(() => compileTimeline(steps), [steps])
  const available = viewerStatus === 'ready', busy = playback !== 'idle'

  const updatePose = useCallback((value: Pose) => { const next = clampToCalibration(value, calibrationRef.current); poseRef.current = next; setPose(next) }, [])
  const stopMotion = useCallback(() => {
    playing.current = false; cancelAnimationFrame(frame.current); frame.current = 0; setPlayback('idle')
  }, [])
  const stopDrive = useCallback(() => {
    setDriveCommand(previous => previous.left || previous.right ? STOP_DRIVE : previous)
    setDriveStopToken(value => value + 1)
  }, [])
  const stop = useCallback(() => { stopMotion(); stopDrive() }, [stopMotion, stopDrive])
  const commandDrive = useCallback((command: DriveCommand) => {
    if (viewerStatus !== 'ready') return
    stopMotion(); clip.current = null; setCompleted(false); setProgress(0); setHighlight('tracks'); setDriveCommand(normalizeCommand(command))
  }, [viewerStatus, stopMotion])
  const resetPose = () => {
    stop(); clip.current = null; elapsed.current = 0; setProgress(0); setCompleted(false)
    setTimelineCursor(0); setHighlight(null); updatePose(neutralPose())
  }
  const tick = useCallback(function advance(now: number) {
    if (!playing.current || !clip.current) return
    elapsed.current = Math.min(clip.current.duration, elapsed.current + Math.max(0, now - lastTime.current) * rate.current)
    lastTime.current = now
    updatePose(sampleClip(clip.current, elapsed.current))
    setProgress(elapsed.current / Math.max(1, clip.current.duration))
    if (sourceRef.current === 'timeline') setTimelineCursor(elapsed.current)
    if (sourceRef.current === 'expression') {
      const cue = [...expressionCues.current].reverse().find(item => elapsed.current >= item.start)
      if (cue) setPlaybackLabel(cue.label)
    }
    if (elapsed.current >= clip.current.duration) { playing.current = false; frame.current = 0; setPlayback('idle'); setCompleted(true); return }
    frame.current = requestAnimationFrame(advance)
  }, [updatePose])
  const resume = () => {
    if (!available || !clip.current || clip.current.duration <= 0) return
    playing.current = true; lastTime.current = performance.now(); setPlayback('playing')
    frame.current = requestAnimationFrame(tick)
  }
  const pause = useCallback(() => {
    if (!playing.current) return
    playing.current = false; cancelAnimationFrame(frame.current); frame.current = 0; setPlayback('paused')
  }, [])
  const setMotionSource = (value: Source) => { sourceRef.current = value; setSource(value) }
  const play = (id: PresetId) => {
    if (!available) return
    stop(); setSelected(id); setMotionSource('preset'); setPlaybackLabel(PRESETS.find(item => item.id === id)!.title)
    clip.current = buildClip(id, poseRef.current, options); rate.current = 1
    elapsed.current = 0; setProgress(0); setCompleted(false); resume()
  }
  const clearExpressionPlayback = () => {
    stop(); clip.current = null; setCompleted(false); setProgress(0)
  }
  const changeExpression = (value: ExpressionSelection) => {
    clearExpressionPlayback(); setExpression(value)
  }
  const playExpression = (previews: ExpressionPreview[]) => {
    if (!available) return
    const compiled = compileExpressionPreviews(previews)
    if (!compiled.clip.duration) return
    stop(); setMotionSource('expression'); expressionCues.current = compiled.cues
    setPlaybackLabel(compiled.cues[0].label); clip.current = compiled.clip; rate.current = 1
    elapsed.current = 0; setProgress(0); setCompleted(false); updatePose(neutralPose()); resume()
  }
  const playTimeline = (from = timelineCursor) => {
    if (!available || !steps.length) return
    stop(); setMotionSource('timeline'); setPlaybackLabel('动作编排')
    clip.current = timeline.clip; rate.current = timelineSpeed
    elapsed.current = from >= timeline.clip.duration ? 0 : Math.max(0, from)
    setTimelineCursor(elapsed.current); setProgress(elapsed.current / timeline.clip.duration); setCompleted(false)
    updatePose(sampleClip(timeline.clip, elapsed.current)); resume()
  }
  const manualPose = (value: Pose) => { stop(); clip.current = null; setProgress(0); setCompleted(false); updatePose(clampPose(value)) }
  const setJoint = (id: JointId, value: number) => { setHighlight(id); manualPose({ ...poseRef.current, [id]: value }) }
  const randomPose = () => { setHighlight(null); manualPose(Object.fromEntries(JOINTS.map(joint => { const limits = calibrationRef.current[joint.id]; return [joint.id, limits.min + (limits.max - limits.min) * (.2 + Math.random() * .6)] })) as Pose) }
  const applyCalibration = (profile: Calibration) => {
    if (calibrationErrors(profile).length) return
    stop(); calibrationRef.current = profile; setSettings(previous => ({ ...previous, calibration: profile })); updatePose(poseRef.current)
    setSettingsNotice('校准已应用，点击保存可在刷新后保留。')
  }
  const saveSettings = (profile: Calibration) => {
    if (calibrationErrors(profile).length) return
    applyCalibration(profile)
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, calibration: profile })); setSettingsNotice('校准与外观配置已保存到本机。') }
    catch { setSettingsNotice('配置已应用，但当前浏览器无法保存到本机。') }
  }
  const changeAppearance = (appearance: Appearance) => { setSettings(previous => ({ ...previous, appearance })); setSettingsNotice('外观已应用，点击保存可在刷新后保留。') }
  const resetDrivingPosition = () => { stop(); updatePose({ ...poseRef.current, bodyYaw: 0 }); setDriveResetToken(value => value + 1) }
  const seekTimeline = (time: number) => {
    stop(); setMotionSource('timeline'); setPlaybackLabel('动作编排'); setCompleted(false)
    clip.current = timeline.clip; elapsed.current = Math.max(0, Math.min(timeline.clip.duration, time))
    setTimelineCursor(elapsed.current); setProgress(timeline.clip.duration ? elapsed.current / timeline.clip.duration : 0)
    if (available && steps.length) updatePose(sampleClip(timeline.clip, elapsed.current))
  }
  const selectStep = (id: string) => {
    setSelectedStep(id)
    seekTimeline(timeline.segments.find(segment => segment.id === id)?.previewTime ?? 0)
  }
  const commitSteps = (next: TimelineStep[], focusId: string | null = selectedStep) => {
    stop(); clip.current = null; setCompleted(false); setProgress(0); setMotionSource('timeline'); setPlaybackLabel('动作编排')
    const focused = next.find(step => step.id === focusId)?.id ?? next[0]?.id ?? null
    setSteps(next); setSelectedStep(focused)
    const compiled = compileTimeline(next), time = compiled.segments.find(segment => segment.id === focused)?.previewTime ?? 0
    elapsed.current = time; setTimelineCursor(time); setProgress(compiled.clip.duration ? time / compiled.clip.duration : 0)
    if (available && next.length) updatePose(sampleClip(compiled.clip, time))
  }
  const addPose = () => {
    const id = crypto.randomUUID()
    commitSteps([...steps, { id, kind: 'pose', name: `姿态 ${steps.filter(step => step.kind === 'pose').length + 1}`, pose: { ...poseRef.current }, transitionMs: 800, holdMs: 300 }], id)
    setTab('timeline')
  }
  const addPreset = (presetId: PresetId) => {
    const id = crypto.randomUUID(), name = PRESETS.find(item => item.id === presetId)!.title
    commitSteps([...steps, { id, kind: 'preset', name, presetId, options: { ...options } }], id)
    setTab('timeline')
  }
  const addExpression = (plan: ExpressionPlan, label: string) => {
    if (!available || plan.suppressed) return
    const additions = expressionSteps(plan, label, () => crypto.randomUUID())
    commitSteps([...steps, ...additions], additions[0]?.id); setTab('timeline')
  }
  const changeStep = (updated: TimelineStep) => {
    const previous = steps.find(step => step.id === updated.id)
    const next = steps.map(step => step.id === updated.id ? updated : step)
    // Renaming must not overwrite a manually adjusted pose waiting to be captured.
    if (previous && JSON.stringify({ ...previous, name: '' }) === JSON.stringify({ ...updated, name: '' })) setSteps(next)
    else commitSteps(next, updated.id)
  }
  const updateStepPose = () => {
    const step = steps.find(item => item.id === selectedStep)
    if (step?.kind === 'pose') commitSteps(steps.map(item => item.id === selectedStep ? { ...step, pose: { ...poseRef.current } } : item))
  }
  const duplicate = (id: string) => {
    const index = steps.findIndex(step => step.id === id)
    if (index < 0) return
    const copy = duplicateStep(steps[index], crypto.randomUUID()), next = [...steps]
    next.splice(index + 1, 0, copy); commitSteps(next, copy.id)
  }
  const remove = (id: string) => {
    const index = steps.findIndex(step => step.id === id), next = steps.filter(step => step.id !== id)
    commitSteps(next, selectedStep === id ? next[Math.min(index, next.length - 1)]?.id ?? null : selectedStep)
  }
  const changeTab = (value: Tab) => {
    stop(); clip.current = null; setProgress(0); setCompleted(false); setTab(value)
    if (value === 'timeline') seekTimeline(timelineCursor)
  }

  useEffect(() => {
    const onVisibility = () => { if (document.hidden) pause() }
    document.addEventListener('visibilitychange', onVisibility)
    return () => { playing.current = false; cancelAnimationFrame(frame.current); document.removeEventListener('visibilitychange', onVisibility) }
  }, [pause])
  useEffect(() => { if (viewerStatus !== 'ready') stop() }, [viewerStatus, stop])
  useEffect(() => {
    if (!expanded) return
    const scroll = window.scrollY
    document.body.classList.add('workbench-mode')
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); setExpanded(false) } }
    window.addEventListener('keydown', escape)
    return () => {
      document.body.classList.remove('workbench-mode'); window.removeEventListener('keydown', escape)
      if (expandButton.current?.isConnected) { window.scrollTo(0, scroll); expandButton.current.focus({ preventScroll: true }) }
    }
  }, [expanded])

  const drivingActive = Boolean(driveCommand.left || driveCommand.right)
  const statusText = !available ? (viewerStatus === 'loading' ? '模型加载后即可操作' : '三维暂不可用，请查看静态预览') : drivingActive ? '正在行驶 · 松键、松开按钮或按空格停止'
    : playback === 'playing' ? `正在播放 · ${playbackLabel}` : playback === 'paused' ? `已暂停 · ${playbackLabel}`
    : completed ? `播放完成 · ${playbackLabel}` : tab === 'expression' ? '就绪 · 选择语句，生成一段回应' : source === 'timeline' && tab === 'timeline' ? '编排预览 · 可拖动时间轴或从头播放' : '就绪 · 可选择动作或手动调节'
  const canPlay = available && tab !== 'status' && (playback !== 'idle' || (tab === 'expression' ? !expressionPlan.suppressed : tab === 'presets' || steps.length > 0))
  const playCurrent = () => {
    if (playback === 'playing') pause()
    else if (playback === 'paused') resume()
    else if (tab === 'expression') playExpression([{ plan: expressionPlan, label: `表达 · ${expressionExample.text}` }])
    else if (tab === 'presets') play(selected)
    else playTimeline()
  }

  return <section className="robot-playground" aria-label="瓦力虚拟调试台" data-expanded={expanded} data-mode={tab}>
    <div className="playground-banner"><span className="simulation-badge"><span />虚拟演示</span><p>{expanded ? 'WALL·E / 虚拟工作台' : '选择语句预览表达，也可自由调节与编排动作。'}</p><span className="playground-local">本机运行 · 无需连接机器人</span><button ref={expandButton} className="workbench-toggle" aria-pressed={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? <ArrowsIn size={16} /> : <ArrowsOut size={16} />}{expanded ? '返回作品集' : '全屏工作台'}</button></div>
    <div className="playground-layout">
      <div className="playground-left">
        <RobotViewer pose={pose} settings={settings} drive={driveCommand} driveSpeed={driveSpeed} follow={follow} showArena={controlMode === 'drive'} driveResetToken={driveResetToken} highlight={highlight} onHighlight={setHighlight} onStatusChange={setViewerStatus} onTelemetry={setTelemetry} onDriveStop={stopDrive} />
        <div className="pose-shortcuts"><button disabled={!available} onClick={() => manualPose(mirrorPose(poseRef.current))}><ArrowsLeftRight size={15} />镜像姿态</button><button disabled={!available} onClick={randomPose}><Shuffle size={15} />随机姿态</button><button disabled={!available} onClick={resetPose}><ArrowCounterClockwise size={15} />姿态复位</button></div>
        <section className="joint-panel" aria-label="机器人控制"><div className="left-control-tabs" role="tablist" aria-label="左侧控制模式"><button role="tab" aria-selected={controlMode === 'pose'} onClick={() => { stopDrive(); setControlMode('pose') }}>姿态调节</button><button role="tab" aria-selected={controlMode === 'drive'} onClick={() => { stop(); setControlMode('drive'); setHighlight('tracks') }}>履带驾驶</button></div>{controlMode === 'pose' ? <><div className="panel-heading"><h2 id="joint-heading">关节调节</h2><span>姿态指令角 / °</span></div><p className="joint-range-note">以下为虚拟范围；映射后的显示角度见“校准与状态”。</p><fieldset disabled={!available} className="joint-grid"><legend className="sr-only">调节瓦力各关节</legend>{JOINTS.map(joint => <div className="joint-control" key={joint.id}><div><label htmlFor={`joint-${joint.id}`}>{joint.label}</label><output htmlFor={`joint-${joint.id}`}>{Math.round(pose[joint.id])}°</output></div><input id={`joint-${joint.id}`} type="range" min={settings.calibration[joint.id].min} max={settings.calibration[joint.id].max} step="1" value={pose[joint.id]} onFocus={() => setHighlight(joint.id)} onChange={event => setJoint(joint.id, Number(event.target.value))} /><small>{joint.hint}</small></div>)}</fieldset></> : <DrivePanel available={available} command={driveCommand} speed={driveSpeed} follow={follow} telemetry={telemetry} stopToken={driveStopToken} onCommand={commandDrive} onStop={stopDrive} onSpeed={setDriveSpeed} onFollow={setFollow} onReset={resetDrivingPosition} />}</section>
      </div>
      <div className="playground-right">
        <div className="playground-tabs" role="tablist" aria-label="工作台功能">{tabs.map((item, index) => <button key={item.id} id={`workbench-tab-${item.id}`} role="tab" aria-selected={tab === item.id} aria-controls={`workbench-panel-${item.id}`} tabIndex={tab === item.id ? 0 : -1} onClick={() => changeTab(item.id)} onKeyDown={event => { let next = index; if (event.key === 'ArrowRight') next = (index + 1) % tabs.length; else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length; else if (event.key === 'Home') next = 0; else if (event.key === 'End') next = tabs.length - 1; else return; event.preventDefault(); changeTab(tabs[next].id); document.getElementById(`workbench-tab-${tabs[next].id}`)?.focus() }}>{item.label}</button>)}</div>
        <div id={`workbench-panel-${tab}`} role="tabpanel" aria-labelledby={`workbench-tab-${tab}`}>
          {tab === 'expression' ? <ExpressionLab selection={expression} available={available} busy={busy} onChange={changeExpression} onStop={clearExpressionPlayback} onPreview={playExpression} onAppend={addExpression} />
            : tab === 'timeline' ? <TimelineEditor steps={steps} timeline={timeline} selectedId={selectedStep} cursor={timelineCursor} speed={timelineSpeed} available={available} busy={busy} onAddPose={addPose} onAddPreset={addPreset} onSelect={selectStep} onChange={changeStep} onUpdatePose={updateStepPose} onMove={(id, index) => commitSteps(moveStep(steps, id, index), id)} onDuplicate={duplicate} onDelete={remove} onClear={() => commitSteps([], null)} onSeek={seekTimeline} onPlay={() => playTimeline(0)} onSpeed={setTimelineSpeed} />
            : tab === 'presets' ? <><div className="action-section-heading"><span className="small-heading">让姿态成为回应</span><h2>预设动作</h2><p>点击卡片预览；也可以将动作加入编排，连续播放。</p></div>
              <fieldset className="motion-parameters" disabled={busy}><legend>动作参数</legend><label><span>重复次数 <output>{options.repeat} 次</output></span><input aria-label="重复次数" type="range" min="1" max="5" step="1" value={options.repeat} onChange={event => setOptions({ ...options, repeat: Number(event.target.value) })} /></label><label><span>播放速度 <output>{options.speed.toFixed(1)}×</output></span><input aria-label="播放速度" type="range" min=".5" max="2" step=".1" value={options.speed} onChange={event => setOptions({ ...options, speed: Number(event.target.value) })} /></label><label><span>动作幅度 <output>{Math.round(options.amplitude * 100)}%</output></span><input aria-label="动作幅度" type="range" min=".25" max="1" step=".05" value={options.amplitude} onChange={event => setOptions({ ...options, amplitude: Number(event.target.value) })} /></label><label><span>起始方向 / 挥手侧</span><select aria-label="动作方向" value={options.direction} onChange={event => setOptions({ ...options, direction: event.target.value as MotionOptions['direction'] })}><option value="right">右侧</option><option value="left">左侧</option></select></label><p className="motion-parameter-note">左右侧用于环顾、挥手和转身；播放期间参数保持固定。</p></fieldset>
              <div className="preset-grid">{PRESETS.map(item => { const Icon = icons[item.icon]; return <div className="preset-item" key={item.id}><button className={`preset-card${selected === item.id ? ' selected' : ''}`} disabled={!available} onClick={() => play(item.id)} aria-label={`预览动作：${item.title}`} aria-pressed={selected === item.id}><span className="preset-icon"><Icon size={26} weight="light" /></span><strong>{item.title}</strong><small>{item.detail}</small><span className="preset-play"><Play size={12} weight="fill" />虚拟预览</span></button><button className="preset-append" disabled={!available || busy} aria-label={`加入编排：${item.title}`} onClick={() => addPreset(item.id)}><Plus size={12} />加入编排</button></div> })}</div>
            </> : tab === 'drafts' ? <section className="motion-drafts"><div className="action-section-heading"><span className="small-heading">本页正在创作的回应</span><h2>我的动作</h2><p>这里展示当前编排草稿，切换页签或全屏后可以继续编辑。</p></div>{steps.length ? <article className="motion-draft-card"><span className="small-heading">当前页面草稿</span><h3>当前编排</h3><p>{steps.length} 个步骤 · {(timeline.clip.duration / 1000).toFixed(2)} 秒</p><ol>{steps.slice(0, 5).map(step => <li key={step.id}>{step.name || '未命名步骤'}</li>)}</ol>{steps.length > 5 && <small>另有 {steps.length - 5} 个步骤</small>}<div className="timeline-toolbar"><button onClick={() => changeTab('timeline')}>继续编辑</button><button disabled={!available} onClick={() => { setTab('timeline'); playTimeline(0) }}><Play size={14} weight="fill" />预览当前编排</button></div></article> : <div className="timeline-empty"><h3>还没有编排草稿</h3><p>捕获一个姿态，或加入一段内置动作，开始创作。</p><div className="timeline-toolbar"><button onClick={() => changeTab('timeline')}>开始编排</button><button onClick={() => changeTab('presets')}>挑选内置动作</button></div></div>}<p className="timeline-note">当前草稿在刷新或离开章节后清空。动作草稿仅保留在当前页面。</p></section>
            : <section className="joint-status-panel"><dl className="workbench-status"><div><dt>三维模型</dt><dd>{viewerStatus === 'ready' ? '已就绪' : viewerStatus === 'loading' ? '加载中' : '静态预览'}</dd></div><div><dt>播放状态</dt><dd>{drivingActive ? '行驶中' : playback === 'playing' ? '播放中' : playback === 'paused' ? '已暂停' : '已停止'}</dd></div><div><dt>当前编排</dt><dd>{steps.length} 个步骤</dd></div><div><dt>校准状态</dt><dd>虚拟配置 · 待实机确认</dd></div></dl><ViewerSettingsPanel calibration={settings.calibration} appearance={settings.appearance} pose={pose} notice={settingsNotice} onApply={applyCalibration} onSave={saveSettings} onAppearance={changeAppearance} onHighlight={setHighlight} /></section>}
        </div>
        <section className="playback-panel" aria-label="动作播放控制" data-playback={playback} data-source={source}><div className="playback-status"><p role="status">{statusText}</p><span>{Math.round(progress * 100)}%</span></div><progress aria-label="动作播放进度" value={progress} max="1" /><div className="playback-buttons"><button className="play-action" disabled={!canPlay} onClick={playCurrent}>{playback === 'playing' ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}{playback === 'playing' ? '暂停' : playback === 'paused' ? '继续' : '播放'}</button><button disabled={!available || (playback === 'idle' && !drivingActive)} onClick={stop}><Stop size={16} />停止</button><button disabled={!available} onClick={() => { resetPose(); setDriveResetToken(value => value + 1) }}><ArrowCounterClockwise size={16} />停止并复位</button></div></section>
        <div className="motion-explainer">{tab === 'expression' ? <><h3>让同一类动作，形成不同的回应</h3><p>选择语句与情境，预览规则生成的动作；加入编排后，可逐步调整姿态与时序。示例映射在本机运行。</p></> : <><h3>从姿态，到一段动作</h3><ol><li>调节左侧关节，在“动作编排”中添加当前姿态。</li><li>设置过渡和停留时间，或添加内置动作，调整步骤顺序。</li><li>拖动时间轴预览，点击“从头播放”检查完整回应。</li></ol><p>操作作用于虚拟模型；角度与运动范围待实机校准。编排保留在当前页面。</p></>}</div>
      </div>
    </div>
  </section>
}
