import { readFileSync } from 'node:fs'
import { expect, test, type Locator, type Page } from '@playwright/test'

const content = JSON.parse(readFileSync('data/geography-quiz/content.json', 'utf8')) as {
  questions: { id: string; prompt: string; answer: string }[]
}

function answerFor(prompt: string): string {
  const question = content.questions.find((item) => item.prompt === prompt)
  if (!question) throw new Error(`No question for prompt: ${prompt}`)
  return question.answer
}

async function promptText(page: Page): Promise<string> {
  return ((await page.getByTestId('prompt').textContent()) ?? '').trim()
}

async function expectOpaque(locator: Locator) {
  await expect(locator).toBeVisible()
  const opacity = await locator.evaluate((element) => {
    let combined = 1
    let node: Element | null = element
    while (node) {
      combined *= Number(getComputedStyle(node).opacity)
      node = node.parentElement
    }
    return combined
  })
  expect(opacity).toBeGreaterThan(0)
}

/** Fully inside the viewport, and not clipped by an overflow ancestor or its own box. */
async function elementFullyShown(page: Page, locator: Locator): Promise<boolean> {
  if (!(await locator.isVisible().catch(() => false))) return false
  const box = await locator.boundingBox()
  const viewport = page.viewportSize()
  if (!box || !viewport) return false
  if (box.y < -1 || box.x < -1) return false
  if (box.y + box.height > viewport.height + 1) return false
  if (box.x + box.width > viewport.width + 1) return false
  return locator.evaluate((element) => {
    if (element.scrollHeight - element.clientHeight > 1) return false
    const rect = element.getBoundingClientRect()
    let parent = element.parentElement
    while (parent) {
      const style = getComputedStyle(parent)
      const mode = `${style.overflow} ${style.overflowX} ${style.overflowY}`
      if (/\b(hidden|auto|scroll|clip)\b/.test(mode)) {
        const bounds = parent.getBoundingClientRect()
        if (
          rect.top < bounds.top - 1 ||
          rect.bottom > bounds.bottom + 1 ||
          rect.left < bounds.left - 1 ||
          rect.right > bounds.right + 1
        ) {
          return false
        }
      }
      parent = parent.parentElement
    }
    return true
  })
}

async function expectFullyShown(page: Page, locator: Locator) {
  expect(await elementFullyShown(page, locator)).toBe(true)
}

async function cardMetrics(page: Page) {
  return page.locator('.map-card').evaluate((element) => ({
    overflowY: getComputedStyle(element).overflowY,
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
    scrollTop: element.scrollTop,
  }))
}

/** Touch-drag the card. overflow:hidden does not move under a real touch. */
async function scrollMapCard(page: Page, deltaY: number) {
  const card = page.locator('.map-card')
  const box = await card.boundingBox()
  expect(box).toBeTruthy()
  const x = box!.x + box!.width / 2
  const y = box!.y + Math.min(28, Math.max(12, box!.height / 3))
  const finger = -deltaY
  const steps = 8
  const client = await page.context().newCDPSession(page)
  try {
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    for (let step = 1; step <= steps; step += 1) {
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x, y: y + (finger * step) / steps }],
      })
    }
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  } finally {
    await client.detach()
  }
}

async function assertUserCanScrollCard(page: Page) {
  const before = await cardMetrics(page)
  expect(['auto', 'scroll']).toContain(before.overflowY)
  expect(before.scrollHeight).toBeGreaterThan(before.clientHeight)
  const roomBelow = before.scrollHeight - before.clientHeight - before.scrollTop
  await scrollMapCard(page, roomBelow > 24 ? 90 : -90)
  await expect.poll(async () => (await cardMetrics(page)).scrollTop).not.toBe(before.scrollTop)
}

/** The answer sits above the sticky bar, not painted underneath it. */
async function expectAnswerClearsActions(page: Page) {
  const answer = page.getByTestId('reveal-answer')
  await expect(answer).toBeVisible()
  await expect.poll(async () =>
    answer.evaluate((element) => {
      const bar = element.closest('.map-card')?.querySelector('.reveal-actions')
      if (!bar) return false
      return element.getBoundingClientRect().bottom <= bar.getBoundingClientRect().top + 1
    }),
  ).toBe(true)
}

