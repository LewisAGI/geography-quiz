import { entities, entityFor, universe } from './catalog'
import { acceptedFor, answerMatches, normalize } from './match'
import type { Question } from './types'

const ENTITY_NAMES = new Set(entities.map((entity) => normalize(entity.name)).filter(Boolean))

/** "Kenya" is the country, not the answer to "Mount Kenya". "Everest" still matches "Mount Everest". */
function bareCountryPeak(answer: string, guess: string): boolean {
  const stripped = normalize(answer)
  if (!stripped || !ENTITY_NAMES.has(stripped)) return false
  if (normalize(answer, false) === stripped) return false
  if (normalize(guess) !== stripped) return false
  return normalize(guess, false) === stripped
}

export function gradeQuestion(question: Question, guess: string): boolean {
  if (bareCountryPeak(question.answer, guess)) return false
  return answerMatches(guess, acceptedFor(question, entityFor(question)), universe)
}
