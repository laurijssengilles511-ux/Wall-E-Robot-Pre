import rig from './robot-rig.json' with { type: 'json' }

export type JointId = 'headYaw' | 'neckPitch' | 'leftArm' | 'rightArm' | 'leftClaw' | 'rightClaw' | 'door' | 'bodyYaw'
export type Pose = Record<JointId, number>
export interface Joint { id: JointId; label: string; min: number; max: number; hint: string; targets: { node: string; axis: 'x' | 'y' | 'z'; factor: number }[] }
export const JOINTS = rig.joints as Joint[]
export const neutralPose = (): Pose => Object.fromEntries(JOINTS.map(joint => [joint.id, 0])) as Pose
export function clampPose(input: Partial<Pose>): Pose {
  return Object.fromEntries(JOINTS.map(joint => {
    const value = input[joint.id] ?? 0
    return [joint.id, Number.isFinite(value) ? Math.max(joint.min, Math.min(joint.max, value)) : 0]
  })) as Pose
}
export function mirrorPose(pose: Pose): Pose {
  return clampPose({ ...pose, headYaw: -pose.headYaw, bodyYaw: -pose.bodyYaw, leftArm: pose.rightArm, rightArm: pose.leftArm, leftClaw: pose.rightClaw, rightClaw: pose.leftClaw })
}
export const PRESETS = [
  { id: 'look', title: '环顾四周', detail: '转头观察，回到正视', icon: 'eye' },
  { id: 'nod', title: '点头回应', detail: '轻轻低头，再抬头', icon: 'nod' },
  { id: 'wave', title: '挥手招呼', detail: '抬起单臂，摆动回应', icon: 'wave' },
  { id: 'grip', title: '夹爪开合', detail: '双侧夹爪同步张合', icon: 'grip' },
  { id: 'door', title: '舱门展示', detail: '展开前舱门，再关闭', icon: 'door' },
  { id: 'turn', title: '转身观察', detail: '原地转向，回到朝前', icon: 'turn' },
  { id: 'show', title: '伸臂展示', detail: '双臂抬起，张开夹爪', icon: 'show' },
  { id: 'reset', title: '恢复初始', detail: '平滑回到初始姿态', icon: 'reset' },
] as const
export type PresetId = typeof PRESETS[number]['id']
export interface MotionOptions { speed: number; repeat: number; amplitude: number; direction: 'left' | 'right' }
export const DEFAULT_OPTIONS: MotionOptions = { speed: 1, repeat: 1, amplitude: .8, direction: 'right' }
export interface Keyframe { time: number; pose: Pose }
export interface Clip { frames: Keyframe[]; duration: number }

export function buildClip(id: PresetId, from: Pose, options: MotionOptions): Clip {
  const speed = Number.isFinite(options.speed) ? Math.max(.5, Math.min(2, options.speed)) : 1
  const repeat = Number.isFinite(options.repeat) ? Math.max(1, Math.min(5, Math.round(options.repeat))) : 1
  const amplitude = Number.isFinite(options.amplitude) ? Math.max(.25, Math.min(1, options.amplitude)) : .8
  const sign = options.direction === 'left' ? -1 : 1
  const arm = options.direction === 'left' ? 'leftArm' : 'rightArm'
  const claw = options.direction === 'left' ? 'leftClaw' : 'rightClaw'
  const sequences: Record<PresetId, [number, Partial<Pose>][]> = {
    look: [[650, { headYaw: sign * 26, neckPitch: 2 }], [350, { headYaw: sign * 26, neckPitch: 2 }], [1000, { headYaw: -sign * 26, neckPitch: 2 }], [350, { headYaw: -sign * 26, neckPitch: 2 }], [650, {}]],
    nod: [[300, { neckPitch: 5 }], [450, { neckPitch: -10 }], [200, { neckPitch: -10 }], [450, { neckPitch: 6 }], [500, {}]],
    wave: [[600, { [arm]: 30, [claw]: 12, headYaw: sign * 8, neckPitch: 2 }], [400, { [arm]: 18, [claw]: 8, headYaw: sign * 8, neckPitch: 2 }], [400, { [arm]: 32, [claw]: 12, headYaw: sign * 8, neckPitch: 2 }], [400, { [arm]: 18, [claw]: 8, headYaw: sign * 8, neckPitch: 2 }], [400, { [arm]: 32, [claw]: 12, headYaw: sign * 8, neckPitch: 2 }], [700, {}]],
    grip: [[500, { leftClaw: 18, rightClaw: 18 }], [350, { leftClaw: 18, rightClaw: 18 }], [500, {}], [500, { leftClaw: 18, rightClaw: 18 }], [500, {}]],
    door: [[850, { door: 60, neckPitch: -5 }], [1000, { door: 60, neckPitch: -5 }], [850, {}]],
    turn: [[900, { bodyYaw: sign * 55, headYaw: -sign * 14 }], [700, { bodyYaw: sign * 55, headYaw: -sign * 14 }], [1000, {}]],
    show: [[700, { leftArm: 28, rightArm: 28, leftClaw: 16, rightClaw: 16, neckPitch: 7 }], [1000, { leftArm: 28, rightArm: 28, leftClaw: 16, rightClaw: 16, neckPitch: 7 }], [700, {}]],
    reset: [[300, {}]],
  }
  const frames: Keyframe[] = [{ time: 0, pose: clampPose(from) }, { time: 350 / speed, pose: neutralPose() }]
  let time = frames[1].time
  for (let cycle = 0; cycle < (id === 'reset' ? 1 : repeat); cycle++) {
    for (const [duration, target] of sequences[id]) {
      time += duration / speed
      const pose = neutralPose()
      for (const joint of JOINTS) pose[joint.id] = (target[joint.id] ?? 0) * amplitude
      frames.push({ time, pose: clampPose(pose) })
    }
  }
  return { frames, duration: time }
}

export function sampleClip(clip: Clip, elapsed: number): Pose {
  if (elapsed <= 0) return { ...clip.frames[0].pose }
  const index = clip.frames.findIndex(frame => frame.time >= elapsed)
  if (index < 0) return { ...clip.frames.at(-1)!.pose }
  const before = clip.frames[Math.max(0, index - 1)], after = clip.frames[index]
  const fraction = Math.min(1, Math.max(0, (elapsed - before.time) / Math.max(1, after.time - before.time)))
  const eased = fraction * fraction * (3 - 2 * fraction)
  return clampPose(Object.fromEntries(JOINTS.map(joint => [joint.id, before.pose[joint.id] + (after.pose[joint.id] - before.pose[joint.id]) * eased])))
}
