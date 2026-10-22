import { addDays, previousDay } from './date'
import type { Streak } from './types'

export function emptyStreak(): Streak {
  return { count: 0, best: 0, lastCompleted: null }
}

export function registerCompletion(streak: Streak, date: string): Streak {
  if (streak.lastCompleted === date) return streak
  const count = streak.lastCompleted === previousDay(date) ? streak.count + 1 : 1
  return {
    count,
    best: Math.max(streak.best, count),
    lastCompleted: date,
  }
}

const GAPS = [0, 1, 3, 7, 16, 35]

export function schedule(box: number, correct: boolean, today: string): { box: number; due: string } {
  if (!correct) return { box: 0, due: today }
  const next = Math.min(5, Math.max(0, box) + 1)
  return { box: next, due: addDays(today, GAPS[next] ?? 35) }
}
