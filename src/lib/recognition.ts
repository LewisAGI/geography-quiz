import type { Question } from './types'

/** Neutral line shown with the explanation. The pack text is left unchanged. */
export const STATUS_NOTE = 'Status disputed / limited international recognition.'

/**
 * Country ids the pack keeps. CY is Cyprus, including Nicosia (Lefkosia/Lefkosa).
 * TW is Taiwan (Taipei). XK is Kosovo (Pristina).
 */
export const RECOGNITION_COUNTRIES = ['CY', 'TW', 'XK'] as const

/** Every pack question whose subject country is one of those ids. */
export const RECOGNITION_QUESTION_IDS = [
  'q00388',
  'q00389',
  'q00390',
  'q00415',
  'q00416',
  'q00417',
  'q00469',
  'q00470',
  'q00471',
  'q00749',
  'q00755',
  'q01026',
  'q01027',
  'q01262',
  'q01271',
  'q01288',
  'q01467',
  'q01476',
  'q01493',
  'q01686',
  'q01695',
  'q01711',
] as const

/** Lookup by question id or country id. */
export const RECOGNITION_NOTES: Readonly<Record<string, string>> = Object.fromEntries(
  [...RECOGNITION_COUNTRIES, ...RECOGNITION_QUESTION_IDS].map((id) => [id, STATUS_NOTE]),
)

export function statusNoteFor(question: Pick<Question, 'id' | 'country_iso2'>): string | undefined {
  return RECOGNITION_NOTES[question.id] ?? (question.country_iso2 ? RECOGNITION_NOTES[question.country_iso2] : undefined)
}
