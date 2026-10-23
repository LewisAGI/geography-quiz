import type { Entity, Question } from './types'

const LANGUAGE =
  /\s+in\s+(romanian|russian|french|english|arabic|spanish|portuguese|german|italian|chinese|japanese|dutch|swedish|polish|turkish|greek|hebrew|hindi|local)\w*/gi

const NUMBER_WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
  'twenty',
]

const ALIASES: Record<string, string[]> = {
  'United States': ['USA', 'US', 'U.S.', 'U.S.A.', 'United States of America'],
  'United Kingdom': ['UK', 'U.K.', 'Britain', 'Great Britain'],
  'United Arab Emirates': ['UAE'],
  Czechia: ['Czech Republic'],
  'Ivory Coast': ["Cote d'Ivoire", "Côte d'Ivoire", 'Cote dIvoire'],
  'Cabo Verde': ['Cape Verde'],
  Eswatini: ['Swaziland'],
  Myanmar: ['Burma'],
  'North Macedonia': ['Macedonia'],
  'Timor Leste': ['Timor-Leste', 'East Timor'],
  'The Netherlands': ['Netherlands', 'Holland'],
  Russia: ['Russian Federation'],
  Syria: ['Syrian Arab Republic'],
  Laos: ['Lao PDR'],
  Vietnam: ['Viet Nam'],
  Micronesia: ['Federated States of Micronesia'],
  Brunei: ['Brunei Darussalam'],
  Vatican: ['Vatican City', 'Holy See'],
  Curacao: ['Curaçao'],
  Macao: ['Macau'],
  Turkey: ['Türkiye', 'Turkiye'],
  'Democratic Republic of the Congo': ['DRC', 'DR Congo', 'Congo-Kinshasa'],
  'Republic of the Congo': ['Congo-Brazzaville'],
  'Central African Republic': ['CAR'],
  'Bosnia and Herzegovina': ['Bosnia'],
  'Dominican Republic': ['DR'],
  'U.S. Virgin Islands': ['US Virgin Islands', 'United States Virgin Islands'],
  'British Virgin Islands': ['BVI'],
  'Palestinian Territory': ['Palestine'],
  'Falkland Islands': ['Malvinas', 'Islas Malvinas'],
  'South Korea': ['Republic of Korea'],
  'North Korea': ['DPRK'],
  Moldova: ['Republic of Moldova'],
  Tanzania: ['United Republic of Tanzania'],
  Beijing: ['Peking'],
  'New Delhi': ['Delhi'],
  'Washington, D.C.': ['Washington', 'Washington DC', 'Washington D.C.'],
  'Pic Marguerite on Mont Ngaliema (Mount Stanley)': [
    'Pic Marguerite',
    'Margherita Peak',
    'Mount Stanley',
    'Mont Ngaliema',
    'Pic Marguerite on Mont Ngaliema',
  ],
  'Margherita Peak on Mount Stanley': ['Pic Marguerite', 'Margherita Peak', 'Mount Stanley', 'Mont Ngaliema'],
  'Mount Stanley': ['Pic Marguerite', 'Margherita Peak', 'Mont Ngaliema'],
  'Fako on Mont Cameroun': ['Mont Cameroun', 'Fako on Mont Cameroun'],
  'Dufourspitze on Monte Rosa': ['Monte Rosa', 'Dufourspitze on Monte Rosa'],
  'Laberintos del Norte on Mount Roraima': ['Mount Roraima', 'Laberintos del Norte on Mount Roraima'],
}

/** A shorter leading piece of the country name, such as "South Georgia" inside the longer territory name. */
function isContainingPlace(value: string, entityName: string): boolean {
  const place = value.trim().toLowerCase()
  const entity = entityName.trim().toLowerCase()
  if (!place || !entity || place === entity) return false
  return entity.startsWith(`${place} `) || entity.startsWith(`${place},`)
}

/**
 * A one-word bracket is the place a peak stands on when the answer also says "on …".
 * A one-word alternate such as Sagarmatha, Aoraki, or Denali has no "on" tail and stays.
 */
function isFeatureLocation(value: string, head: string, located: boolean): boolean {
  const word = value.trim()
  if (!located || !word || /\s/.test(word) || !head.trim()) return false
  if (!/\b(pico|pic|mount|mt|mont|gora|peak)\b/i.test(head)) return false
  return !head.toLowerCase().includes(word.toLowerCase())
}

