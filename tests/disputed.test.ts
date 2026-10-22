import { describe, expect, it } from 'vitest'
import { entities, playable, questions } from '../src/lib/catalog'
import { isCapitalQuestion, isDisputedCapitalEntity, playableQuestions } from '../src/lib/filter'
import { buildQuestions } from '../src/lib/select'
import type { Entity, PlayMode, Question } from '../src/lib/types'

const base = entities[0]

function entity(partial: Partial<Entity>): Entity {
  return { ...base, ...partial }
}

describe('disputed capitals', () => {
  it('treats a disputed capital note as disputed and a border dispute as not', () => {
    expect(
      isDisputedCapitalEntity(
        entity({
          iso2: 'QQ',
          capital: 'Example City',
          note: 'The status of Example City is disputed. Capital questions for Example are omitted.',
        }),
      ),
    ).toBe(true)
    expect(
      isDisputedCapitalEntity(
        entity({
          iso2: 'PS',
          capital: '',
          note: 'Their status and borders are disputed.',
        }),
      ),
    ).toBe(true)
    expect(
      isDisputedCapitalEntity(
        entity({
          iso2: 'CN',
          capital: 'Beijing',
          note: 'Borders with India (Aksai Chin, Arunachal Pradesh) are disputed.',
        }),
      ),
    ).toBe(false)
    expect(isDisputedCapitalEntity(entity({ iso2: 'FR', capital: 'Paris', note: undefined }))).toBe(false)
  })

  it('classifies only Israel, Palestine, and Western Sahara in this pack', () => {
    const isos = entities.filter(isDisputedCapitalEntity).map((item) => item.iso2).sort()
    expect(isos).toEqual(['EH', 'IL', 'PS'])
  })

  it('drops disputed capital questions, including injected ones, and keeps the rest', () => {
    const injected: Question[] = [
      {
        id: 'qx-capital',
        type: 'capital',
        prompt: 'What is the capital of Israel?',
        answer: 'Jerusalem',
        difficulty: 'easy',
        country_iso2: 'IL',
        sources: [],
      },
      {
        id: 'qx-reverse',
        type: 'capital_reverse',
        prompt: 'Jerusalem is the capital of which country or territory?',
        answer: 'Israel',
        difficulty: 'easy',
        country_iso2: 'IL',
        sources: [],
      },
      {
        id: 'qx-map',
        type: 'map_click',
        prompt: 'Click on Jerusalem, capital of Israel.',
        answer: 'Jerusalem',
        difficulty: 'easy',
        country_iso2: 'IL',
        sources: [],
        lat: 31.77,
        lon: 35.23,
        tolerance_km: 150,
      },
    ]
    const snapshot = JSON.stringify(questions[0])
    const filtered = playableQuestions([...questions, ...injected], entities)
    expect(JSON.stringify(questions[0])).toBe(snapshot)
    expect(filtered.some((question) => question.id.startsWith('qx-'))).toBe(false)
    expect(filtered.some((question) => isCapitalQuestion(question) && ['IL', 'PS', 'EH'].includes(question.country_iso2 ?? ''))).toBe(false)
    expect(filtered.some((question) => question.type === 'capital' && question.answer === 'Jerusalem')).toBe(false)
    expect(playable.some((question) => question.type === 'capital' && question.prompt === 'What is the capital of France?')).toBe(true)
    expect(playable.some((question) => question.type === 'capital' && question.answer === 'Beijing')).toBe(true)
    expect(playable.some((question) => question.country_iso2 === 'IL' && question.type === 'flag')).toBe(true)
    expect(filtered.length).toBe(questions.length)
  })

  it('uses the omitted-capital sentence on its own', () => {
    const gap = (length: number) => `Capital questions${' ' + 'y'.repeat(length - 2) + ' '}omitted`
    expect(
      isDisputedCapitalEntity(entity({ iso2: 'QQ', capital: 'Kept', note: 'Capital questions omitted' })),
    ).toBe(true)
    expect(isDisputedCapitalEntity(entity({ iso2: 'QQ', capital: 'Kept', note: gap(80) }))).toBe(true)
    expect(isDisputedCapitalEntity(entity({ iso2: 'QQ', capital: 'Kept', note: gap(81) }))).toBe(false)
    expect(
      isDisputedCapitalEntity(entity({ iso2: 'QQ', capital: 'Kept', note: 'Capital questions. are omitted.' })),
    ).toBe(false)
  })

  it('uses the disputed-status sentence on its own', () => {
    expect(
      isDisputedCapitalEntity(
        entity({ iso2: 'QQ', capital: 'Kept', note: `The status of ${'A'.repeat(40)} is disputed.` }),
      ),
    ).toBe(true)
    expect(
      isDisputedCapitalEntity(
        entity({ iso2: 'QQ', capital: 'Kept', note: `The status of ${'A'.repeat(41)} is disputed.` }),
      ),
    ).toBe(false)
    expect(
      isDisputedCapitalEntity(entity({ iso2: 'QQ', capital: 'Kept', note: "The status of Ab'c is disputed." })),
    ).toBe(true)
    expect(
      isDisputedCapitalEntity(entity({ iso2: 'QQ', capital: 'Kept', note: 'The status of Ab’c is disputed.' })),
    ).toBe(true)
    expect(
      isDisputedCapitalEntity(
        entity({ iso2: 'QQ', capital: 'Kept', note: 'Borders with a neighbour are disputed.' }),
      ),
    ).toBe(false)
  })

  it('plays the filtered catalog, not the raw question list', () => {
    expect(playable).not.toBe(questions)
    expect(playable).toEqual(playableQuestions(questions, entities))
    const ids = new Set(playable.map((question) => question.id))
    const modes: PlayMode[] = ['daily', 'map', 'endless', 'blitz', 'flags', 'choices', 'pack', 'duel']
    for (const mode of modes) {
      const played = buildQuestions({
        mode,
        settings: { difficulty: 'all', continent: 'all' },
        today: '2026-10-22',
        seed: 'wire',
      })
      expect(played.length).toBeGreaterThan(0)
      for (const question of played) {
        expect(ids.has(question.id)).toBe(true)
        if (isCapitalQuestion(question)) expect(['IL', 'PS', 'EH']).not.toContain(question.country_iso2)
      }
    }
  })
})
