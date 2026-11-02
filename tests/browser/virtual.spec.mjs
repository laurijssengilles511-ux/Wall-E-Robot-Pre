import { test, expect } from '@playwright/test'
import { createHash } from 'node:crypto'

const hash = buffer => createHash('sha256').update(buffer).digest('hex')
const ready = page => expect(page.locator('.robot-viewer')).toHaveAttribute('data-status', 'ready', { timeout: 45000 })

test('3D loads only in the virtual chapter, rotates, zooms, resets, and releases on navigation', async ({ page }) => {
  const errors = [], models = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', request => { if (request.url().endsWith('.glb')) models.push(request.url()) })
  await page.goto('/#/')
  await expect(page.locator('main h1')).toBeVisible()
  expect(models).toEqual([])
  const initialResources = await page.evaluate(() => performance.getEntriesByType('resource').map(entry => entry.name))
  expect(initialResources.some(name => /assets\/Virtual-/.test(name))).toBe(false)
  await page.getByRole('navigation').getByRole('link', { name: /虚拟平台/ }).click()
  await ready(page)
  const canvas = page.locator('.viewer-canvas canvas')
  await canvas.scrollIntoViewIfNeeded()
  await page.waitForTimeout(700)
  const initial = await canvas.screenshot()
  const bounds = await canvas.boundingBox()
  await page.mouse.move(bounds.x + bounds.width * .45, bounds.y + bounds.height * .5)
  await page.mouse.down()
  await page.mouse.move(bounds.x + bounds.width * .7, bounds.y + bounds.height * .55, { steps: 12 })
  await page.mouse.up()
  await page.waitForTimeout(1000)
  const rotated = await canvas.screenshot()
  expect(hash(rotated)).not.toBe(hash(initial))
  await page.mouse.wheel(0, -220)
  await page.waitForTimeout(800)
  expect(hash(await canvas.screenshot())).not.toBe(hash(rotated))
  await page.getByRole('button', { name: '视角复位' }).click()
  await page.waitForTimeout(1100)
  const restored = await canvas.screenshot({ path: 'artifacts/virtual-viewer.png' })
  const changedFraction = await page.evaluate(async ([a, b]) => {
    const images = await Promise.all([a, b].map(async data => {
      const image = new Image(); image.src = 'data:image/png;base64,' + data; await image.decode()
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height
      const context = canvas.getContext('2d'); context.drawImage(image, 0, 0)
      return context.getImageData(0, 0, image.width, image.height).data
    }))
    let changed = 0
    for (let i = 0; i < images[0].length; i += 4) if ([0, 1, 2].some(c => Math.abs(images[0][i + c] - images[1][i + c]) > 12)) changed++
    return changed / (images[0].length / 4)
  }, [initial.toString('base64'), restored.toString('base64')])
  expect(changedFraction).toBeLessThan(.01)
  await canvas.focus()
  await page.keyboard.press('ArrowLeft')
  await page.waitForTimeout(800)
  expect(hash(await canvas.screenshot())).not.toBe(hash(restored))
  await page.keyboard.press('Home')
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(canvas).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'artifacts/virtual-mobile.png', fullPage: true })
  await page.getByRole('navigation').getByRole('link', { name: /结构与制造/ }).click()
  await expect(page.locator('canvas')).toHaveCount(0)
  await page.getByRole('navigation').getByRole('link', { name: /虚拟平台/ }).click()
  await ready(page)
  await expect(canvas).toHaveCount(1)
  expect(errors).toEqual([])
})

test('missing model falls back to the local poster and keeps static reviews usable', async ({ page }) => {
  await page.route('**/walle-assembled.glb', route => route.fulfill({ status: 404, body: 'not found' }))
  await page.goto('/#/virtual')
  await expect(page.locator('.robot-viewer')).toHaveAttribute('data-status', 'failed')
  const poster = page.locator('.viewer-poster')
  await expect(poster).toBeVisible()
  expect(await poster.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true)
  await expect(page.getByRole('button', { name: '视角复位' })).toBeDisabled()
  await page.getByRole('button', { name: '放大查看：虚拟瓦力正面' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('unsupported WebGL falls back without an uncaught error', async ({ page }) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      if (/webgl/.test(type)) return null
      return original.call(this, type, ...args)
    }
  })
  await page.goto('/#/virtual')
  await expect(page.locator('.robot-viewer')).toHaveAttribute('data-status', 'failed')
  await expect(page.locator('.viewer-poster')).toBeVisible()
  expect(errors).toEqual([])
})

test('losing the WebGL context shows the static preview', async ({ page }) => {
  await page.goto('/#/virtual')
  await ready(page)
  await page.locator('canvas').evaluate(canvas => canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })))
  await expect(page.locator('.robot-viewer')).toHaveAttribute('data-status', 'failed')
  await expect(page.locator('.viewer-poster')).toBeVisible()
})
