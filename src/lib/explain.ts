import { statusNoteFor } from './recognition'
import type { Entity, Question } from './types'

export function explanationFor(question: Question, entity?: Entity): string {
  const written = question.explanation?.trim()
  if (written) return written
  switch (question.type) {
    case 'capital':
      return entity
        ? `${question.answer} is the capital of ${entity.name}.`
        : `${question.answer} is the capital.`
    case 'capital_reverse': {
      const city = question.prompt.split(/ is the capital/i)[0]?.trim()
      return city ? `${city} is the capital of ${question.answer}.` : `${question.answer}.`
    }
    case 'flag':
      return `This flag belongs to ${question.answer}.`
    case 'map_click': {
      const place = question.prompt.replace(/^Click on\s+/i, '').replace(/\.$/, '').trim()
      const sentence = place.endsWith('.') ? place : `${place}.`
      if (question.note && !statusNoteFor(question)) return `${sentence} ${question.note}`
      return sentence
    }
    case 'highest_point':
      return entity
        ? `${question.answer} is the highest point in ${entity.name}.`
        : `${question.answer} is the highest point.`
    case 'river':
      return entity ? `${question.answer} flows through ${entity.name}.` : `${question.answer}.`
    default:
      return question.answer
  }
}
