import { useState } from 'react'
import { Play, Plus } from '@phosphor-icons/react'
import {
  buildExpression, EXPRESSION_CONTEXTS, EXPRESSION_EXAMPLES, EXPRESSION_FAMILIES, settingsForExample,
  type ExpressionContextId, type ExpressionDirection, type ExpressionFamily, type ExpressionPlan,
  type ExpressionPreview, type ExpressionSelection, type ExpressionSettings,
} from '../content/robot-expression'
import '../expression.css'

interface Props {
  selection: ExpressionSelection; available: boolean; busy: boolean
  onChange: (value: ExpressionSelection) => void; onStop: () => void
  onPreview: (previews: ExpressionPreview[]) => void; onAppend: (plan: ExpressionPlan, label: string) => void
}
const directions = { left: '左侧', front: '正前方', right: '右侧' }

export default function ExpressionLab({ selection, available, busy, onChange, onStop, onPreview, onAppend }: Props) {
  const [comparison, setComparison] = useState<'wording' | 'context'>('wording')
  const [comparisonContext, setComparisonContext] = useState<ExpressionContextId>('quiet')
  const example = EXPRESSION_EXAMPLES.find(item => item.id === selection.exampleId)!
  const family = EXPRESSION_FAMILIES[example.family]
  const plan = buildExpression(example, selection.settings)
  const defaults = settingsForExample(example, selection.contextId)
  const customized = (Object.keys(defaults) as (keyof ExpressionSettings)[]).some(key => defaults[key] !== selection.settings[key])
  const changeSetting = (patch: Partial<ExpressionSettings>) => onChange({ ...selection, settings: { ...selection.settings, ...patch } })
  const selectExample = (id: string) => {
    const next = EXPRESSION_EXAMPLES.find(item => item.id === id)!
    onChange({ ...selection, exampleId: id, settings: settingsForExample(next, selection.contextId) })
  }
  const selectContext = (contextId: ExpressionContextId) => onChange({ ...selection, contextId, settings: settingsForExample(example, contextId) })
  const contextExample = EXPRESSION_EXAMPLES.find(item => item.id === 'greet-hello')!
  const compareContext = EXPRESSION_CONTEXTS.find(item => item.id === comparisonContext)!
  const comparisonItems = comparison === 'wording'
    ? ['ack-know', 'ack-received'].map((id, index) => {
      const item = EXPRESSION_EXAMPLES.find(item => item.id === id)!
      return { title: item.text, detail: '应答类 · 相同规则与设置', plan: buildExpression(item, settingsForExample(item, 'meeting')), label: `对比 ${index === 0 ? 'A' : 'B'} · ${item.text}` }
    })
    : [EXPRESSION_CONTEXTS[0], compareContext].map((context, index) => ({
      title: context.title, detail: context.detail, plan: buildExpression(contextExample, settingsForExample(contextExample, context.id)), label: `对比 ${index === 0 ? 'A' : 'B'} · ${context.title}`,
    }))

  return <section className="expression-lab" aria-label="表达实验">
    <div className="action-section-heading"><span className="small-heading">从语义，到动作</span><h2>表达实验</h2><p>选择一句话，看看同类动作如何随情境变化。</p></div>

    <section className="expression-section">
      <div className="expression-section-title"><h3><span>01</span>选择语句</h3><small>示例语句 · 本地规则</small></div>
      <label className="expression-select-label" htmlFor="expression-example">试着对瓦力说</label>
      <select id="expression-example" value={example.id} onChange={event => selectExample(event.target.value)}>
        {(Object.keys(EXPRESSION_FAMILIES) as ExpressionFamily[]).map(key => <optgroup key={key} label={EXPRESSION_FAMILIES[key].title}>
          {EXPRESSION_EXAMPLES.filter(item => item.family === key).map(item => <option key={item.id} value={item.id}>{item.text}</option>)}
        </optgroup>)}
      </select>
      <div className="expression-mapping" aria-live="polite" data-family={example.family} data-suppressed={plan.suppressed}>
        <dl><div><dt>动作类别</dt><dd>{family.title}</dd></div><div><dt>语义要求</dt><dd>{example.requirement}</dd></div></dl>
        <p>{plan.suppressed ? '保留否定要求，本句不执行动作。' : family.feature}</p>
      </div>
    </section>

    <section className="expression-section">
      <div className="expression-section-title"><h3><span>02</span>调整表达</h3></div>
      <label className="expression-context-label">交流情境<select aria-label="交流情境" value={selection.contextId} onChange={event => selectContext(event.target.value as ExpressionContextId)}>
        {EXPRESSION_CONTEXTS.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
      </select></label>
      <fieldset className="expression-settings" disabled={!available || plan.suppressed}><legend className="sr-only">表达维度</legend>
        <label>朝向<select aria-label="表达朝向" value={selection.settings.direction} onChange={event => changeSetting({ direction: event.target.value as ExpressionDirection })}>
          {Object.entries(directions).map(([value, title]) => <option key={value} value={value}>{title}</option>)}
        </select></label>
        <label>表达强度 <output>{Math.round(selection.settings.intensity * 100)}%</output><input aria-label="表达强度" type="range" min=".25" max="1" step=".05" value={selection.settings.intensity} onChange={event => changeSetting({ intensity: Number(event.target.value) })} /></label>
        <label>主体等待 <output>{(selection.settings.delayMs / 1000).toFixed(1)} 秒</output><input aria-label="主体等待" type="range" min="0" max="1600" step="100" value={selection.settings.delayMs} onChange={event => changeSetting({ delayMs: Number(event.target.value) })} /></label>
        <label>动作节奏 <output>{selection.settings.tempo.toFixed(2)}×</output><input aria-label="动作节奏" type="range" min=".5" max="1.5" step=".05" value={selection.settings.tempo} onChange={event => changeSetting({ tempo: Number(event.target.value) })} /></label>
      </fieldset>
      <p className="expression-note">强度调整展开幅度；主体等待发生在轻微确认之后。方向以机器人自身为准。</p>
      {customized && <p className="expression-customized" role="status">已手动调整，预览按当前设置生成。</p>}
    </section>

    <section className="expression-section">
      <div className="expression-section-title"><h3><span>03</span>生成与预览</h3><small>{(plan.clip.duration / 1000).toFixed(2)} 秒</small></div>
      <p className="expression-rule">{plan.suppressed ? '否定要求 → 不生成动作' : `${family.title} → 轻微确认 → ${selection.settings.delayMs ? '等待 → ' : ''}主体表达 → 回正`}</p>
      <div className="expression-actions"><button className="expression-primary" disabled={!available || plan.suppressed} onClick={() => onPreview([{ plan, label: `表达 · ${example.text}` }])}><Play size={14} weight="fill" />预览表达</button><button disabled={!available || plan.suppressed || busy} onClick={() => onAppend(plan, example.text)}><Plus size={14} />加入编排</button></div>
    </section>

    <section className="expression-section expression-comparison" aria-label="表达对比">
      <div className="expression-section-title"><h3>表达对比</h3></div>
      <div className="expression-compare-modes" role="group" aria-label="对比方式">
        <button aria-pressed={comparison === 'wording'} onClick={() => { onStop(); setComparison('wording') }}>不同说法，同类动作</button>
        <button aria-pressed={comparison === 'context'} onClick={() => { onStop(); setComparison('context') }}>同一句话，不同情境</button>
      </div>
      {comparison === 'context' && <><p className="expression-compare-utterance">「{contextExample.text}」</p><label className="expression-context-label">B 版情境<select aria-label="B 版情境" value={comparisonContext} onChange={event => { onStop(); setComparisonContext(event.target.value as ExpressionContextId) }}>{EXPRESSION_CONTEXTS.slice(1).map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label></>}
      <div className="expression-compare-grid">{comparisonItems.map((item, index) => <article key={`${comparison}-${index}`}>
        <span className="expression-variant">{index === 0 ? 'A' : 'B'}</span><h4>{item.title}</h4><p>{item.detail}</p>
        {comparison === 'context' && <small>强度 {Math.round(item.plan.settings.intensity * 100)}% · 等待 {item.plan.settings.delayMs / 1000} 秒 · 节奏 {item.plan.settings.tempo}×</small>}
        <button disabled={!available} aria-label={`预览 ${index === 0 ? 'A' : 'B'}：${item.title}`} onClick={() => onPreview([item])}><Play size={12} weight="fill" />预览 {index === 0 ? 'A' : 'B'}</button>
      </article>)}</div>
      <div className="expression-actions"><button disabled={!available} onClick={() => onPreview(comparisonItems)}><Play size={14} />依次播放 A → B</button></div>
      <p className="expression-note">对比使用固定设置，每版从初始姿态开始。观察动作的主要意图是否清晰。</p>
    </section>
  </section>
}
