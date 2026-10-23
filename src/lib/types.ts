export const TYPED_TYPES = [
  'capital',
  'capital_reverse',
  'highest_point',
  'river',
  'border_count',
] as const

export type QuestionType =
  | (typeof TYPED_TYPES)[number]
  | 'map_click'
  | 'flag'
  | 'border'
  | 'population_compare'
  | 'population_band'

export type Difficulty = 'easy' | 'medium' | 'hard'
export type Continent = 'AF' | 'AN' | 'AS' | 'EU' | 'NA' | 'OC' | 'SA'

export interface Entity {
  iso2: string
  iso3: string
  name: string
  continent: string
  capital: string
  capital_latlon: [number, number] | null
  population: number | null
  pop_year: string | number | null
  sources: string[]
  note?: string
}

export interface Question {
  id: string
  type: QuestionType
  prompt: string
  answer: string
  difficulty: Difficulty
  country_iso2?: string
  sources: string[]
  distractors?: string[]
  explanation?: string
  note?: string
  lat?: number
  lon?: number
  tolerance_km?: number
  country2_iso2?: string
  answer_iso2?: string
  flag_image_hint?: string
}

export interface Source {
  id: string
  title: string
  publisher: string
  url: string
  type: string
  note?: string
}

export interface ContentFile {
  schema_version: string
  generated_by: string
  factbook_snapshot: string
  counts: { total: number }
  entities: Entity[]
  questions: Question[]
}

export type DifficultyFilter = 'all' | Difficulty
export type ContinentFilter = 'all' | Continent

export interface Settings {
  difficulty: DifficultyFilter
  continent: ContinentFilter
}

export interface Streak {
  count: number
  best: number
  lastCompleted: string | null
}

export interface DailyAnswer {
  id: string
  correct: boolean
  guess: string
}

export interface DailyRecord {
  questionIds: string[]
  answers: DailyAnswer[]
  completed: boolean
}

export interface QuestionStat {
  correct: number
  wrong: number
  box: number
  due: string
  last: string
}

export interface Progress {
  version: 1
  streak: Streak
  daily: Record<string, DailyRecord>
  stats: Record<string, QuestionStat>
  mistakes: string[]
  settings: Settings
  blitzBest: number
}

export type PlayMode =
  | 'daily'
  | 'endless'
  | 'blitz'
  | 'flags'
  | 'choices'
  | 'spaced'
  | 'pack'
  | 'review'
  | 'duel'
  | 'map'
