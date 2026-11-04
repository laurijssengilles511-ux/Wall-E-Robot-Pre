import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'

const routes = [ ['/', '瓦力机器人'], ['/structure', '结构与制造'], ['/electronics', '电路与搭建'], ['/reflection', '困难与复盘'], ['/future', '未来构想'], ['/completion', '实体成果'], ['/virtual', '虚拟平台'] ]

test('all seven chapters are readable and contain no old player or runtime errors', async ({ page }) => {
  const errors = [], requests = []; page.on('pageerror', error => errors.push(error.message)); page.on('request', request => requests.push(request.url()))
  for (const [route, title] of routes) {
    await page.goto(`/#${route}`)
    await expect(page.getByRole('heading', { name: title, exact: true, level: 1 })).toBeVisible()
    await expect(page.getByRole('navigation', { name: '章节导航' }).locator('a[aria-current="page"]')).toHaveCount(1)
    await expect(page.locator('audio, video')).toHaveCount(0)
    if (route === '/virtual') {
      await expect(page.locator('.robot-viewer')).toHaveAttribute('data-status', 'ready')
      await expect(page.locator('canvas')).toHaveCount(1)
    } else await expect(page.locator('canvas')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /开始放映|播放设置/ })).toHaveCount(0)
  }
  expect(errors).toEqual([])
  expect(requests.filter(url => /World-|walle-demo/.test(url))).toEqual([])
  expect(requests.filter(url => /\.glb/.test(url)).every(url => url.endsWith('/portfolio/virtual/walle-assembled.glb'))).toBe(true)
})

test('navigation supports next chapter, direct refresh, browser history, and unknown routes', async ({ page }) => {
  await page.goto('/#/')
  await page.locator('.next-chapter').click()
  await expect(page).toHaveURL(/#\/structure$/)
  await page.reload()
  await expect(page.getByRole('heading', { name: '结构与制造', level: 1 })).toBeVisible()
  await page.locator('.next-chapter').click()
  await expect(page).toHaveURL(/#\/electronics$/)
  await page.goBack()
  await expect(page.getByRole('heading', { name: '结构与制造', level: 1 })).toBeVisible()
  await page.goForward()
  await expect(page.getByRole('heading', { name: '电路与搭建', level: 1 })).toBeVisible()
  await page.goto('/#/future')
  await page.locator('.next-chapter').click()
  await expect(page).toHaveURL(/#\/completion$/)
  await expect(page.locator('.pagination-position')).toHaveText('06 / 07')
  await expect(page.getByRole('heading', { name: '调整方案', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: '实体成果', level: 1 })).toBeVisible()
  await page.locator('.next-chapter').click()
  await expect(page).toHaveURL(/#\/virtual$/)
  await expect(page.locator('.pagination-position')).toHaveText('07 / 07')
  await page.locator('.previous-chapter').click()
  await expect(page).toHaveURL(/#\/completion$/)
  await page.goto('/#/unknown')
  await expect(page.getByRole('heading', { name: '瓦力机器人', level: 1 })).toBeVisible()
})

test('images open, zoom, download, and close with keyboard focus restored', async ({ page }) => {
  await page.goto('/#/electronics')
  const trigger = page.getByRole('button', { name: '放大查看：整体接线图', exact: true })
  await trigger.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect.poll(() => dialog.getByRole('img', { name: '整体接线图', exact: true }).evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true)
  await page.getByRole('button', { name: '放大图像', exact: true }).click()
  await expect(page.locator('.lightbox-stage')).toHaveClass(/is-zoomed/)
  await page.getByRole('button', { name: '适合窗口', exact: true }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('link', { name: '下载原图', exact: true }).click()
  expect((await downloadPromise).suggestedFilename()).toBe('circuit.png')
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(trigger).toBeFocused()
})

test('the complete parts directory expands categories and downloads exact STL bytes', async ({ page }) => {
  await page.goto('/#/structure')
  await expect(page.locator('.inventory-summary')).toContainText('完成打印')
  await expect(page.locator('#model-library .section-heading')).toContainText('60 类零件 · 52 份 STL 文件')
  for (const details of await page.locator('.model-library details').all()) if (!await details.getAttribute('open') && !(await details.evaluate(element => element.open))) await details.locator('summary').click()
  await expect(page.locator('.model-file')).toHaveCount(60)
  await expect(page.locator('.model-file a[download]')).toHaveCount(52)
  await expect(page.locator('.model-file').filter({ hasText: 'body-back.STL' })).toContainText('机身后板')
  await expect(page.locator('main')).not.toContainText(/从开源|参考开源|不代表|不是已完成|需.*核对|现有记录能说明什么|正在打印|完全自主|从0开始/)
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('link', { name: '下载 履带板 STL', exact: true }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('打印070件__tread-plate-x70.STL')
  const content = await readFile(await download.path())
  const catalog = JSON.parse(await readFile('src/content/catalog.json', 'utf8'))
  const model = catalog.models.find(item => item.id === 'tread-plate')
  const original = await readFile(`public/${model.path}`)
  expect(createHash('sha256').update(content).digest('hex')).toBe(createHash('sha256').update(original).digest('hex'))
})

test('documents are available and the circuit PDF has the correct viewing type', async ({ page, request }) => {
  await page.goto('/#/electronics')
  const link = page.getByRole('link', { name: /在线查看接线调整方案 PDF/ })
  const response = await request.get(await link.getAttribute('href'))
  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toContain('application/pdf')
  await page.getByRole('button', { name: '资料与参考' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.locator('.source-document-list > a')).toHaveCount(9)
  const downloadPromise = page.waitForEvent('download')
  await dialog.getByRole('link', { name: /瓦力机器人设计方案.docx/ }).click()
  expect((await downloadPromise).suggestedFilename()).toBe('瓦力机器人设计方案.docx')
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
})

test('cold load and chapter assets work with all external requests blocked', async ({ page }) => {
  const external = [], failed = []
  await page.route('**/*', route => {
    const url = route.request().url()
    if (url.startsWith('http://127.0.0.1:4173/') || url.startsWith('data:')) return route.continue()
    external.push(url); return route.abort()
  })
  page.on('response', response => { if (response.status() >= 400) failed.push(response.url()) })
  for (const [route] of routes) {
    await page.goto(`/#${route}`)
    await expect(page.locator('main h1')).toBeVisible()
    if (route === '/virtual') await expect(page.locator('.robot-viewer')).toHaveAttribute('data-status', 'ready')
    for (const image of await page.locator('main img').all()) {
      if (!await image.isVisible()) continue
      await image.scrollIntoViewIfNeeded()
      await expect.poll(() => image.evaluate(element => element.complete && element.naturalWidth > 0)).toBe(true)
    }
  }
  expect(external).toEqual([]); expect(failed).toEqual([])
})

test('all chapters fit mobile and images enlarge without document overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  for (const [route] of routes) {
    await page.goto(`/#${route}`)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.getByRole('navigation', { name: '章节导航' }).getByRole('link')).toHaveCount(routes.length)
  }
  await page.setViewportSize({ width: 320, height: 844 })
  await page.goto('/#/completion')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('navigation', { name: '章节导航' }).getByRole('link', { name: /实体成果/ }).click()
  await expect(page.getByRole('heading', { name: '实体成果', level: 1 })).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#/future')
  await page.getByRole('button', { name: '放大查看：瓦力的表情与结构', exact: true }).click()
  await page.getByRole('button', { name: '放大图像', exact: true }).click()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.keyboard.press('Escape')
})
