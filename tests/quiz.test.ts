import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { entityByIso, playable, questionById, questions } from '../src/lib/catalog'
import { dailyQuestions } from '../src/lib/daily'
import { addDays } from '../src/lib/date'
import { explanationFor } from '../src/lib/explain'
import { isCapitalQuestion } from '../src/lib/filter'
import { haversineKm, mapScore, withinTolerance } from '../src/lib/geo'
import { buildQuestions, matchesSettings } from '../src/lib/select'
import { applyAnswer, emptyProgress, ensureDaily, loadProgress, recordBlitz, saveProgress } from '../src/lib/storage'
import { registerCompletion, schedule } from '../src/lib/streak'
import { breakdown } from '../src/lib/stats'
import { TYPED_TYPES, type Question } from '../src/lib/types'

const TYPED = new Set<string>(TYPED_TYPES)
const DISPUTED = new Set(['IL', 'PS', 'EH'])

function memory() {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
  }
}

describe('daily quiz', () => {
  it('is deterministic for a date and mixes difficulties', () => {
    const first = dailyQuestions(playable, '2026-10-22')
    const second = dailyQuestions(playable, '2026-10-22')
    expect(first.map((question) => question.id)).toEqual(second.map((question) => question.id))
    expect(first).toHaveLength(10)
    expect(dailyQuestions(playable, '2026-01-03').map((question) => question.id)).not.toEqual(
      first.map((question) => question.id),
    )
    expect(first.filter((question) => question.difficulty === 'easy')).toHaveLength(3)
    expect(first.filter((question) => question.difficulty === 'medium')).toHaveLength(4)
    expect(first.filter((question) => question.difficulty === 'hard')).toHaveLength(3)
    expect(first.every((question) => TYPED.has(question.type))).toBe(true)
    expect(first.some((question) => isCapitalQuestion(question) && DISPUTED.has(question.country_iso2 ?? ''))).toBe(false)
  })

  it('resumes a stored daily set', () => {
    const ids = dailyQuestions(playable, '2026-10-22').map((question) => question.id)
    const built = buildQuestions({
      mode: 'daily',
      settings: { difficulty: 'hard', continent: 'AF' },
      today: '2026-10-22',
      seed: '1',
      dailyIds: ids,
    })
    expect(built.map((question) => question.id)).toEqual(ids)
  })
})

describe('explanations', () => {
  it('has an explanation for every playable question', () => {
    for (const question of playable) {
      const text = explanationFor(question, question.country_iso2 ? entityByIso.get(question.country_iso2) : undefined)
      expect(text.length, question.id).toBeGreaterThan(8)
    }
    const france = playable.find((question) => question.prompt === 'What is the capital of France?') as Question
    expect(explanationFor(france, entityByIso.get('FR'))).toContain('Paris')
    expect(explanationFor(france, entityByIso.get('FR'))).toContain('France')
    const everest = questionById.get('q01851') as Question
    expect(explanationFor(everest)).toContain('Everest')
  })
})

