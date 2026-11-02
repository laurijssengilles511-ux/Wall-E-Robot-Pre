import test from 'node:test'
import assert from 'node:assert/strict'
import { buildClip, DEFAULT_OPTIONS, JOINTS, neutralPose, sampleClip } from '../src/content/robot-motion.ts'
import { compileTimeline, duplicateStep, durationMs, moveStep } from '../src/content/robot-timeline.ts'

const poseStep = (id, headYaw, transitionMs = 1000, holdMs = 500) => ({ id, kind: 'pose', name: id, pose: { ...neutralPose(), headYaw }, transitionMs, holdMs })

test('timeline transitions and holds are exact and retain the final custom pose', () => {
  const steps = [poseStep('a', 20), poseStep('b', -20, 500, 0)]
  const timeline = compileTimeline(steps)
  assert.equal(timeline.clip.duration, 2000)
  assert.deepEqual(timeline.segments, [{ id: 'a', start: 0, end: 1500, previewTime: 1000 }, { id: 'b', start: 1500, end: 2000, previewTime: 2000 }])
  assert.equal(sampleClip(timeline.clip, 500).headYaw, 10)
  assert.equal(sampleClip(timeline.clip, 1000).headYaw, 20)
  assert.equal(sampleClip(timeline.clip, 1300).headYaw, 20)
  assert.equal(sampleClip(timeline.clip, 1500).headYaw, 20)
  assert.equal(sampleClip(timeline.clip, 1750).headYaw, 0)
  assert.equal(sampleClip(timeline.clip, 2000).headYaw, -20)
})

test('preset steps join poses continuously and capture independent motion settings', () => {
  const preset = { id: 'p', kind: 'preset', name: 'wave', presetId: 'wave', options: { ...DEFAULT_OPTIONS, speed: 2, repeat: 2, direction: 'left' } }
  const steps = [poseStep('a', 25, 500, 0), preset, poseStep('b', -12, 300, 200)]
  const built = compileTimeline(steps)
  const expected = buildClip('wave', steps[0].pose, preset.options)
  assert.equal(built.clip.duration, 500 + expected.duration + 500)
  assert.equal(sampleClip(built.clip, 500).headYaw, 25)
  assert.equal(sampleClip(built.clip, 500 + expected.duration).headYaw, 0)
  assert.equal(sampleClip(built.clip, built.clip.duration).headYaw, -12)
  assert.ok(built.clip.frames.some(frame => frame.pose.leftArm > 0))
  assert.ok(built.clip.frames.every(frame => frame.pose.rightArm === 0))
  for (let i = 1; i < built.clip.frames.length; i++) assert.ok(built.clip.frames[i].time > built.clip.frames[i - 1].time)
})

test('empty timelines, duration limits and joint limits remain finite', () => {
  assert.deepEqual(compileTimeline([]), { clip: { frames: [{ time: 0, pose: neutralPose() }], duration: 0 }, segments: [] })
  assert.equal(durationMs(-20, 100), 100)
  assert.equal(durationMs(Infinity, 100), 100)
  assert.equal(durationMs(999999), 10000)
  const built = compileTimeline([poseStep('bad', 999, -20, NaN)])
  assert.equal(built.clip.duration, 100)
  const pose = sampleClip(built.clip, 100)
  for (const joint of JOINTS) assert.ok(Number.isFinite(pose[joint.id]) && pose[joint.id] >= joint.min && pose[joint.id] <= joint.max)
})

test('duplicating and reordering steps do not mutate the source sequence', () => {
  const original = poseStep('a', 20), copy = duplicateStep(original, 'copy')
  copy.pose.headYaw = -20
  assert.equal(original.pose.headYaw, 20)
  const preset = { id: 'p', kind: 'preset', name: 'look', presetId: 'look', options: { ...DEFAULT_OPTIONS } }
  const presetCopy = duplicateStep(preset, 'p-copy'); presetCopy.options.repeat = 5
  assert.equal(preset.options.repeat, 1)
  const steps = [original, preset, copy]
  assert.deepEqual(moveStep(steps, 'copy', 0).map(step => step.id), ['copy', 'a', 'p'])
  assert.deepEqual(steps.map(step => step.id), ['a', 'p', 'copy'])
  assert.equal(moveStep(steps, 'missing', 0), steps)
  assert.equal(moveStep(steps, 'a', -1), steps)
})
