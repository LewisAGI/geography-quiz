import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { StatusNote } from '../src/components/StatusNote'
import { playable, questions } from '../src/lib/catalog'
import { gradeQuestion } from '../src/lib/grade'
import {
  RECOGNITION_COUNTRIES,
  RECOGNITION_NOTES,
  RECOGNITION_QUESTION_IDS,
  STATUS_NOTE,
  statusNoteFor,
} from '../src/lib/recognition'

const countries = new Set<string>(RECOGNITION_COUNTRIES)

/** Alternates written into the pack answer string: slashes and parenthetical lists. */
function packAlternates(answer: string): string[] {
  const forms = new Set<string>()
  const add = (value: string) => {
    const cleaned = value.trim()
    if (cleaned) forms.add(cleaned)
  }
  add(answer)
  const outside = answer.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim()
  add(outside)
  for (const part of outside.split('/')) add(part)
  for (const raw of answer.match(/\([^)]*\)/g) ?? []) {
    for (const piece of raw.slice(1, -1).split(/[,/]/)) add(piece)
  }
  return [...forms]
}

describe('recognition notes', () => {
  it('shows the status note for Taiwan, Kosovo, and Cyprus questions and no others', () => {
    const such = questions.filter((question) => question.country_iso2 && countries.has(question.country_iso2))
    expect(such.map((question) => question.id).sort()).toEqual([...RECOGNITION_QUESTION_IDS].sort())
    for (const iso of RECOGNITION_COUNTRIES) expect(RECOGNITION_NOTES[iso]).toBe(STATUS_NOTE)
    for (const id of RECOGNITION_QUESTION_IDS) expect(RECOGNITION_NOTES[id]).toBe(STATUS_NOTE)
    const allowed = new Set<string>([...RECOGNITION_COUNTRIES, ...RECOGNITION_QUESTION_IDS])
    expect(Object.keys(RECOGNITION_NOTES).sort()).toEqual([...allowed].sort())

    for (const question of questions) {
      const html = renderToStaticMarkup(createElement(StatusNote, { question }))
      if (countries.has(question.country_iso2 ?? '')) {
        expect(statusNoteFor(question)).toBe(STATUS_NOTE)
        expect(html).toContain('data-testid="status-note"')
        expect(html).toContain(STATUS_NOTE)
      } else {
        expect(statusNoteFor(question)).toBeUndefined()
        expect(html).toBe('')
      }
    }
  })

  it('keeps Taipei, Pristina, and Nicosia questions playable', () => {
    const ids = new Set(playable.map((question) => question.id))
    for (const id of ['q00388', 'q00389', 'q00390', 'q00415', 'q00416', 'q00417', 'q00469', 'q00470', 'q00471']) {
      expect(ids.has(id)).toBe(true)
    }
  })

  it('accepts every alternate the pack lists for those questions', () => {
    const subject = questions.filter((question) => countries.has(question.country_iso2 ?? ''))
    expect(subject.length).toBe(RECOGNITION_QUESTION_IDS.length)
    const accepted = new Set<string>()
    for (const question of subject) {
      const forms = packAlternates(question.answer)
      expect(forms.length).toBeGreaterThan(0)
      for (const form of forms) {
        expect(gradeQuestion(question, form), `${question.id} accepts ${form}`).toBe(true)
        accepted.add(form)
      }
      for (const distractor of question.distractors ?? []) {
        expect(gradeQuestion(question, distractor), `${question.id} rejects ${distractor}`).toBe(false)
      }
      expect(gradeQuestion(question, 'zzzznotaplace')).toBe(false)
    }
    for (const form of [
      'Taipei',
      'Taiwan',
      'Nicosia',
      'Lefkosia',
      'Lefkosa',
      'Cyprus',
      'Pristina',
      'Prishtine',
      'Prishtina',
      'Kosovo',
      'Yu Shan',
      'Mount Olympus',
      'Gjeravica',
      'Deravica',
    ]) {
      expect(accepted.has(form)).toBe(true)
    }
  })
})
