import { entities, entityFor, universe } from './catalog'
import { ALIASES, acceptedFor, allowedDistance, answerMatches, levenshtein, normalize } from './match'
import type { Question } from './types'

const COUNTRY_NAMES = new Set<string>()
for (const entity of entities) {
  for (const name of [entity.name, ...(ALIASES[entity.name] ?? [])]) {
    const norm = normalize(name)
    if (norm) COUNTRY_NAMES.add(norm)
  }
}

/**
 * A guess that only matches because a peak prefix strips down to a country name,
 * including a fuzzy spelling of that country. "Mt Kenya" still has the prefix, so it stays.
 */
function rejectsBareCountry(guess: string, accepted: readonly string[]): boolean {
  const guessNorm = normalize(guess)
  if (!guessNorm || normalize(guess, false) !== guessNorm) return false
  let best = Infinity
  let bestLen = 0
  let bestIsCountry = false
  for (const form of accepted) {
    const stripped = normalize(form)
    if (!stripped) continue
    const distance = levenshtein(guessNorm, stripped)
    const isCountry = normalize(form, false) !== stripped && COUNTRY_NAMES.has(stripped)
    if (distance < best) {
      best = distance
      bestLen = stripped.length
      bestIsCountry = isCountry
    } else if (distance === best && isCountry) {
      bestIsCountry = true
      bestLen = stripped.length
    }
  }
  return bestIsCountry && best <= allowedDistance(bestLen)
}

export function gradeQuestion(question: Question, guess: string): boolean {
  const accepted = acceptedFor(question, entityFor(question))
  if (!answerMatches(guess, accepted, universe)) return false
  return !rejectsBareCountry(guess, accepted)
}
