export interface DriveCommand { left: number; right: number }
export interface DriveState { x: number; z: number; heading: number; leftVelocity: number; rightVelocity: number; leftDistance: number; rightDistance: number; boundary: boolean }
export interface DriveTelemetry { x: number; z: number; heading: number; leftVelocity: number; rightVelocity: number; boundary: boolean }
export interface TrackPath { version: number; pathMm: [number, number][]; totalMm: number; trackWidthM: number }
export const TRACK_WIDTH = .216
export const ARENA_LIMIT = 1.1
export const STOP_DRIVE: DriveCommand = { left: 0, right: 0 }
export const initialDrive = (): DriveState => ({ x: 0, z: 0, heading: 0, leftVelocity: 0, rightVelocity: 0, leftDistance: 0, rightDistance: 0, boundary: false })
export function normalizeCommand(input: DriveCommand): DriveCommand {
  return { left: Number.isFinite(input.left) ? Math.max(-1, Math.min(1, input.left)) : 0, right: Number.isFinite(input.right) ? Math.max(-1, Math.min(1, input.right)) : 0 }
}
export function keyboardCommand(keys: Set<string>): DriveCommand {
  const throttle = Number(keys.has('w')) - Number(keys.has('s')), turn = Number(keys.has('d')) - Number(keys.has('a'))
  const left = throttle + turn, right = throttle - turn, scale = Math.max(1, Math.abs(left), Math.abs(right))
  return { left: left / scale, right: right / scale }
}
export function advanceDrive(previous: DriveState, command: DriveCommand, speed: number, seconds: number, baseHeading = 0): DriveState {
  const input = normalizeCommand(command), dt = Number.isFinite(seconds) ? Math.max(0, Math.min(.05, seconds)) : 0
  const maximum = Number.isFinite(speed) ? Math.max(.05, Math.min(.25, speed)) : .12
  const approach = (from: number, to: number) => from + Math.sign(to - from) * Math.min(Math.abs(to - from), dt * .8)
  const left = input.left === 0 ? 0 : approach(previous.leftVelocity, input.left * maximum)
  const right = input.right === 0 ? 0 : approach(previous.rightVelocity, input.right * maximum)
  const velocity = (left + right) / 2, omega = (left - right) / TRACK_WIDTH
  const start = previous.heading + baseHeading, end = start + omega * dt
  const dx = Math.abs(omega) < 1e-9 ? velocity * dt * Math.sin(start) : velocity / omega * (Math.cos(start) - Math.cos(end))
  const dz = Math.abs(omega) < 1e-9 ? velocity * dt * Math.cos(start) : velocity / omega * (Math.sin(end) - Math.sin(start))
  const rawX = previous.x + dx, rawZ = previous.z + dz, boundary = Math.abs(rawX) > ARENA_LIMIT || Math.abs(rawZ) > ARENA_LIMIT
  return { x: Math.max(-ARENA_LIMIT, Math.min(ARENA_LIMIT, rawX)), z: Math.max(-ARENA_LIMIT, Math.min(ARENA_LIMIT, rawZ)), heading: Math.atan2(Math.sin(previous.heading + omega * dt), Math.cos(previous.heading + omega * dt)), leftVelocity: boundary ? 0 : left, rightVelocity: boundary ? 0 : right, leftDistance: previous.leftDistance + (boundary ? 0 : left * dt), rightDistance: previous.rightDistance + (boundary ? 0 : right * dt), boundary }
}
export function sampleTrack(path: TrackPath, millimetres: number): { y: number; z: number; angle: number } {
  let remaining = ((millimetres % path.totalMm) + path.totalMm) % path.totalMm
  for (let i = 0; i < path.pathMm.length; i++) {
    const a = path.pathMm[i], b = path.pathMm[(i + 1) % path.pathMm.length]
    const dy = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dy, dz)
    if (remaining <= length || i === path.pathMm.length - 1) return { y: a[0] + dy * remaining / length, z: a[1] + dz * remaining / length, angle: Math.atan2(dz, dy) }
    remaining -= length
  }
  return { y: 0, z: 0, angle: 0 }
}
