import { useState } from 'react'
import { ArrowCounterClockwise, ArrowRight, Check, Pause, Play, Stop } from '@phosphor-icons/react'
import { interactionScenes, interactionStates } from '../content/robot-interaction'
import type { InteractionState } from '../content/robot-interaction'

export default function InteractionDemo() {
  const [sceneId, setSceneId] = useState('knowledge')
  const [state, setState] = useState<InteractionState>('IDLE')
  const scene = interactionScenes.find(item => item.id === sceneId)!
  const current = interactionStates[state]
  const terminal = state === 'SUCCEEDED' || state === 'CANCELED'
  const active = state !== 'IDLE' && !terminal
  const position = scene.steps.indexOf(state === 'PAUSED' ? 'EXECUTING' : state)
  const detail = state === 'LISTENING' ? scene.input : state === 'PLANNING' ? scene.planning : state === 'EXECUTING' ? scene.execution : current.detail

  function advance() {
    if (state === 'IDLE') setState(scene.steps[0])
    else if (state === 'PAUSED') setState('EXECUTING')
    else if (active) setState(scene.steps[position + 1])
  }

  return <div className="interaction-demo" role="region" aria-label="交互流程演示">
    <div className="interaction-demo-top"><span>场景演示</span></div>
    <div className="interaction-scene-picker" role="group" aria-label="选择交互场景">
      {interactionScenes.map((item, index) => <button key={item.id} aria-pressed={sceneId === item.id} onClick={() => { setSceneId(item.id); setState('IDLE') }}><span className="interaction-scene-number">0{index + 1}</span><span><strong>{item.title}</strong><small>{item.subtitle}</small></span><ArrowRight size={17} aria-hidden="true" /></button>)}
    </div>
    <div className="interaction-demo-body">
      <div className="interaction-demo-input"><span className="small-heading">试着问瓦力</span><p>「{scene.question}」</p><ol className="interaction-step-list" aria-label="任务处理步骤">
        {scene.steps.map((step, index) => <li key={step} className={index < position || state === 'SUCCEEDED' ? 'is-complete' : ''} aria-current={index === position ? 'step' : undefined}><span>{index < position || state === 'SUCCEEDED' ? <Check size={12} aria-hidden="true" /> : String(index + 1).padStart(2, '0')}</span>{interactionStates[step].label}</li>)}
      </ol></div>
      <div className="interaction-demo-response">
        <div className="interaction-status" role="status" aria-live="polite" aria-atomic="true"><span className={`interaction-status-mark ${state === 'SUCCEEDED' ? 'is-success' : ''}`} aria-hidden="true" /><strong>{current.label}</strong><code>{state}</code></div>
        <div className="interaction-response-content" aria-live="polite" aria-atomic="true">
          {state === 'SUCCEEDED' ? <><span className="small-heading">{scene.resultTitle}</span><p className="interaction-result">{scene.result}</p>{scene.source && <details className="interaction-citation"><summary>查看资料来源 · {scene.source.file}</summary><blockquote>{scene.source.excerpt}</blockquote></details>}</> : <><h3>{state === 'IDLE' ? '从问题到回应' : current.label}</h3><p>{detail}</p></>}
        </div>
        <div className="interaction-behavior"><span>对应动作预设</span><code>{current.behavior}</code><span>{state === 'IDLE' ? '等待任务' : '由固件执行预设动作'}</span></div>
        <div className="interaction-demo-controls">
          {!terminal && <button className="interaction-primary" onClick={advance}>{state === 'IDLE' || state === 'PAUSED' ? <Play size={15} aria-hidden="true" /> : <ArrowRight size={15} aria-hidden="true" />}{state === 'IDLE' ? '开始演示' : state === 'PAUSED' ? '继续演示' : state === 'WAITING_USER' ? '确认本次观察' : '下一步'}</button>}
          {state === 'EXECUTING' && <button onClick={() => setState('PAUSED')}><Pause size={15} aria-hidden="true" />暂停演示</button>}
          {active && <button onClick={() => setState('CANCELED')}><Stop size={15} aria-hidden="true" />取消演示</button>}
          {state !== 'IDLE' && <button onClick={() => setState('IDLE')} aria-label="重置流程演示"><ArrowCounterClockwise size={15} aria-hidden="true" />重置</button>}
        </div>
      </div>
    </div>
  </div>
}
