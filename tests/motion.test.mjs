import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Object3D, Vector3 } from 'three'
import { buildClip, clampPose, DEFAULT_OPTIONS, JOINTS, mirrorPose, neutralPose, PRESETS, sampleClip } from '../src/content/robot-motion.ts'

test('joint limits sanitize input and mirroring twice restores the pose', () => {
  const input = { headYaw: 999, neckPitch: -999, leftArm: NaN, rightArm: 25, leftClaw: 15, rightClaw: 9, bodyYaw: 32, door: Infinity }
  const pose = clampPose(input)
  assert.equal(pose.headYaw, 30); assert.equal(pose.neckPitch, -12); assert.equal(pose.leftArm, 0); assert.equal(pose.door, 0)
  assert.deepEqual(mirrorPose(mirrorPose(pose)), pose)
})

test('all presets start at the current pose, stay within limits, and finish neutral', () => {
  const from = clampPose({ headYaw: 15, leftArm: -60, rightClaw: 18, door: 40 })
  for (const preset of PRESETS) {
    for (const direction of ['left', 'right']) {
      const clip = buildClip(preset.id, from, { ...DEFAULT_OPTIONS, amplitude: 1, repeat: 3, direction })
      assert.deepEqual(sampleClip(clip, 0), from)
      assert.deepEqual(sampleClip(clip, clip.duration), neutralPose())
      assert.deepEqual(sampleClip(clip, clip.duration + 1000), neutralPose())
      for (let time = 0; time <= clip.duration; time += 29) {
        const pose = sampleClip(clip, time)
        for (const joint of JOINTS) assert.ok(Number.isFinite(pose[joint.id]) && pose[joint.id] >= joint.min && pose[joint.id] <= joint.max, `${preset.id}: ${joint.id}`)
      }
    }
  }
})

test('speed, repeats, amplitude and direction change the actual motion', () => {
  const build = options => buildClip('wave', neutralPose(), { ...DEFAULT_OPTIONS, ...options })
  const normal = build({ speed: 1 }), fast = build({ speed: 2 }), repeated = build({ repeat: 3 })
  assert.equal(fast.duration, normal.duration / 2)
  assert.ok(repeated.duration > normal.duration * 2)
  const left = build({ direction: 'left', amplitude: .5 }), right = build({ direction: 'right', amplitude: 1 })
  assert.equal(Math.max(...left.frames.map(f => f.pose.leftArm)), 16)
  assert.equal(Math.max(...left.frames.map(f => f.pose.rightArm)), 0)
  assert.equal(Math.max(...right.frames.map(f => f.pose.rightArm)), 32)
})

test('exported joints preserve metre-scale pivots and move descendants without moving the opposite arm', async () => {
  const buffer = await readFile('public/portfolio/virtual/walle-assembled.glb')
  const json = JSON.parse(buffer.toString('utf8', 20, 20 + buffer.readUInt32LE(12)).trim())
  const nodes = json.nodes.map(data => {
    const node = new Object3D(); node.name = data.name
    if (data.translation) node.position.fromArray(data.translation)
    if (data.rotation) node.quaternion.fromArray(data.rotation)
    if (data.scale) node.scale.fromArray(data.scale)
    return node
  })
  json.nodes.forEach((data, index) => { for (const child of data.children ?? []) nodes[index].add(nodes[child]) })
  const get = name => nodes.find(node => node.name === name)
  for (const joint of JOINTS) for (const target of joint.targets) assert.ok(get(target.node), target.node)
  assert.equal(get('joint_headYaw').parent, get('joint_neckPitch'))
  assert.equal(get('joint_leftClaw_outerL').parent, get('joint_leftArm'))
  const root = get('joint_bodyYaw'); root.updateMatrixWorld(true)
  const position = name => get(name).getWorldPosition(new Vector3())
  assert.ok(position('joint_headYaw').distanceTo(new Vector3(0, .344, .024)) < .00001)
  const shoulder = position('joint_leftArm'), handBefore = position('joint_leftClaw_outerL'), rightBefore = position('joint_rightClaw_outerL')
  get('joint_leftArm').rotation.x -= Math.PI / 6
  root.updateMatrixWorld(true)
  const handAfter = position('joint_leftClaw_outerL')
  assert.ok(handAfter.distanceTo(handBefore) > .02)
  assert.ok(Math.abs(handAfter.distanceTo(shoulder) - handBefore.distanceTo(shoulder)) < 1e-8)
  assert.ok(position('joint_rightClaw_outerL').distanceTo(rightBefore) < 1e-8)
  const headBefore = position('joint_headYaw')
  get('joint_neckPitch').rotation.x -= .1; root.updateMatrixWorld(true)
  assert.ok(position('joint_headYaw').distanceTo(headBefore) > .008)
  const door = get('joint_door'), descendants = new Set()
  door.traverse(node => descendants.add(nodes.indexOf(node)))
  assert.ok(json.nodes.some((node, i) => node.extras?.source_id === 'body-front-door' && descendants.has(i)))
  assert.ok(json.nodes.some((node, i) => node.name.includes('Graphic') && descendants.has(i)))
})
