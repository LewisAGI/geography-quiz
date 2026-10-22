import { entityFor, universe } from './catalog'
import { acceptedFor, answerMatches } from './match'
import type { Question } from './types'

export function gradeQuestion(question: Question, guess: string): boolean {
  return answerMatches(guess, acceptedFor(question, entityFor(question)), universe)
}
