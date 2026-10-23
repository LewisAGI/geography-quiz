import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { StatusNote } from '../src/components/StatusNote'
import { playable, questions } from '../src/lib/catalog'
import { CYPRUS_NOTE, KOSOVO_NOTE, RECOGNITION_NOTES, TAIWAN_NOTE, statusNoteFor } from '../src/lib/recognition'

const EXPECTED: Record<string, string> = {
  q00388: TAIWAN_NOTE,
  q00389: TAIWAN_NOTE,
  q00390: TAIWAN_NOTE,
  q00415: CYPRUS_NOTE,
  q00416: CYPRUS_NOTE,
  q00417: CYPRUS_NOTE,
  q00469: KOSOVO_NOTE,
  q00470: KOSOVO_NOTE,
  q00471: KOSOVO_NOTE,
}

describe('recognition notes', () => {
  it('shows the per-country note on the nine capital questions and on no others', () => {
    expect(TAIWAN_NOTE).toBe("Taiwan's status is disputed; limited formal diplomatic recognition.")
    expect(CYPRUS_NOTE).toBe(
      'Divided city; the north is administered by the Turkish Cypriot authorities, recognised only by Turkey.',
    )
    expect(KOSOVO_NOTE).toBe("Kosovo's independence is not recognised by all UN members, including Serbia.")
    expect(RECOGNITION_NOTES).toEqual(EXPECTED)
    expect(Object.keys(RECOGNITION_NOTES)).toHaveLength(9)

    const noted = new Set<string>()
    for (const question of questions) {
      const html = renderToStaticMarkup(createElement(StatusNote, { question }))
      const expected = EXPECTED[question.id]
      if (expected) {
        noted.add(question.id)
        expect(statusNoteFor(question), question.id).toBe(expected)
        expect(html).toContain('data-testid="status-note"')
        expect(html.replace(/&#x27;/g, "'")).toContain(expected)
        expect(html).not.toContain('Status disputed / limited international recognition.')
      } else {
        expect(statusNoteFor(question), question.id).toBeUndefined()
        expect(html).toBe('')
      }
    }
    expect([...noted].sort()).toEqual(Object.keys(EXPECTED).sort())

    const untouched = ['q00749', 'q00755', 'q01026', 'q01027', 'q01262', 'q01271', 'q01288', 'q01467', 'q01476', 'q01493', 'q01686', 'q01695', 'q01711', 'q00436']
    for (const id of untouched) {
      const question = questions.find((item) => item.id === id)
      expect(question, id).toBeTruthy()
      expect(statusNoteFor(question!)).toBeUndefined()
    }
  })

  it('keeps Taipei, Nicosia, and Pristina questions playable', () => {
    const ids = new Set(playable.map((question) => question.id))
    for (const id of Object.keys(EXPECTED)) expect(ids.has(id)).toBe(true)
  })
})
