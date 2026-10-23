import { describe, expect, it } from 'vitest'
import { entities, questions, universe } from '../src/lib/catalog'
import { gradeQuestion } from '../src/lib/grade'
import { acceptedFor, answerMatches, expandAnswer, normalize } from '../src/lib/match'
import type { Question } from '../src/lib/types'

function findAnswer(answer: string): Question {
  const exact = questions.find((item) => item.answer === answer)
  const question = exact ?? questions.find((item) => item.answer.startsWith(answer))
  if (!question) throw new Error(`missing ${answer}`)
  return question
}

describe('answer matching', () => {
  it('accepts every canonical answer, including case changes', () => {
    for (const question of questions) {
      expect(gradeQuestion(question, question.answer), question.id).toBe(true)
      expect(gradeQuestion(question, question.answer.toUpperCase()), question.id).toBe(true)
    }
  })

  it('ignores case, accents, and punctuation', () => {
    expect(gradeQuestion(findAnswer('Algiers'), '  ALGIERS!!! ')).toBe(true)
    expect(gradeQuestion(findAnswer('San José'), 'san jose')).toBe(true)
    expect(gradeQuestion(findAnswer('Brasília'), 'brasilia')).toBe(true)
    expect(gradeQuestion(findAnswer('Asunción'), 'asuncion')).toBe(true)
    expect(gradeQuestion(findAnswer('Bogotá'), 'bogota')).toBe(true)
    expect(gradeQuestion(findAnswer('Malé'), 'male')).toBe(true)
    expect(gradeQuestion(findAnswer('Washington, D.C.'), 'washington dc')).toBe(true)
    expect(gradeQuestion(findAnswer('Washington, D.C.'), 'Washington D.C.')).toBe(true)
    expect(gradeQuestion(findAnswer("N'Djamena"), 'Ndjamena')).toBe(true)
    expect(gradeQuestion(findAnswer("N'Djamena"), 'N Djamena')).toBe(true)
    expect(normalize("N'Djamena").replace(/ /g, '')).toBe('ndjamena')
  })

  it('accepts common alternates packed in the answer or in aliases', () => {
    expect(gradeQuestion(findAnswer('Mexico City (Ciudad de Mexico)'), 'ciudad de mexico')).toBe(true)
    expect(gradeQuestion(findAnswer('Mexico City (Ciudad de Mexico)'), 'mexico city')).toBe(true)
    expect(gradeQuestion(findAnswer('Mexico City (Ciudad de Mexico)'), 'México')).toBe(false)
    const kyiv = expandAnswer(entities.find((entity) => entity.iso2 === 'UA')?.capital ?? '')
    expect(kyiv).toContain('Kiev')
    expect(answerMatches('kiev', kyiv, universe)).toBe(true)
    expect(answerMatches('KYIV', kyiv, universe)).toBe(true)
    const chisinau = expandAnswer(entities.find((entity) => entity.iso2 === 'MD')?.capital ?? '')
    expect(chisinau).toContain('Kishinev')
    expect(answerMatches('kishinev', chisinau, universe)).toBe(true)
    expect(gradeQuestion(findAnswer('Ivory Coast'), "cote d'ivoire")).toBe(true)
    expect(gradeQuestion(findAnswer('Ivory Coast'), 'Côte d’Ivoire')).toBe(true)
    expect(gradeQuestion(findAnswer('Czechia'), 'Czech Republic')).toBe(true)
    expect(gradeQuestion(findAnswer('United States'), 'usa')).toBe(true)
    expect(gradeQuestion(findAnswer('United States'), 'U.S.')).toBe(true)
    expect(gradeQuestion(findAnswer('The Netherlands'), 'netherlands')).toBe(true)
    expect(gradeQuestion(findAnswer('The Settlement (Flying Fish Cove)'), 'Settlement')).toBe(true)
    expect(gradeQuestion(findAnswer('The Settlement (Flying Fish Cove)'), 'The Settlement')).toBe(true)
    expect(gradeQuestion(findAnswer('Baku (Baki, Baky)'), 'Bakı')).toBe(true)
    expect(gradeQuestion(findAnswer('Baku (Baki, Baky)'), 'Baki')).toBe(true)
    expect(gradeQuestion(findAnswer('The Netherlands'), 'holland')).toBe(true)
    expect(gradeQuestion(findAnswer('Saint Lucia'), 'st. lucia')).toBe(true)
    expect(gradeQuestion(findAnswer('Saint Lucia'), 'st lucia')).toBe(true)
    expect(gradeQuestion(findAnswer('Washington, D.C.'), 'Washington')).toBe(true)
    expect(gradeQuestion(findAnswer('Washington, D.C.'), 'DC')).toBe(false)
    expect(gradeQuestion(findAnswer('Beijing'), 'Peking')).toBe(true)
    expect(gradeQuestion(findAnswer('New Delhi'), 'Delhi')).toBe(true)
  })

  it('allows a small typo and rejects a different place or an empty guess', () => {
    const algiers = findAnswer('Algiers')
    const paris = findAnswer('Paris')
    const malta = findAnswer('Malta')
    const everest = findAnswer('Mount Everest')
    expect(gradeQuestion(algiers, 'Algier')).toBe(true)
    expect(gradeQuestion(paris, 'pariz')).toBe(true)
    expect(gradeQuestion(paris, 'Parisian')).toBe(false)
    expect(gradeQuestion(malta, 'Mali')).toBe(false)
    expect(gradeQuestion(algiers, '')).toBe(false)
    expect(gradeQuestion(algiers, '   ')).toBe(false)
    expect(gradeQuestion(algiers, 'zzzznotaplace')).toBe(false)
    expect(gradeQuestion(everest, 'everest')).toBe(true)
    expect(gradeQuestion(everest, 'mt. everest')).toBe(true)
  })

  it('accepts number words for border counts and not nearby words', () => {
    const six = questions.find((question) => question.type === 'border_count' && question.answer === '6')
    expect(six).toBeTruthy()
    expect(gradeQuestion(six as Question, 'six')).toBe(true)
    expect(gradeQuestion(six as Question, '6')).toBe(true)
    expect(gradeQuestion(six as Question, 'sixty')).toBe(false)
  })

  it('does not treat a blocked universe collision as a typo of the target', () => {
    expect(answerMatches('mali', ['Malta'], new Set(['mali', 'malta']))).toBe(false)
    expect(answerMatches('malta', ['Malta'], new Set(['mali', 'malta']))).toBe(true)
  })

  it('splits semicolons and aka names, and skips a long gloss', () => {
    expect(expandAnswer('Alpha; Beta')).toEqual(expect.arrayContaining(['Alpha; Beta', 'Alpha', 'Beta']))
    expect(expandAnswer('Foo (aka Bar)')).toEqual(expect.arrayContaining(['Foo', 'Bar']))
    expect(expandAnswer('Place (Alpha aka Beta)')).toEqual(expect.arrayContaining(['Place', 'Alpha', 'Beta']))
    const gloss = expandAnswer('Name (one two three four five six seven)')
    expect(gloss).toContain('Name')
    expect(gloss).not.toContain('one two three four five six seven')
  })

  it('treats a bracketed location as a qualifier without a hard-coded name list', () => {
    const located = {
      id: 'synth-peak',
      type: 'highest_point' as const,
      prompt: 'Highest point?',
      answer: 'Pico de Example (Atlantis) on Far Islands',
      difficulty: 'hard' as const,
      sources: [],
    }
    const territory = {
      id: 'synth-place',
      type: 'highest_point' as const,
      prompt: 'Highest point?',
      answer: 'Mount Example (New Place)',
      difficulty: 'hard' as const,
      sources: [],
      country_iso2: 'ZZ',
    }
    const entity = {
      iso2: 'ZZ',
      iso3: 'ZZZ',
      name: 'New Place and Nearby Islands',
      continent: 'AF',
      capital: '',
      capital_latlon: null,
      population: null,
      pop_year: null,
      sources: [],
    }
    expect(answerMatches('Atlantis', acceptedFor(located), new Set())).toBe(false)
    expect(answerMatches('Far Islands', acceptedFor(located), new Set())).toBe(false)
    expect(answerMatches('Pico de Example', acceptedFor(located), new Set())).toBe(true)
    expect(answerMatches('New Place', acceptedFor(territory, entity), new Set())).toBe(false)
    expect(answerMatches('Mount Example', acceptedFor(territory, entity), new Set())).toBe(true)
    for (const [answer, alias] of [
      ['Mount Everest (Sagarmatha)', 'Sagarmatha'],
      ['Mount Cook (Aoraki)', 'Aoraki'],
      ['Mount McKinley (Denali)', 'Denali'],
    ] as const) {
      const question = {
        id: `synth-${alias}`,
        type: 'highest_point' as const,
        prompt: 'Highest point?',
        answer,
        difficulty: 'hard' as const,
        sources: [],
      }
      expect(answerMatches(alias, acceptedFor(question), new Set()), alias).toBe(true)
    }
  })

  it('keeps summit tails on an alias list and rejects a wrong ridge', () => {
    const byId = (id: string) => {
      const question = questions.find((item) => item.id === id)
      expect(question, id).toBeTruthy()
      return question!
    }
    expect(gradeQuestion(byId('q01561'), 'Mont Cameroun')).toBe(true)
    expect(gradeQuestion(byId('q01561'), 'Fako on Mont Cameroun')).toBe(true)
    expect(gradeQuestion(byId('q01731'), 'Monte Rosa')).toBe(true)
    expect(gradeQuestion(byId('q01731'), 'Dufourspitze on Monte Rosa')).toBe(true)
    expect(gradeQuestion(byId('q01759'), 'Mount Roraima')).toBe(true)
    expect(gradeQuestion(byId('q01759'), 'Laberintos del Norte on Mount Roraima')).toBe(true)
    const monaco = byId('q01720')
    expect(gradeQuestion(monaco, 'Chemin des Revoires')).toBe(true)
    expect(gradeQuestion(monaco, 'Chemin des Revoires on Mont Agel')).toBe(true)
    expect(gradeQuestion(monaco, 'Mont Agel')).toBe(false)
    const france = byId('q00436')
    expect(gradeQuestion(france, 'Mount Stanley')).toBe(false)
    expect(gradeQuestion(france, 'Margherita Peak')).toBe(false)
    expect(gradeQuestion(france, 'Paris')).toBe(true)
  })

  it('does not grade a country name as its namesake peak', () => {
    const kenya = questions.find((item) => item.id === 'q01574')
    expect(kenya).toBeTruthy()
    expect(gradeQuestion(kenya!, 'Kenya')).toBe(false)
    expect(gradeQuestion(kenya!, 'Mount Kenya')).toBe(true)
    expect(gradeQuestion(kenya!, 'Mt. Kenya')).toBe(true)
    expect(gradeQuestion(findAnswer('Mount Everest'), 'everest')).toBe(true)
    const mapKenya = questions.find((item) => item.id === 'q01908')
    expect(gradeQuestion(mapKenya!, 'Kenya')).toBe(false)
  })
})