async function dragUntilShown(page: Page, locator: Locator) {
  let direction = 1
  for (let step = 0; step < 30; step += 1) {
    const shown = await elementFullyShown(page, locator)
    const testId = await locator.getAttribute('data-testid')
    const covered =
      testId === 'reveal-answer' &&
      !(await locator.evaluate((element) => {
        const bar = element.closest('.map-card')?.querySelector('.reveal-actions')
        if (!bar) return true
        return element.getBoundingClientRect().bottom <= bar.getBoundingClientRect().top + 1
      }))
    if (shown && !covered) return
    const top = (await cardMetrics(page)).scrollTop
    const max = (await cardMetrics(page)).scrollHeight - (await cardMetrics(page)).clientHeight
    if (direction > 0 && top >= max - 1) direction = -1
    if (direction < 0 && top <= 1) direction = 1
    await scrollMapCard(page, direction * 80)
  }
  await expectFullyShown(page, locator)
  if ((await locator.getAttribute('data-testid')) === 'reveal-answer') await expectAnswerClearsActions(page)
}

async function clickMap(page: Page) {
  const map = page.getByTestId('map')
  const canvas = map.locator('.maplibregl-canvas')
  await expect(canvas).toBeVisible()
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const box = await map.boundingBox()
    expect(box && box.height).toBeGreaterThan(40)
    await page.mouse.click(box!.x + box!.width * 0.35, box!.y + box!.height * 0.62)
    try {
      await expect(page.getByTestId('distance')).toBeVisible({ timeout: 2500 })
      return
    } catch {
      // The map ignores a click that lands before it is ready.
    }
  }
  await expect(page.getByTestId('distance')).toBeVisible()
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
  if (info.project.name.includes('iphone') || info.project.name.includes('landscape')) {
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
  if (info.project.name.includes('iphone') || info.project.name.includes('landscape')) {
    await expect(page.getByRole('tooltip', { name: 'Map', exact: true })).toBeHidden()
  }
  const attrib = page.locator('.maplibregl-ctrl-attrib')
  await expect(attrib).toBeVisible()
  await expect(attrib.locator('.maplibregl-ctrl-attrib-inner')).toBeVisible()
  await expectOpaque(attrib.getByRole('link', { name: 'OpenFreeMap' }))
  await expectOpaque(attrib.getByRole('link', { name: 'OpenStreetMap' }))
  await expect(page.getByTestId('distance')).toHaveCount(0)
  await page.mouse.click((box?.x ?? 0) + (box?.width ?? 0) * 0.35, (box?.y ?? 0) + (box?.height ?? 0) * 0.62)
  await expect(page.getByTestId('distance')).toContainText(/\d+ km/)
  await expect(page.getByTestId('explanation')).toBeVisible()
  if (info.project.name === 'landscape' || info.project.name === 'landscape-webkit') {
    const next = page.getByRole('button', { name: 'Next', exact: true })
    const sources = page.getByRole('button', { name: 'Sources', exact: true })
    await expectFullyShown(page, next)
    await expectFullyShown(page, sources)
    if (info.project.name === 'landscape') {
      await assertUserCanScrollCard(page)
      await dragUntilShown(page, page.getByTestId('reveal-answer'))
      await expectAnswerClearsActions(page)
      await dragUntilShown(page, page.getByTestId('explanation'))
    }
    await expectFullyShown(page, next)
    const canvas = await page.locator('.maplibregl-canvas').boundingBox()
    expect(canvas).toBeTruthy()
    expect(canvas!.height).toBeGreaterThanOrEqual(80)
  }
  if (info.project.name === 'iphone' || info.project.name === 'iphone-webkit') {
    await page.getByTestId('difficulty').click()
    await page.getByRole('menuitemradio', { name: 'Hard' }).click()
    await page.getByTestId('continent').click()
    await page.getByRole('menuitemradio', { name: 'Europe' }).click()
    for (let extra = 0; extra < 3; extra += 1) await page.getByTestId('nav-map').click()
    for (let step = 0; step < 3; step += 1) {
      await clickMap(page)
      await expect(page.getByTestId('distance')).toBeVisible()
      await page.getByTestId('next').click()
    }
    await expect(page.getByTestId('prompt')).toContainText('Nicosia')
    await clickMap(page)
    const note = page.getByTestId('status-note')
    await expect(note).toHaveText(
      'Divided city; the north is administered by the Turkish Cypriot authorities, recognised only by Turkey.',
    )
    for (const size of [page.viewportSize() ?? { width: 390, height: 844 }, { width: 375, height: 667 }]) {
      await page.setViewportSize(size)
      await expect(page.getByTestId('reveal-answer')).toHaveText('Nicosia (Lefkosia/Lefkosa)')
      await expectFullyShown(page, page.getByTestId('reveal-answer'))
      await expectAnswerClearsActions(page)
      await expectFullyShown(page, page.getByTestId('explanation'))
      await expectFullyShown(page, note)
      for (const label of ['Sources', 'Next']) {
        await expectFullyShown(page, page.getByRole('button', { name: label, exact: true }))
      }
    }
    await page.setViewportSize({ width: 802, height: 293 })
    const answer = page.getByTestId('reveal-answer')
    const next = page.getByRole('button', { name: 'Next', exact: true })
    await expect(answer).toHaveText('Nicosia (Lefkosia/Lefkosa)')
    await expectFullyShown(page, next)
    if (info.project.name === 'iphone') {
      await assertUserCanScrollCard(page)
      await dragUntilShown(page, answer)
      await expectAnswerClearsActions(page)
    }
    await expectFullyShown(page, next)
    await next.click()
    await expect(page.getByTestId('prompt')).not.toContainText('Nicosia')
    await clickMap(page)
    await expectFullyShown(page, page.getByTestId('reveal-answer'))
    await expectAnswerClearsActions(page)
    await expectFullyShown(page, page.getByRole('button', { name: 'Next', exact: true }))
  }
  expect(glyphs).toEqual([])
})

