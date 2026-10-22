import contentJson from '../../data/geography-quiz/content.json'
import sourcesJson from '../../data/geography-quiz/sources.json'
import { playableQuestions } from './filter'
import { buildUniverse } from './match'
import type { ContentFile, Entity, Question, Source } from './types'

export const content = contentJson as unknown as ContentFile
export const entities: Entity[] = content.entities
export const questions: Question[] = content.questions
export const sources = sourcesJson as unknown as Source[]

export const entityByIso = new Map(entities.map((entity) => [entity.iso2, entity]))
export const sourceById = new Map(sources.map((source) => [source.id, source]))
export const playable = playableQuestions(questions, entities)
export const questionById = new Map(playable.map((question) => [question.id, question]))
export const universe = buildUniverse(questions, entities)

export const CONTINENTS = [
  { id: 'AF', label: 'Africa' },
  { id: 'AN', label: 'Antarctica' },
  { id: 'AS', label: 'Asia' },
  { id: 'EU', label: 'Europe' },
  { id: 'NA', label: 'North America' },
  { id: 'OC', label: 'Oceania' },
  { id: 'SA', label: 'South America' },
] as const

const CONTINENT_NAMES: Record<string, string> = Object.fromEntries(
  CONTINENTS.map((continent) => [continent.label, continent.id]),
)

export function continentOf(question: Question, entity?: Entity): string | undefined {
  if (entity?.continent) return entity.continent
  const match = question.prompt.match(
    /\((?:[^)]*,\s*)?(Africa|Antarctica|Asia|Europe|North America|South America|Oceania)\)/,
  )
  return match ? CONTINENT_NAMES[match[1]] : undefined
}

export function entityFor(question: Question): Entity | undefined {
  return question.country_iso2 ? entityByIso.get(question.country_iso2) : undefined
}
