import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { advanceDrive, ARENA_LIMIT, initialDrive, keyboardCommand, sampleTrack, STOP_DRIVE } from '../src/content/robot-drive.ts'
import { calibratedPose, calibrationErrors, clampToCalibration, defaultCalibration, defaultSettings, parseSettings } from '../src/content/robot-settings.ts'
import { JOINTS, neutralPose } from '../src/content/robot-motion.ts'

const simulate = (command, count = 100, start = initialDrive(), base = 0) => { let state = start; for (let i = 0; i < count; i++) state = advanceDrive(state, command, .12, .01, base); return state }

test('differential drive moves straight, reverses, turns in place and follows arcs', () => {
  const forward = simulate({ left: 1, right: 1 })
  assert.ok(forward.z > .1 && forward.z < .13); assert.ok(Math.abs(forward.x) < 1e-8); assert.equal(forward.heading, 0)
  const backward = simulate({ left: -1, right: -1 }); assert.ok(backward.z < -.1)
  const turn = simulate({ left: 1, right: -1 }); assert.ok(turn.heading > .8); assert.ok(Math.hypot(turn.x, turn.z) < 1e-8)
  const curve = simulate({ left: .5, right: 1 }); assert.ok(curve.heading < 0 && curve.x < 0 && curve.z > 0)
  const east = simulate({ left: 1, right: 1 }, 100, initialDrive(), Math.PI / 2); assert.ok(east.x > .1 && Math.abs(east.z) < 1e-8)
})

test('release and boundary braking stop immediately and large time gaps do not teleport', () => {
  const moving = simulate({ left: 1, right: 1 })
  const stopped = advanceDrive(moving, STOP_DRIVE, .12, .05)
  assert.equal(stopped.z, moving.z); assert.equal(stopped.leftVelocity, 0); assert.equal(stopped.rightVelocity, 0)
  const edge = advanceDrive({ ...initialDrive(), z: ARENA_LIMIT - .001, leftVelocity: .25, rightVelocity: .25 }, { left: 1, right: 1 }, .25, .05)
  assert.equal(edge.z, ARENA_LIMIT); assert.equal(edge.boundary, true); assert.equal(edge.leftVelocity, 0)
  const escape = advanceDrive(edge, { left: 1, right: -1 }, .12, .05); assert.equal(escape.boundary, false); assert.equal(escape.z, ARENA_LIMIT)
  const delayed = advanceDrive(initialDrive(), { left: 1, right: 1 }, .25, 1000); assert.ok(delayed.z < .02)
})

test('keyboard combinations normalize differential commands', () => {
  assert.deepEqual(keyboardCommand(new Set(['w'])), { left: 1, right: 1 })
  assert.deepEqual(keyboardCommand(new Set(['w', 'a'])), { left: 0, right: 1 })
  assert.deepEqual(keyboardCommand(new Set(['a'])), { left: -1, right: 1 })
  assert.deepEqual(keyboardCommand(new Set(['w', 's'])), STOP_DRIVE)
})

test('all original track links have valid cyclic paths and match their rest transforms', async () => {
  const path = JSON.parse(await readFile('public/portfolio/virtual/drive-rig.json', 'utf8'))
  const bytes = await readFile('public/portfolio/virtual/walle-assembled.glb')
  const json = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)).trim())
  const links = json.nodes.filter(node => node.extras?.drive_kind === 'link')
  assert.equal(links.length, 210)
  assert.equal(links.filter(node => node.extras.source_id === 'tread-plate').length, 70)
  assert.equal(links.filter(node => node.extras.drive_side === 'left').length, 105)
  assert.ok(json.nodes.filter(node => node.extras?.drive_kind === 'wheel').length >= 20)
  let length = 0
  path.pathMm.forEach((point, index) => { const next = path.pathMm[(index + 1) % path.pathMm.length]; length += Math.hypot(point[0] - next[0], point[1] - next[1]) })
  assert.ok(Math.abs(length - path.totalMm) < 1e-7)
  for (const node of links) {
    const rest = sampleTrack(path, node.extras.drive_phase_mm), moved = sampleTrack(path, node.extras.drive_phase_mm + 20), cycled = sampleTrack(path, node.extras.drive_phase_mm + path.totalMm)
    assert.ok(Math.hypot(node.translation[1] - rest.z, node.translation[2] + rest.y) < .01)
    assert.ok(Math.hypot(moved.y - rest.y, moved.z - rest.z) > 10)
    assert.ok(Math.hypot(cycled.y - rest.y, cycled.z - rest.z) < 1e-7)
  }
})

test('calibration limits apply to commands and final mapped angles', () => {
  const profile = defaultCalibration(); profile.headYaw = { min: -20, max: 20, reversed: true, zero: 2 }
  assert.deepEqual(calibrationErrors(profile), [])
  assert.equal(clampToCalibration({ ...neutralPose(), headYaw: 30 }, profile).headYaw, 20)
  assert.equal(calibratedPose({ ...neutralPose(), headYaw: 10 }, profile).headYaw, -8)
  assert.equal(calibratedPose({ ...neutralPose(), headYaw: -30 }, profile).headYaw, 20)
  profile.leftClaw.reversed = true
  assert.equal(calibratedPose(neutralPose(), profile).leftClaw, 18)
  for (const joint of JOINTS) {
    const pose = calibratedPose(Object.fromEntries(JOINTS.map(item => [item.id, item.max])), profile)
    assert.ok(pose[joint.id] >= profile[joint.id].min && pose[joint.id] <= profile[joint.id].max)
  }
})

test('malformed, incompatible or invalid stored settings fall back without sharing defaults', () => {
  assert.deepEqual(parseSettings(null), defaultSettings())
  assert.deepEqual(parseSettings({ version: 9 }), defaultSettings())
  const bad = defaultSettings(); bad.calibration.headYaw.max = 999
  assert.ok(calibrationErrors(bad.calibration).includes('头部左右'))
  assert.deepEqual(parseSettings(bad).calibration, defaultCalibration())
  const saved = defaultSettings(); saved.calibration.headYaw.zero = 3; saved.appearance.body = '#123456'
  const loaded = parseSettings(JSON.parse(JSON.stringify(saved))); assert.equal(loaded.calibration.headYaw.zero, 3); assert.equal(loaded.appearance.body, '#123456')
  loaded.calibration.headYaw.zero = 8; assert.equal(saved.calibration.headYaw.zero, 3)
})
