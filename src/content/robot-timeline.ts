import { buildClip, clampPose, neutralPose, type Clip, type MotionOptions, type Pose, type PresetId } from './robot-motion.ts'

export interface PoseStep { id: string; kind: 'pose'; name: string; pose: Pose; transitionMs: number; holdMs: number }
export interface PresetStep { id: string; kind: 'preset'; name: string; presetId: PresetId; options: MotionOptions }
export type TimelineStep = PoseStep | PresetStep
export interface TimelineSegment { id: string; start: number; end: number; previewTime: number }
export interface Timeline { clip: Clip; segments: TimelineSegment[] }

export function durationMs(value: number, minimum = 0): number {
  return Number.isFinite(value) ? Math.max(minimum, Math.min(10000, Math.round(value))) : minimum
}
export function compileTimeline(steps: TimelineStep[]): Timeline {
  const frames = [{ time: 0, pose: neutralPose() }], segments: TimelineSegment[] = []
  let time = 0, current = neutralPose()
  for (const step of steps) {
    const start = time
    let previewTime: number
    if (step.kind === 'pose') {
      time += durationMs(step.transitionMs, 100)
      current = clampPose(step.pose)
      frames.push({ time, pose: { ...current } })
      previewTime = time
      const hold = durationMs(step.holdMs)
      if (hold > 0) { time += hold; frames.push({ time, pose: { ...current } }) }
    } else {
      const clip = buildClip(step.presetId, current, step.options)
      for (const frame of clip.frames.slice(1)) frames.push({ time: start + frame.time, pose: { ...frame.pose } })
      time += clip.duration
      current = { ...clip.frames.at(-1)!.pose }
      previewTime = start + clip.duration / 2
    }
    segments.push({ id: step.id, start, end: time, previewTime })
  }
  return { clip: { frames, duration: time }, segments }
}
export function duplicateStep(step: TimelineStep, id: string): TimelineStep {
  return step.kind === 'pose'
    ? { ...step, id, name: `${step.name} 副本`.slice(0, 40), pose: { ...step.pose } }
    : { ...step, id, name: `${step.name} 副本`.slice(0, 40), options: { ...step.options } }
}
export function moveStep(steps: TimelineStep[], id: string, destination: number): TimelineStep[] {
  const source = steps.findIndex(step => step.id === id)
  if (source < 0 || destination < 0 || destination >= steps.length || source === destination) return steps
  const next = [...steps], [step] = next.splice(source, 1)
  next.splice(destination, 0, step)
  return next
}
export const formatTime = (ms: number) => `${(ms / 1000).toFixed(2)} s`
