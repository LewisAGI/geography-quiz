import { continentOf, entityFor } from './catalog'
import type { Progress, Question } from './types'

export interface BreakdownRow {
  key: string
  correct: number
  wrong: number
  pct: number
}

export function breakdown(progress: Progress, questions: readonly Question[], group: 'type' | 'continent'): BreakdownRow[] {
  const rows = new Map<string, { correct: number; wrong: number }>()
  for (const question of questions) {
    const stat = progress.stats[question.id]
    if (!stat || stat.correct + stat.wrong === 0) continue
    const key =
      group === 'type' ? question.type : (continentOf(question, entityFor(question)) ?? 'other')
    const row = rows.get(key) ?? { correct: 0, wrong: 0 }
    row.correct += stat.correct
    row.wrong += stat.wrong
    rows.set(key, row)
  }
  return [...rows.entries()]
    .map(([key, value]) => ({
      key,
      correct: value.correct,
      wrong: value.wrong,
      pct: Math.round((100 * value.correct) / (value.correct + value.wrong)),
    }))
    .sort((a, b) => a.pct - b.pct || a.key.localeCompare(b.key))
}
