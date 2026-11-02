import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const baseURL = process.env.PORTFOLIO_URL || 'http://127.0.0.1:4173'
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
const errors = []; page.on('pageerror', error => errors.push(error.message))
await mkdir('artifacts/portfolio', { recursive: true })
for (const route of ['/', '/structure', '/electronics', '/reflection', '/future', '/virtual']) {
  await page.goto(`${baseURL}/#${route}`, { waitUntil: 'networkidle' })
  for (const image of await page.locator('main img').all()) { if (await image.isVisible()) { await image.scrollIntoViewIfNeeded(); await image.evaluate(image => image.decode().catch(() => {})) } }
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: `artifacts/portfolio/${route === '/' ? 'story' : route.slice(1)}-desktop.png`, fullPage: true })
}
await page.goto(`${baseURL}/#/`)
await page.setViewportSize({ width: 390, height: 844 })
for (const image of await page.locator('main img').all()) { if (await image.isVisible()) { await image.scrollIntoViewIfNeeded(); await image.evaluate(image => image.decode().catch(() => {})) } }
await page.evaluate(() => window.scrollTo(0, 0))
await page.screenshot({ path: 'artifacts/portfolio/story-mobile.png', fullPage: true })
const overflow = []
for (const route of ['/', '/structure', '/electronics', '/reflection', '/future', '/virtual']) {
  await page.goto(`${baseURL}/#${route}`, { waitUntil: 'networkidle' })
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) overflow.push(route)
}
console.log(JSON.stringify({ errors, mobileOverflow: overflow }))
await browser.close()
