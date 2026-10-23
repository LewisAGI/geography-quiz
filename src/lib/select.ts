import { continentOf, entityFor, playable, questionById } from './catalog'
import { dailyQuestions } from './daily'
import { seededOrder } from './hash'
import { TYPED_TYPES, type PlayMode, type Progress, type Question, type Settings } from './types'

const TYPED = new Set<string>(TYPED_TYPES)

export function matchesSettings(question: Question, settings: Settings): boolean {
  if (settings.difficulty !== 'all' && question.difficulty !== settings.difficulty) return false
  if (settings.continent !== 'all') {
    if (continentOf(question, entityFor(question)) !== settings.continent) return false
  }
  return true
}

function take(pool: Question[], seed: string, count: number, exclude?: Set<string>): Question[] {
  return seededOrder(
    pool.filter((question) => !exclude?.has(question.id)),
    seed,
    (question) => question.id,
  ).slice(0, count)
}

export function buildQuestions(args: {
  mode: PlayMode
  settings: Settings
  today: string
  seed: string
  dailyIds?: string[]
  mistakeIds?: string[]
  stats?: Progress['stats']
  exclude?: Set<string>
}): Question[] {
  const { mode, settings, today, seed } = args
  if (mode === 'daily') {
    if (args.dailyIds && args.dailyIds.length > 0) {
      const stored = args.dailyIds
        .map((id) => questionById.get(id))
        .filter((question): question is Question => Boolean(question))
      if (stored.length > 0) return stored
    }
    return dailyQuestions(playable, today)
  }
  if (mode === 'review') {
    return (args.mistakeIds ?? [])
      .map((id) => questionById.get(id))
      .filter((question): question is Question => Boolean(question))
      .slice(0, 50)
  }
  if (mode === 'spaced') {
    return seededOrder(
      playable.filter((question) => {
        const stat = args.stats?.[question.id]
        return Boolean(stat && stat.due <= today)
      }),
      today,
      (question) => question.id,
    ).slice(0, 15)
  }
  const filtered = playable.filter((question) => matchesSettings(question, settings))
  if (mode === 'map') return take(filtered.filter((question) => question.type === 'map_click'), seed, 8, args.exclude)
  if (mode === 'flags') return take(filtered.filter((question) => question.type === 'flag'), seed, 10, args.exclude)
  if (mode === 'choices') {
    return take(
      filtered.filter((question) => (question.distractors?.length ?? 0) > 0 && question.type !== 'map_click'),
      seed,
      10,
      args.exclude,
    )
  }
  if (mode === 'duel') return take(filtered.filter((question) => TYPED.has(question.type)), seed, 6, args.exclude)
  if (mode === 'blitz') return take(filtered.filter((question) => TYPED.has(question.type)), seed, 40, args.exclude)
  return take(filtered.filter((question) => TYPED.has(question.type)), seed, mode === 'endless' ? 20 : 10, args.exclude)
}
