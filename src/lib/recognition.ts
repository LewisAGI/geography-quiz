import type { Question } from './types'

export const TAIWAN_NOTE = "Taiwan's status is disputed; limited formal diplomatic recognition."
export const CYPRUS_NOTE =
  'Divided city; the north is administered by the Turkish Cypriot authorities, recognised only by Turkey.'
export const KOSOVO_NOTE = "Kosovo's independence is not recognised by all UN members, including Serbia."

/** Capital question ids only. Cyprus, Taiwan, and Kosovo are not inferred from country codes. */
export const RECOGNITION_NOTES: Readonly<Record<string, string>> = {
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

export function statusNoteFor(question: Pick<Question, 'id'>): string | undefined {
  return RECOGNITION_NOTES[question.id]
}
