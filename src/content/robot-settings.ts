import { JOINTS, clampPose, type JointId, type Pose } from './robot-motion.ts'

export interface JointCalibration { zero: number; reversed: boolean; min: number; max: number }
export type Calibration = Record<JointId, JointCalibration>
export interface Appearance { body: string; tracks: string; lens: string; grid: boolean }
export interface ViewerSettings { version: 1; calibration: Calibration; appearance: Appearance }
export const SETTINGS_KEY = 'walle.viewer-settings.v1'
export const DEFAULT_APPEARANCE: Appearance = { body: '#bb9235', tracks: '#4a5255', lens: '#1c3043', grid: false }
export function defaultCalibration(): Calibration {
  return Object.fromEntries(JOINTS.map(joint => [joint.id, { zero: 0, reversed: false, min: joint.min, max: joint.max }])) as Calibration
}
export function calibrationErrors(input: Calibration): string[] {
  return JOINTS.filter(joint => {
    const item = input?.[joint.id]
    return !item || ![item.zero, item.min, item.max].every(Number.isFinite) || Math.abs(item.zero) > 10
      || item.min < joint.min || item.max > joint.max || item.min > 0 || item.max < 0 || item.min >= item.max || typeof item.reversed !== 'boolean'
  }).map(joint => joint.label)
}
export function clampToCalibration(input: Partial<Pose>, calibration: Calibration): Pose {
  const pose = clampPose(input)
  for (const joint of JOINTS) pose[joint.id] = Math.max(calibration[joint.id].min, Math.min(calibration[joint.id].max, pose[joint.id]))
  return pose
}
export function calibratedPose(input: Pose, calibration: Calibration): Pose {
  const pose = clampToCalibration(input, calibration)
  return clampPose(Object.fromEntries(JOINTS.map(joint => {
    const item = calibration[joint.id], angle = item.reversed ? item.min + item.max - pose[joint.id] : pose[joint.id]
    return [joint.id, Math.max(item.min, Math.min(item.max, angle + item.zero))]
  })))
}
export function defaultSettings(): ViewerSettings { return { version: 1, calibration: defaultCalibration(), appearance: { ...DEFAULT_APPEARANCE } } }
export function parseSettings(value: unknown): ViewerSettings {
  const defaults = defaultSettings()
  if (!value || typeof value !== 'object' || (value as ViewerSettings).version !== 1) return defaults
  const candidate = value as ViewerSettings
  if (candidate.calibration && calibrationErrors(candidate.calibration).length === 0) defaults.calibration = Object.fromEntries(JOINTS.map(joint => [joint.id, { ...candidate.calibration[joint.id] }])) as Calibration
  for (const key of ['body', 'tracks', 'lens'] as const) if (/^#[0-9a-f]{6}$/i.test(candidate.appearance?.[key] ?? '')) defaults.appearance[key] = candidate.appearance[key]
  if (typeof candidate.appearance?.grid === 'boolean') defaults.appearance.grid = candidate.appearance.grid
  return defaults
}
export function loadSettings(): ViewerSettings {
  try { return parseSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null')) } catch { return defaultSettings() }
}
