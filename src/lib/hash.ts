export function hashString(value: string): number {
  let h = 2166136261
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function seededOrder<T>(items: readonly T[], seed: string, key: (item: T) => string): T[] {
  return [...items].sort((a, b) => {
    const ka = key(a)
    const kb = key(b)
    const d = hashString(`${seed}:${ka}`) - hashString(`${seed}:${kb}`)
    return d || ka.localeCompare(kb)
  })
}
