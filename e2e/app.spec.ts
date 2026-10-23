import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

const content = JSON.parse(readFileSync('data/geography-quiz/content.json', 'utf8')) as {
  questions: { id: string; prompt: string; answer: string }[]
}

function answerFor(prompt: string): string {
  const question = content.questions.find((item) => item.prompt === prompt)
  if (!question) throw new Error(`No question for prompt: ${prompt}`)
  return question.answer
}

async function promptText(page: import('@playwright/test').Page): Promise<string> {
  return ((await page.getByTestId('prompt').textContent()) ?? '').trim()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('beta label, difficulty pop-out, and security headers', async ({ page }, info) => {
  await expect(page.getByText(/how to play/i)).toHaveCount(0)
  await expect(page.getByText(/type your answer/i)).toHaveCount(0)
  await expect(page.getByText(/spot-checked/i)).toHaveCount(0)
  const tip = page.getByRole('tooltip', { name: 'Beta', exact: true })
  const beta = page.getByRole('button', { name: 'Beta', exact: true })
  await expect(tip).toBeHidden()
  if (info.project.name === 'iphone' || info.project.name === 'landscape') {
    await beta.dispatchEvent('contextmenu')
    await expect(tip).toHaveText('Beta')
  } else {
    await beta.hover()
    await expect(tip).toHaveText('Beta')
    await page.mouse.move(2, 2)
    await expect(tip).toBeHidden()
    await beta.dispatchEvent('contextmenu')
    await expect(tip).toBeVisible()
  }

  await expect(page.getByRole('menuitemradio', { name: 'Easy' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Difficulty' }).click()
  await expect(page.getByRole('menuitemradio', { name: 'Easy' })).toBeVisible()
  await page.getByRole('menuitemradio', { name: 'Hard' }).click()
  await expect(page.getByRole('menuitemradio', { name: 'Easy' })).toHaveCount(0)

  const headers = await page.request.get('/_headers')
  expect(headers.ok()).toBeTruthy()
  const body = await headers.text()
  expect(body).toContain('X-Content-Type-Options: nosniff')
  expect(body).toContain('Referrer-Policy: no-referrer')
  expect(body).toContain('Content-Security-Policy')
})

test('daily answer shows an explanation and survives reload', async ({ page }) => {
  await page.getByTestId('start-daily').click()
  await expect(page.getByTestId('guess')).toBeInViewport()
  const first = await promptText(page)
  await page.getByTestId('guess').fill(answerFor(first))
  await page.getByTestId('submit').click()
  await expect(page.getByTestId('reveal')).toHaveAttribute('data-correct', 'true')
  await expect(page.getByTestId('explanation')).not.toHaveText('')
  await expect(page.getByTestId('reveal-answer')).toHaveText(answerFor(first))
  await page.reload()
  await expect(page.getByTestId('daily-progress')).toContainText('1/10')
  await page.getByTestId('start-daily').click()
  expect(await promptText(page)).not.toBe(first)
  const saved = await page.evaluate(() => localStorage.getItem('meridian.v1'))
  const question = content.questions.find((item) => item.prompt === first)
  expect(saved).toContain(question?.id)
})

test('a miss is kept for review', async ({ page }) => {
  await page.getByTestId('start-daily').click()
  const first = await promptText(page)
  await page.getByTestId('guess').fill('zzzznotaplace')
  await page.getByTestId('submit').click()
  await expect(page.getByTestId('reveal')).toHaveAttribute('data-correct', 'false')
  await expect(page.getByTestId('explanation')).toBeVisible()
  await expect(page.getByTestId('reveal-answer')).not.toHaveText('zzzznotaplace')
  await page.getByTestId('nav-review').click()
  await expect(page.getByTestId('review-list')).toContainText(first)
})

test('map click reports distance', async ({ page }, info) => {
  const glyphs: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/fonts/')) glyphs.push(request.url())
  })
  const tile = page.waitForResponse(
    (response) => response.url().includes('tiles.openfreemap.org/planet/') && response.url().endsWith('.pbf') && response.ok(),
    { timeout: 20000 },
  )
  await page.getByTestId('nav-map').click()
  await tile
  await page.waitForSelector('.maplibregl-canvas')
  await page.waitForFunction(() => {
    const map = document.querySelector('.maplibregl-canvas')
    return Boolean(map && map.clientHeight > 80 && map.clientWidth > 80)
  })
  const card = await page.locator('.map-card').boundingBox()
  const box = await page.getByTestId('map').boundingBox()
  expect(card).toBeTruthy()
  expect(box).toBeTruthy()
  expect(box!.y).toBeGreaterThanOrEqual(card!.y + card!.height - 2)
  if (info.project.name === 'desktop') {
    const stage = await page.locator('.stage').boundingBox()
    expect(box!.width).toBeGreaterThan((stage?.width ?? 0) * 0.98)
    expect(box!.width).toBeGreaterThan(1000)
  }
  if (info.project.name === 'iphone' || info.project.name === 'landscape') {
    await expect(page.getByRole('tooltip', { name: 'Map', exact: true })).toBeHidden()
  }
  const attrib = page.locator('.maplibregl-ctrl-attrib')
  await expect(attrib).toBeVisible()
  await expect(attrib.locator('.maplibregl-ctrl-attrib-inner')).toBeVisible()
  await expect(attrib).toContainText('OpenFreeMap')
  await expect(attrib).toContainText('OpenStreetMap')
  await expect(page.getByTestId('distance')).toHaveCount(0)
  await page.mouse.click((box?.x ?? 0) + (box?.width ?? 0) * 0.35, (box?.y ?? 0) + (box?.height ?? 0) * 0.62)
  await expect(page.getByTestId('distance')).toContainText(/\d+ km/)
  await expect(page.getByTestId('explanation')).toBeVisible()
  expect(glyphs).toEqual([])
})

test('status note is shown for Taipei and not for Paris', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem(
      'meridian.v1',
      JSON.stringify({
        version: 1,
        streak: { count: 0, best: 0, lastCompleted: null },
        daily: {},
        stats: {},
        mistakes: ['q00388', 'q00436'],
        settings: { difficulty: 'all', continent: 'all' },
        blitzBest: 0,
      }),
    )
  })
  await page.reload()
  await page.getByTestId('nav-review').click()
  await page.getByTestId('start-review').click()
  await expect(page.getByTestId('prompt')).toContainText('Taiwan')
  await page.getByTestId('guess').fill('Taipei')
  await page.getByTestId('submit').click()
  await expect(page.getByTestId('status-note')).toHaveText('Status disputed / limited international recognition.')
  await page.getByTestId('next').click()
  await expect(page.getByTestId('prompt')).toContainText('France')
  await expect(page.getByTestId('status-note')).toHaveCount(0)
  await page.getByTestId('guess').fill('Paris')
  await page.getByTestId('submit').click()
  await expect(page.getByTestId('reveal')).toHaveAttribute('data-correct', 'true')
  await expect(page.getByTestId('status-note')).toHaveCount(0)
})

test('finishing the daily quiz records a streak and a share card', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'full daily run is covered on desktop')
  await page.getByTestId('start-daily').click()
  for (let index = 0; index < 10; index += 1) {
    const prompt = await promptText(page)
    await page.getByTestId('guess').fill(answerFor(prompt))
    await page.getByTestId('submit').click()
    await expect(page.getByTestId('reveal')).toHaveAttribute('data-correct', 'true')
    if (index < 9) await page.getByTestId('next').click()
  }
  await expect(page.getByTestId('streak-count')).toHaveText('1')
  await page.getByTestId('next').click()
  await expect(page.getByTestId('daily-result')).toContainText('10/10')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Share' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^meridian-.*\.png$/)
})
