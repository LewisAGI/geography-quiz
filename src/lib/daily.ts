import { hashString } from './hash'
import { TYPED_TYPES, type Difficulty, type Question } from './types'

const TYPED = new Set<string>(TYPED_TYPES)

export function dailyQuestions(questions: readonly Question[], date: string, count = 10): Question[] {
  const pool = questions.filter((question) => TYPED.has(question.type))
  const ranked = (list: readonly Question[], salt: string) =>
    [...list].sort((a, b) => {
      const d = hashString(`${date}:${salt}:${a.id}`) - hashString(`${date}:${salt}:${b.id}`)
      return d || a.id.localeCompare(b.id)
    })
  const want: Record<Difficulty, number> = { easy: 3, medium: 4, hard: 3 }
  const picked: Question[] = []
  const used = new Set<string>()
  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    let taken = 0
    for (const question of ranked(
      pool.filter((question) => question.difficulty === difficulty),
      difficulty,
    )) {
      if (taken >= want[difficulty]) break
      picked.push(question)
      used.add(question.id)
      taken += 1
    }
  }
  if (picked.length < count) {
    for (const question of ranked(pool, 'fill')) {
      if (used.has(question.id)) continue
      picked.push(question)
      used.add(question.id)
      if (picked.length >= count) break
    }
  }
  return ranked(picked, 'order').slice(0, count)
}
