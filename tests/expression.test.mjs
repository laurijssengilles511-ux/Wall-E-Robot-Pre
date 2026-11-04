import test from 'node:test'
import assert from 'node:assert/strict'
import { JOINTS, neutralPose, sampleClip } from '../src/content/robot-motion.ts'
import { compileTimeline } from '../src/content/robot-timeline.ts'
import { buildExpression, compileExpressionPreviews, EXPRESSION_CONTEXTS, EXPRESSION_EXAMPLES, expressionSteps, settingsForExample } from '../src/content/robot-expression.ts'

const example = id => EXPRESSION_EXAMPLES.find(item => item.id === id)
const build = (id, context = 'meeting', overrides = {}) => {
  const item = example(id)
  return buildExpression(item, { ...settingsForExample(item, context), ...overrides })
}

test('equivalent wording shares generation rules, while negation produces no movement', () => {
  for (const [a, b] of [['point-left', 'point-attention'], ['ack-know', 'ack-received'], ['greet-hello', 'greet-hi']]) {
    assert.deepEqual(build(a).clip, build(b).clip)
  }
  const negated = build('point-negated')
  assert.equal(negated.suppressed, true)
  assert.equal(negated.clip.duration, 0)
  assert.deepEqual(negated.phases, [])
  assert.deepEqual(expressionSteps(negated, '否定', () => 'unused'), [])
})

test('indication reaches and holds its heading independently of intensity, without scanning the opposite side', () => {
  for (const direction of ['left', 'right']) {
    const sign = direction === 'left' ? -1 : 1
    for (const intensity of [.25, 1]) {
      const plan = build('point-left', 'meeting', { direction, intensity })
      const target = plan.phases.find(phase => phase.name === '朝向目标')
      const arrival = plan.subjectStartMs + target.transitionMs
      assert.equal(sampleClip(plan.clip, arrival).headYaw, sign * 24)
      assert.equal(sampleClip(plan.clip, arrival + target.holdMs / 2).headYaw, sign * 24)
      assert.ok(plan.clip.frames.every(frame => sign * frame.pose.headYaw >= 0))
      assert.deepEqual(sampleClip(plan.clip, plan.clip.duration), neutralPose())
    }
  }
  assert.equal(settingsForExample(example('point-gentle'), 'meeting').intensity, .35)
})

test('subject delay is independent of tempo and begins after a timely light acknowledgement', () => {
  const normal = build('greet-hello', 'meeting', { delayMs: 1100 })
  const slow = build('greet-hello', 'meeting', { delayMs: 1100, tempo: .5 })
  const noDelay = build('greet-hello', 'meeting', { delayMs: 0 })
  assert.equal(normal.subjectStartMs, slow.subjectStartMs)
  assert.equal(normal.subjectStartMs - noDelay.subjectStartMs, 1100)
  assert.ok(slow.clip.duration > normal.clip.duration)
  assert.equal(sampleClip(normal.clip, 240).neckPitch, -2)
  assert.equal(sampleClip(normal.clip, 240).rightArm, 0)
  assert.deepEqual(sampleClip(normal.clip, normal.subjectStartMs - 1), neutralPose())
  const meeting = build('greet-hello')
  const low = build('greet-hello', 'low')
  assert.ok(Math.max(...meeting.clip.frames.map(frame => frame.pose.rightArm)) > Math.max(...low.clip.frames.map(frame => frame.pose.rightArm)))
  assert.ok(meeting.phases.length > low.phases.filter(phase => phase.name !== '主体等待').length)
})

test('timeline captures exact generated poses and timing as an independent editable snapshot', () => {
  const plan = build('greet-hello', 'low')
  let nextId = 0
  const steps = expressionSteps(plan, '招呼', () => String(++nextId))
  assert.equal(new Set(steps.map(step => step.id)).size, steps.length)
  assert.deepEqual(compileTimeline(steps).clip, plan.clip)
  const snapshot = structuredClone(steps)
  plan.settings.intensity = 1
  plan.phases[1].pose.neckPitch = -12
  assert.deepEqual(steps, snapshot)
  const prefix = { id: 'prefix', kind: 'pose', name: '前置姿态', pose: { ...neutralPose(), leftArm: 15 }, transitionMs: 500, holdMs: 200 }
  const joined = compileTimeline([prefix, ...steps])
  assert.equal(joined.clip.duration, 700 + plan.clip.duration)
  for (let time = 100; time <= plan.clip.duration; time += 101) assert.deepEqual(sampleClip(joined.clip, time + 700), sampleClip(plan.clip, time))
})

test('A/B playback inserts a neutral gap and keeps each version at its original speed', () => {
  const a = build('greet-hello'), b = build('greet-hello', 'quiet')
  const preview = compileExpressionPreviews([{ plan: a, label: 'A' }, { plan: b, label: 'B' }])
  const startB = a.clip.duration + 650
  assert.equal(preview.clip.duration, startB + b.clip.duration)
  assert.equal(preview.cues.find(cue => cue.label === 'B').start, startB)
  assert.deepEqual(sampleClip(preview.clip, a.clip.duration + 300), neutralPose())
  for (let time = 0; time < b.clip.duration; time += 137) assert.deepEqual(sampleClip(preview.clip, startB + time), sampleClip(b.clip, time))
  assert.equal(compileExpressionPreviews([{ plan: build('point-negated'), label: 'no' }]).clip.duration, 0)
})

test('all generated families and contexts stay finite, continuous in time and within virtual joint limits', () => {
  for (const item of EXPRESSION_EXAMPLES) for (const context of EXPRESSION_CONTEXTS) {
    const plan = buildExpression(item, settingsForExample(item, context.id))
    for (let index = 1; index < plan.clip.frames.length; index++) assert.ok(plan.clip.frames[index].time > plan.clip.frames[index - 1].time)
    for (let time = 0; time <= plan.clip.duration; time += 47) {
      const pose = sampleClip(plan.clip, time)
      for (const joint of JOINTS) assert.ok(Number.isFinite(pose[joint.id]) && pose[joint.id] >= joint.min && pose[joint.id] <= joint.max)
    }
  }
  const invalid = build('greet-hello', 'meeting', { intensity: NaN, delayMs: Infinity, tempo: -2 })
  assert.ok(Number.isFinite(invalid.clip.duration) && invalid.clip.duration > 0)
})
