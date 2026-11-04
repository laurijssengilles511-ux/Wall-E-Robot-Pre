import { clampPose, neutralPose, type Clip, type Pose } from './robot-motion.ts'
import { compileTimeline, type PoseStep } from './robot-timeline.ts'

export type ExpressionFamily = 'point' | 'acknowledge' | 'greet'
export type ExpressionDirection = 'left' | 'front' | 'right'
export interface ExpressionSettings { direction: ExpressionDirection; intensity: number; delayMs: number; tempo: number }
export interface ExpressionExample {
  id: string; text: string; family: ExpressionFamily; direction: ExpressionDirection
  gentle?: boolean; negated?: boolean; requirement: string
}
export const EXPRESSION_FAMILIES = {
  point: { title: '指示类', feature: '朝向目标并停留，方向保持明确。' },
  acknowledge: { title: '应答类', feature: '简短点头，传达已经听见。' },
  greet: { title: '问候类', feature: '朝向用户、抬臂招呼，保留问候轮廓。' },
} satisfies Record<ExpressionFamily, { title: string; feature: string }>

export const EXPRESSION_EXAMPLES: ExpressionExample[] = [
  { id: 'point-left', text: '看一下左边', family: 'point', direction: 'left', requirement: '朝向左侧' },
  { id: 'point-attention', text: '注意左侧', family: 'point', direction: 'left', requirement: '朝向左侧' },
  { id: 'point-gentle', text: '轻轻向右看一下', family: 'point', direction: 'right', gentle: true, requirement: '朝向右侧 · 轻幅表达' },
  { id: 'point-negated', text: '别向左看', family: 'point', direction: 'left', negated: true, requirement: '否定左看 · 本句不生成动作' },
  { id: 'ack-know', text: '我知道了', family: 'acknowledge', direction: 'front', requirement: '简短应答' },
  { id: 'ack-received', text: '收到', family: 'acknowledge', direction: 'front', requirement: '简短应答' },
  { id: 'greet-hello', text: '和我打个招呼', family: 'greet', direction: 'front', requirement: '朝向用户 · 抬臂招呼' },
  { id: 'greet-hi', text: '你好呀', family: 'greet', direction: 'front', requirement: '朝向用户 · 抬臂招呼' },
]

export const EXPRESSION_CONTEXTS = [
  { id: 'meeting', title: '初次见面', intensity: .9, delayMs: 0, tempo: 1, detail: '舒展抬臂，较完整地招呼。' },
  { id: 'quiet', title: '安静陪伴', intensity: .45, delayMs: 300, tempo: .8, detail: '轻幅抬臂，减少重复，放缓节奏。' },
  { id: 'low', title: '低落情境', intensity: .35, delayMs: 1100, tempo: .65, detail: '先轻微确认，再缓慢展开较轻的主体动作。' },
] as const
export type ExpressionContextId = typeof EXPRESSION_CONTEXTS[number]['id']
export interface ExpressionSelection { exampleId: string; contextId: ExpressionContextId; settings: ExpressionSettings }
export interface ExpressionPhase { name: string; pose: Pose; transitionMs: number; holdMs: number }
export interface ExpressionPlan {
  family: ExpressionFamily; settings: ExpressionSettings; suppressed: boolean
  phases: ExpressionPhase[]; clip: Clip; subjectStartMs: number
}
export interface ExpressionPreview { plan: ExpressionPlan; label: string }

export function settingsForExample(example: ExpressionExample, contextId: ExpressionContextId): ExpressionSettings {
  const context = EXPRESSION_CONTEXTS.find(item => item.id === contextId) ?? EXPRESSION_CONTEXTS[0]
  return { direction: example.direction, intensity: example.gentle ? .35 : context.intensity, delayMs: context.delayMs, tempo: context.tempo }
}
export function initialExpressionSelection(): ExpressionSelection {
  const example = EXPRESSION_EXAMPLES.find(item => item.id === 'greet-hello')!
  return { exampleId: example.id, contextId: 'meeting', settings: settingsForExample(example, 'meeting') }
}
function bounded(value: number, min: number, max: number, fallback: number) {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback
}

