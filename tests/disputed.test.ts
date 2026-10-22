import { describe, expect, it } from 'vitest'
import { entities, playable, questions } from '../src/lib/catalog'
import { isCapitalQuestion, isDisputedCapitalEntity, playableQuestions } from '../src/lib/filter'
import type { Entity, Question } from '../src/lib/types'

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
})
