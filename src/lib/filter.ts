import type { Entity, Question } from './types'

/**
 * A capital is disputed when the pack note says so: the capital city's status
 * is disputed, capital questions were omitted for that reason, or the entity
 * has no capital and its status is disputed (Jerusalem, Palestine, Western Sahara).
 * Border disputes around an otherwise settled capital are not included.
 */
export function isDisputedCapitalEntity(entity: Entity | undefined): boolean {
  if (!entity) return false
  const note = entity.note ?? ''
  const capital = entity.capital?.trim() ?? ''
  if (/capital questions\b[^.]{0,80}\bomitted/i.test(note)) return true
  if (/status of [\w\s'’-]{1,40} is disputed/i.test(note)) return true
  if (!capital && /disputed/i.test(note)) return true
  return false
}

export function isCapitalQuestion(question: Question): boolean {
  if (question.type === 'capital' || question.type === 'capital_reverse') return true
  if (question.type === 'map_click' && /capital/i.test(question.prompt)) return true
  return false
}

export function playableQuestions(questions: readonly Question[], entities: readonly Entity[]): Question[] {
  const disputed = new Set(entities.filter(isDisputedCapitalEntity).map((entity) => entity.iso2))
  return questions.filter((question) => {
    if (!isCapitalQuestion(question)) return true
    if (question.country_iso2 && disputed.has(question.country_iso2)) return false
    return true
  })
}
