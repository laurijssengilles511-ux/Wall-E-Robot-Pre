import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'

const root = process.cwd()
const { models, documents } = JSON.parse(await readFile('src/content/catalog.json', 'utf8'))
const inventory = JSON.parse(await readFile('src/content/model-inventory.json', 'utf8'))
const manifest = JSON.parse(await readFile('public/portfolio/source-manifest.json', 'utf8'))
const digest = bytes => createHash('sha256').update(bytes).digest('hex')

test('the inventory contains 52 unique real STL files in six groups', () => {
  assert.equal(models.length, 52)
  assert.equal(new Set(models.map(model => model.id)).size, 52)
  assert.equal(new Set(models.map(model => model.category)).size, 6)
  assert.equal(models.reduce((sum, model) => sum + model.plannedQuantity, 0), 302)
  for (const model of models) { assert.ok(model.triangles > 0); assert.ok(model.dimensions.every(Number.isFinite)); assert.equal(model.source, '以电影中的瓦力形象为原型进行建模与设计') }
})

test('the complete index matches all three print lists and every available STL', async () => {
  assert.equal(inventory.length, 60)
  assert.equal(new Set(inventory.map(item => item.id)).size, 60)
  assert.equal(inventory.reduce((sum, item) => sum + item.quantity, 0), 310)
  const groups = ['01_大型结构件', '02_中型结构件', '03_小型精细件']
  for (const group of groups) {
    const list = await readFile(`public/portfolio/documents/瓦力机器人建模文件/${group}/本组打印数量.txt`, 'utf8')
    const expected = [...list.replace(/^\uFEFF/, '').matchAll(/^(.+\.STL)：(\d+)件$/gm)].map(([, filename, quantity]) => [filename, Number(quantity)])
    assert.deepEqual(inventory.filter(item => item.printGroup === group).map(item => [item.filename, item.quantity]), expected)
  }
  for (const model of models) {
    const item = inventory.find(item => item.id === model.id)
    assert.ok(item, model.id)
    assert.equal(item.quantity, model.plannedQuantity, model.id)
    assert.equal(item.category, model.category, model.id)
  }
  const indexedOnly = inventory.filter(item => !models.some(model => model.id === item.id))
  assert.equal(indexedOnly.length, 8)
  assert.ok(indexedOnly.every(item => item.printGroup === groups[0]))
})

test('every downloadable STL is byte-identical to its original manifest entry', async () => {
  for (const model of models) {
    const originalName = '瓦力机器人建模文件/' + model.path.replace('portfolio/models/', '')
    const original = manifest.find(entry => entry.file === originalName)
    assert.ok(original, originalName)
    const bytes = await readFile(path.join(root, 'public', model.path))
    assert.equal(bytes.length, model.bytes)
    assert.equal(digest(bytes), original.sha256, model.filename)
  }
})

test('all 52 previews are local PNG images', async () => {
  for (const model of models) {
    const data = await readFile(path.join('public', model.preview))
    assert.equal(data.subarray(1,4).toString(), 'PNG')
    assert.ok(data.length > 2000, model.id)
  }
})

test('all nine source documents preserve their original bytes', async () => {
  assert.equal(documents.length, 9)
  for (const document of documents) {
    const originalName = document.path.replace('portfolio/documents/', '')
    const original = manifest.find(entry => entry.file === originalName)
    const bytes = await readFile(path.join('public', document.path))
    assert.ok(original, document.name)
    assert.equal(digest(bytes), original.sha256, document.name)
  }
})

test('published concept, circuit, and reference figures exist locally', async () => {
  for (const filename of ['concept-sheet.png','concept-blueprint.png','circuit.png','model-list.png','print-assignments.png','reference/瓦力机器人设计方案-image2.jpeg','reference/瓦力机器人设计方案-image4.jpeg']) assert.ok((await stat(path.join('public/portfolio', filename))).size > 0)
})