describe('streaks and storage', () => {
  it('increments on consecutive days, resets after a gap, and keeps the best', () => {
    let streak = registerCompletion({ count: 0, best: 0, lastCompleted: null }, '2026-10-20')
    expect(streak).toMatchObject({ count: 1, best: 1, lastCompleted: '2026-10-20' })
    streak = registerCompletion(streak, '2026-10-20')
    expect(streak.count).toBe(1)
    streak = registerCompletion(streak, '2026-10-21')
    expect(streak.count).toBe(2)
    streak = registerCompletion(streak, '2026-10-22')
    expect(streak).toMatchObject({ count: 3, best: 3 })
    streak = registerCompletion(streak, '2026-10-25')
    expect(streak).toMatchObject({ count: 1, best: 3, lastCompleted: '2026-10-25' })
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(schedule(0, true, '2026-10-22')).toEqual({ box: 1, due: '2026-10-23' })
    expect(schedule(2, false, '2026-10-22')).toEqual({ box: 0, due: '2026-10-22' })
    expect(schedule(5, true, '2026-10-22').box).toBe(5)
  })

  it('stores progress locally and completes a daily streak once', () => {
    const store = memory()
    const ids = ['q1', 'q2']
    let progress = ensureDaily(emptyProgress(), '2026-10-22', ids)
    const question = { ...questions[0], id: 'q1' }
    progress = applyAnswer(progress, {
      question,
      correct: false,
      guess: 'nope',
      date: '2026-10-22',
      mode: 'daily',
    })
    expect(progress.streak.count).toBe(0)
    expect(progress.mistakes).toEqual(['q1'])
    progress = applyAnswer(progress, {
      question,
      correct: true,
      guess: 'again',
      date: '2026-10-22',
      mode: 'daily',
    })
    expect(progress.daily['2026-10-22'].answers).toHaveLength(1)
    progress = applyAnswer(progress, {
      question: { ...question, id: 'q2' },
      correct: true,
      guess: 'yes',
      date: '2026-10-22',
      mode: 'daily',
    })
    expect(progress.daily['2026-10-22'].completed).toBe(true)
    expect(progress.streak.count).toBe(1)
    expect(progress.mistakes).toEqual(['q1'])
    progress = applyAnswer(progress, {
      question,
      correct: true,
      guess: 'yes',
      date: '2026-10-23',
      mode: 'review',
    })
    expect(progress.mistakes).toEqual([])
    progress = recordBlitz(progress, 4)
    progress = recordBlitz(progress, 2)
    expect(progress.blitzBest).toBe(4)
    saveProgress(store, progress)
    expect(loadProgress(store).streak.count).toBe(1)
    expect(loadProgress({ getItem: () => '{bad' }).version).toBe(1)
    expect(loadProgress({ getItem: () => '{"version":2}' }).mistakes).toEqual([])
    const rows = breakdown(progress, [question, { ...question, id: 'q2', type: 'river' }], 'type')
    expect(rows.length).toBeGreaterThan(0)
  })
})

describe('selection and distance', () => {
  it('filters practice by difficulty and continent without editing questions', () => {
    const everest = questionById.get('q01851') as Question
    expect(matchesSettings(everest, { difficulty: 'all', continent: 'AS' })).toBe(true)
    expect(matchesSettings(everest, { difficulty: 'hard', continent: 'AS' })).toBe(false)
    const hard = buildQuestions({
      mode: 'pack',
      settings: { difficulty: 'hard', continent: 'EU' },
      today: '2026-10-22',
      seed: 'pack',
    })
    expect(hard.length).toBeGreaterThan(0)
    expect(hard.every((question) => question.difficulty === 'hard')).toBe(true)
    expect(hard.every((question) => matchesSettings(question, { difficulty: 'hard', continent: 'EU' }))).toBe(true)
  })

  it('scores a map click against the tolerance', () => {
    expect(haversineKm(36.75, 3.05, 36.75, 3.05)).toBe(0)
    const degree = haversineKm(36.75, 3.05, 37.75, 3.05)
    expect(degree).toBeGreaterThan(100)
    expect(degree).toBeLessThan(120)
    expect(withinTolerance(300, 300)).toBe(true)
    expect(withinTolerance(300.1, 300)).toBe(false)
    const question = questionById.get('q00003') as Question
    const hit = mapScore(question.lat ?? 0, question.lon ?? 0, question)
    expect(hit).toEqual({ km: 0, correct: true })
  })
})

describe('pages headers', () => {
  it('sets CSP, nosniff, and Referrer-Policy', () => {
    const headers = readFileSync('public/_headers', 'utf8')
    expect(headers).toContain('X-Content-Type-Options: nosniff')
    expect(headers).toContain('Referrer-Policy: no-referrer')
    expect(headers).toContain("script-src 'self'")
    expect(headers).not.toMatch(/script-src[^;]*unsafe-inline/)
    expect(headers).not.toMatch(/script-src[^;]*unsafe-eval/)
    expect(headers).toContain('https://tiles.openfreemap.org')
    expect(headers).toContain("worker-src 'self' blob:")
    expect(headers).not.toContain('basemaps.cartocdn.com')
    expect(headers).toContain('frame-ancestors')
  })
})
