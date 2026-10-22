import type { PlayMode, Progress, Question, QuestionStat, Settings } from './types'
import { registerCompletion, schedule } from './streak'

export const STORAGE_KEY = 'meridian.v1'

export function emptyProgress(): Progress {
  return {
    version: 1,
    streak: { count: 0, best: 0, lastCompleted: null },
    daily: {},
    stats: {},
    mistakes: [],
    settings: { difficulty: 'all', continent: 'all' },
    blitzBest: 0,
  }
}

export function loadProgress(storage: Pick<Storage, 'getItem'>): Progress {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return emptyProgress()
    const parsed = JSON.parse(raw) as Partial<Progress>
    if (parsed.version !== 1 || !parsed.streak || !parsed.settings) return emptyProgress()
    const base = emptyProgress()
    return {
      ...base,
      ...parsed,
      version: 1,
      streak: { ...base.streak, ...parsed.streak },
      settings: { ...base.settings, ...parsed.settings },
      daily: parsed.daily ?? {},
      stats: parsed.stats ?? {},
      mistakes: Array.isArray(parsed.mistakes) ? parsed.mistakes.filter((id) => typeof id === 'string') : [],
      blitzBest: typeof parsed.blitzBest === 'number' ? parsed.blitzBest : 0,
    }
  } catch {
    return emptyProgress()
  }
}

export function saveProgress(storage: Pick<Storage, 'setItem'>, progress: Progress): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(progress))
}

export function patchSettings(progress: Progress, settings: Partial<Settings>): Progress {
  return { ...progress, settings: { ...progress.settings, ...settings } }
}

export function ensureDaily(progress: Progress, date: string, questionIds: string[]): Progress {
  if (progress.daily[date]) return progress
  return {
    ...progress,
    daily: {
      ...progress.daily,
      [date]: { questionIds, answers: [], completed: false },
    },
  }
}

export interface AnswerInput {
  question: Question
  correct: boolean
  guess: string
  date: string
  mode: PlayMode
}

export function applyAnswer(progress: Progress, input: AnswerInput): Progress {
  const id = input.question.id
  if (input.mode === 'daily') {
    const existing = progress.daily[input.date]
    if (existing?.answers.some((answer) => answer.id === id)) return progress
  }
  const next: Progress = {
    ...progress,
    daily: { ...progress.daily },
    stats: { ...progress.stats },
    mistakes: progress.mistakes,
    streak: progress.streak,
  }
  const prev: QuestionStat = next.stats[id] ?? {
    correct: 0,
    wrong: 0,
    box: 0,
    due: input.date,
    last: input.date,
  }
  const booked = schedule(prev.box, input.correct, input.date)
  next.stats[id] = {
    correct: prev.correct + (input.correct ? 1 : 0),
    wrong: prev.wrong + (input.correct ? 0 : 1),
    box: booked.box,
    due: booked.due,
    last: input.date,
  }
  if (input.correct) next.mistakes = next.mistakes.filter((item) => item !== id)
  else next.mistakes = [id, ...next.mistakes.filter((item) => item !== id)].slice(0, 100)

  if (input.mode === 'daily') {
    const rec = next.daily[input.date] ?? {
      questionIds: [id],
      answers: [],
      completed: false,
    }
    const wasComplete = rec.completed
    const answers = [...rec.answers, { id, correct: input.correct, guess: input.guess.slice(0, 200) }]
    const completed = !wasComplete && answers.length >= rec.questionIds.length
    next.daily[input.date] = { ...rec, answers, completed: wasComplete || completed }
    if (completed) next.streak = registerCompletion(next.streak, input.date)
  }
  return next
}

export function recordBlitz(progress: Progress, score: number): Progress {
  if (score <= progress.blitzBest) return progress
  return { ...progress, blitzBest: score }
}

export function clearMistakes(progress: Progress): Progress {
  return { ...progress, mistakes: [] }
}