test('status notes use the per-country wording and do not repeat the pack note', async ({ page }, info) => {
  await page.evaluate(() => {
    localStorage.setItem(
      'meridian.v1',
      JSON.stringify({
        version: 1,
        streak: { count: 0, best: 0, lastCompleted: null },
        daily: {},
        stats: {},
        mistakes: ['q00388', 'q00415', 'q00749'],
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
  const taiwan = page.getByTestId('status-note')
  await expect(taiwan).toHaveText("Taiwan's status is disputed; limited formal diplomatic recognition.")
  await expect(page.getByTestId('reveal')).not.toContainText('CIA World Factbook')
  await expect(taiwan).toHaveJSProperty('scrollHeight', await taiwan.evaluate((element) => element.clientHeight))

  await page.getByTestId('next').click()
  await expect(page.getByTestId('prompt')).toContainText('Cyprus')
  await page.getByTestId('guess').fill('Nicosia')
  await page.getByTestId('submit').click()
  const cyprus = page.getByTestId('status-note')
  await expect(cyprus).toHaveText(
    'Divided city; the north is administered by the Turkish Cypriot authorities, recognised only by Turkey.',
  )
  await expect(page.getByTestId('reveal')).not.toContainText('whole island')
  await expect(cyprus).toHaveJSProperty('scrollHeight', await cyprus.evaluate((element) => element.clientHeight))
  if (info.project.name === 'iphone' || info.project.name === 'iphone-webkit') {
    await page.getByRole('button', { name: 'Sources' }).click()
    const pack = page.locator('.drawer .reveal-note')
    await expect(pack).toContainText('internationally recognised state for the whole island')
    await expect(pack).toHaveJSProperty('scrollHeight', await pack.evaluate((element) => element.clientHeight))
    await page.locator('.drawer').getByRole('button', { name: 'Close' }).click()
  }

  await page.getByTestId('next').click()
  await expect(page.getByTestId('prompt')).toContainText('flag')
  await page.getByTestId('choice').filter({ hasText: /^Taiwan$/ }).click()
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