// Fixed example mappings and local generation rules; no language model or hardware calls.
export function buildExpression(example: ExpressionExample, input: ExpressionSettings): ExpressionPlan {
  const settings: ExpressionSettings = {
    direction: ['left', 'front', 'right'].includes(input.direction) ? input.direction : example.direction,
    intensity: bounded(input.intensity, .25, 1, .7),
    delayMs: Math.round(bounded(input.delayMs, 0, 1600, 0)),
    tempo: bounded(input.tempo, .5, 1.5, 1),
  }
  if (settings.delayMs > 0) settings.delayMs = Math.max(100, settings.delayMs)
  const phases: ExpressionPhase[] = []
  const add = (name: string, pose: Partial<Pose>, transitionMs: number, holdMs = 0) => {
    phases.push({ name, pose: clampPose(pose), transitionMs: Math.max(100, Math.round(transitionMs)), holdMs: Math.max(0, Math.round(holdMs)) })
  }
  let subjectStartMs = 0
  if (!example.negated) {
    add('初始姿态', {}, 100)
    add('轻微确认', { neckPitch: -2 }, 140, 60)
    add('确认回正', {}, 140)
    if (settings.delayMs) add('主体等待', {}, 100, settings.delayMs - 100)
    subjectStartMs = phases.reduce((total, phase) => total + phase.transitionMs + phase.holdMs, 0)
    const { intensity, tempo, direction } = settings
    const sign = direction === 'left' ? -1 : direction === 'right' ? 1 : 0
    if (example.family === 'point') {
      const arm = direction === 'left' ? 'leftArm' : 'rightArm'
      // Heading is independent of expression intensity: a light indication still reaches its target.
      add('朝向目标', { headYaw: sign * 24, neckPitch: 2 * intensity, [arm]: sign ? 10 + 12 * intensity : 0 }, 650 / tempo, 650 / tempo)
    } else if (example.family === 'acknowledge') {
      add('点头应答', { headYaw: sign * 18, neckPitch: -(5 + 5 * intensity) }, 420 / tempo, 160 / tempo)
      add('抬头回应', { headYaw: sign * 18, neckPitch: 4 * intensity }, 350 / tempo)
    } else {
      const arm = direction === 'left' ? 'leftArm' : 'rightArm'
      const claw = direction === 'left' ? 'leftClaw' : 'rightClaw'
      const greeting = { headYaw: sign * 18, neckPitch: 2 * intensity, [claw]: 4 + 6 * intensity }
      add('抬臂招呼', { ...greeting, [arm]: 16 + 16 * intensity }, 600 / tempo, 150 / tempo)
      for (let cycle = 0; cycle < (intensity >= .7 ? 2 : 1); cycle++) {
        add('轻摆手臂', { ...greeting, [arm]: 10 + 8 * intensity }, 350 / tempo)
        add('抬臂回应', { ...greeting, [arm]: 16 + 16 * intensity }, 350 / tempo)
      }
    }
    add('回应收束', {}, 550 / settings.tempo)
  }
  const steps = phases.map((phase, index): PoseStep => ({ ...phase, id: String(index), kind: 'pose' }))
  return { family: example.family, settings, suppressed: Boolean(example.negated), phases, clip: compileTimeline(steps).clip, subjectStartMs }
}

// Expand the exact generated phases into editable poses; later setting changes cannot alter this snapshot.
export function expressionSteps(plan: ExpressionPlan, label: string, nextId: () => string): PoseStep[] {
  return plan.phases.map(phase => ({ ...phase, pose: { ...phase.pose }, id: nextId(), kind: 'pose', name: `${label} · ${phase.name}` }))
}

export function compileExpressionPreviews(previews: ExpressionPreview[]) {
  const frames = [{ time: 0, pose: neutralPose() }]
  const cues: { start: number; label: string }[] = []
  let time = 0
  for (const preview of previews) {
    if (preview.plan.suppressed || !preview.plan.clip.duration) continue
    if (cues.length) {
      cues.push({ start: time, label: '对比间隔 · 下一版即将开始' })
      time += 650
      frames.push({ time, pose: neutralPose() })
    }
    cues.push({ start: time, label: preview.label })
    for (const frame of preview.plan.clip.frames.slice(1)) frames.push({ time: time + frame.time, pose: { ...frame.pose } })
    time += preview.plan.clip.duration
  }
  return { clip: { frames, duration: time }, cues }
}
