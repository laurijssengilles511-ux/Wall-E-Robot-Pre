import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'

const folder = 'public/portfolio/virtual'
const report = JSON.parse(await readFile(`${folder}/assembly-record.json`, 'utf8'))
const catalog = JSON.parse(await readFile('src/content/catalog.json', 'utf8'))

test('the display assembly records all original parts and the eight inferred kinds separately', async () => {
  assert.deepEqual(report.sources.map(x => x.id).sort(), catalog.models.map(x => x.id).sort())
  assert.equal(report.missingParts.length, 8)
  assert.ok(report.missingParts.every(x => !catalog.models.some(m => m.id === x.id)))
  assert.equal(report.sources.find(x => x.id === 'tread-plate').instances, 70)
  assert.equal(report.sources.find(x => x.id === 'tread-pin').instances, 140)
  for (const original of report.sources) {
    const model = catalog.models.find(x => x.id === original.id)
    const bytes = await readFile(path.join('public', model.path))
    assert.equal(createHash('sha256').update(bytes).digest('hex'), original.sha256)
  }
})

test('the exported GLB is self-contained and has only finite transforms', async () => {
  const bytes = await readFile(`${folder}/walle-assembled.glb`)
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF')
  assert.equal(bytes.readUInt32LE(4), 2)
  assert.equal(bytes.readUInt32LE(8), bytes.length)
  const json = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)).trim())
  assert.ok(json.meshes.length > 40)
  assert.ok(json.images.length >= 4)
  assert.ok(json.buffers.every(buffer => !buffer.uri))
  assert.ok(json.images.every(image => image.bufferView !== undefined && !image.uri))
  for (const node of json.nodes) {
    for (const key of ['translation', 'rotation', 'scale', 'matrix']) if (node[key]) assert.ok(node[key].every(Number.isFinite))
  }
})

test('all review views and the editable Blender source are delivered', async () => {
  for (const view of ['poster', 'front', 'side', 'back']) {
    const bytes = await readFile(`${folder}/${view}.png`)
    assert.equal(bytes.subarray(1, 4).toString(), 'PNG')
    assert.ok(bytes.length > 10000)
  }
  assert.ok((await stat('models/virtual/walle-assembled.blend')).size > 10000)
})