function isQualifier(value: string, head = '', entityName = '', located = false): boolean {
  const text = value.trim()
  if (
    /^(city|highest point|a volcano|located\b|on\b|at\b|administrative|constitutional|legislative|commercial|political|note\b|an\b|the )\b/i.test(
      text,
    )
  ) {
    return true
  }
  if (/\bfor\s+["“]/i.test(text)) return true
  if (isContainingPlace(text, entityName)) return true
  if (isFeatureLocation(text, head, located)) return true
  return text.split(/\s+/).length > 6
}

function stripOnTail(value: string): string {
  return value.replace(/\s+on\s+.+$/i, ' ').replace(/\s+/g, ' ').trim()
}

export function expandAnswer(answer: string, entityName = ''): string[] {
  const out = new Set<string>()
  const add = (value: string) => {
    const cleaned = value.replace(LANGUAGE, ' ').replace(/\s+/g, ' ').trim()
    if (cleaned) out.add(cleaned)
  }
  add(answer)
  for (const part of answer.split(/\s*;\s*/)) add(part)
  const bare = answer.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim()
  add(bare)
  const outside = stripOnTail(bare)
  add(outside)
  const located = /\son\s/i.test(bare)
  if (outside.includes('/')) {
    for (const part of outside.split(/\s*\/\s*/)) add(part)
  }
  for (const raw of answer.match(/\([^)]*\)/g) ?? []) {
    const inner = raw.slice(1, -1).trim()
    if (isQualifier(inner, outside, entityName, located)) continue
    if (/\bis\b/i.test(inner)) {
      const head = inner.split(/\s+is\s+/i)[0] ?? ''
      if (head && head !== inner && !isQualifier(head, outside, entityName, located)) add(head)
    }
    for (const piece of inner.split(/\s*(?:,|\/|\baka\b)\s*/i)) add(piece)
  }
  if (/washington/i.test(answer) && /d\.?\s*c/i.test(answer)) {
    add('Washington')
    add('Washington DC')
  }
  return [...out]
}

export function normalize(raw: string, stripFeature = true): string {
  let s = raw.trim().toLowerCase()
  if (!s) return ''
  s = s.replace(/[æøłđðþßœ]/g, (ch) => {
    const map: Record<string, string> = {
      æ: 'ae',
      ø: 'o',
      ł: 'l',
      đ: 'd',
      ð: 'd',
      þ: 'th',
      ß: 'ss',
      œ: 'oe',
    }
    return map[ch] ?? ch
  })
  s = s.replace(/ı/g, 'i')
  s = s.normalize('NFD').replace(/\p{M}/gu, '')
  s = s.replace(/&/g, ' and ')
  s = s.replace(/\bst\.?\b/g, 'saint')
  s = s.replace(/[.'’"“”,/#!$%^*;:{}=_`~()?\-–—]/g, ' ')
  s = s.replace(/^the\s+/, '')
  if (stripFeature) s = s.replace(/^(mount|mt|gora|pico|mont)\s+(?:de\s+)?/, '')
  s = s.replace(/^(river|rio)\s+/, '')
  s = s.replace(/\s+river$/, '')
  s = s.replace(/\s+/g, ' ').trim()
  return s
}

export function matchKeys(raw: string): string[] {
  const spaced = normalize(raw)
  if (!spaced) return []
  const squashed = spaced.replace(/ /g, '')
  return squashed === spaced ? [spaced] : [spaced, squashed]
}

function allowedDistance(length: number): number {
  if (length <= 4) return 0
  if (length <= 8) return 1
  return 2
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const row = new Array<number>(b.length + 1)
  for (let j = 0; j <= b.length; j++) row[j] = j
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const current = row[j]
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost)
      prev = current
    }
  }
  return row[b.length]
}

export function acceptedFor(question: Question, entity?: Entity): string[] {
  const forms = new Set<string>(expandAnswer(question.answer, entity?.name ?? ''))
  const aliasKey = forms.has(question.answer) ? question.answer : question.answer
  for (const alias of ALIASES[aliasKey] ?? []) forms.add(alias)
  for (const form of [...forms]) {
    for (const alias of ALIASES[form] ?? []) forms.add(alias)
  }
  if (entity && normalize(question.answer) === normalize(entity.name)) {
    for (const alias of ALIASES[entity.name] ?? []) forms.add(alias)
  }
  if (/^\d+$/.test(question.answer.trim())) {
    const word = NUMBER_WORDS[Number(question.answer.trim())]
    if (word) forms.add(word)
  }
  return [...forms]
}

export function answerMatches(guess: string, accepted: readonly string[], universe: ReadonlySet<string>): boolean {
  const guessKeys = matchKeys(guess)
  if (guessKeys.length === 0) return false
  const acceptedNorm = new Set<string>()
  const acceptedKeys = new Set<string>()
  for (const form of accepted) {
    const norm = normalize(form)
    if (norm) acceptedNorm.add(norm)
    for (const key of matchKeys(form)) acceptedKeys.add(key)
  }
  if (guessKeys.some((key) => acceptedKeys.has(key))) return true
  const g = normalize(guess)
  if (!g) return false
  let bestAcc = Infinity
  let bestLen = 0
  for (const form of acceptedNorm) {
    const distance = levenshtein(g, form)
    if (distance < bestAcc) {
      bestAcc = distance
      bestLen = form.length
    }
  }
  if (bestAcc === 0) return true
  if (bestAcc > allowedDistance(bestLen)) return false
  for (const other of universe) {
    if (acceptedNorm.has(other)) continue
    if (Math.abs(other.length - g.length) > bestAcc) continue
    if (levenshtein(g, other) <= bestAcc) return false
  }
  return true
}

export function buildUniverse(questions: readonly Question[], entities: readonly Entity[]): Set<string> {
  const universe = new Set<string>()
  const add = (value: string) => {
    const norm = normalize(value)
    if (norm) universe.add(norm)
  }
  for (const entity of entities) {
    add(entity.name)
    for (const form of expandAnswer(entity.capital || '')) add(form)
    for (const alias of ALIASES[entity.name] ?? []) add(alias)
  }
  for (const question of questions) {
    for (const form of expandAnswer(question.answer)) {
      add(form)
      for (const alias of ALIASES[form] ?? []) add(alias)
    }
    for (const alias of ALIASES[question.answer] ?? []) add(alias)
    for (const distractor of question.distractors ?? []) add(distractor)
  }
  return universe
}
