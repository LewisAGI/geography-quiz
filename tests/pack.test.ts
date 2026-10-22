import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { gunzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'

const PACK_SHA256 = '8901bc77fffa996e2a960f517c5cad8c4ac79eab41d315c563c906d9e420c61b'

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex')
}

function readTarGz(file: string): Map<string, Buffer> {
  const buf = gunzipSync(readFileSync(file))
  const files = new Map<string, Buffer>()
  let offset = 0
  let longName = ''
  while (offset + 512 <= buf.length) {
    const header = buf.subarray(offset, offset + 512)
    offset += 512
    if (header.every((byte) => byte === 0)) break
    const name = header.subarray(0, 100).toString('utf8').replace(/\0.*$/, '')
    const prefix = header.subarray(345, 500).toString('utf8').replace(/\0.*$/, '')
    const size = parseInt(header.subarray(124, 136).toString('utf8').replace(/\0.*/, '').trim() || '0', 8) || 0
    const typeflag = header[156]
    const data = Buffer.from(buf.subarray(offset, offset + size))
    offset += Math.ceil(size / 512) * 512
    if (typeflag === 76) {
      longName = data.toString('utf8').replace(/\0+$/, '')
      continue
    }
    const full = longName || (prefix ? `${prefix}/${name}` : name)
    longName = ''
    if (typeflag === 0 || typeflag === 48) files.set(full, data)
  }
  return files
}

function walk(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

describe('pack bytes', () => {
  it('matches data/ to the vendored pack byte for byte', () => {
    execFileSync('node', ['scripts/ensure-data.mjs'], { stdio: 'inherit' })
    const packPath = path.resolve('pack/pack-geography-quiz-v1.tgz')
    expect(sha256(readFileSync(packPath))).toBe(PACK_SHA256)
    const archived = readTarGz(packPath)
    const disk = walk(path.resolve('data'))
    expect(disk.length).toBe(archived.size)
    for (const file of disk) {
      const rel = path.relative('data', file).split(path.sep).join('/')
      const fromPack = archived.get(rel)
      expect(fromPack, rel).toBeTruthy()
      const bytes = readFileSync(file)
      expect(sha256(bytes), rel).toBe(sha256(fromPack as Buffer))
      expect(bytes.equals(fromPack as Buffer), rel).toBe(true)
    }
  })
})
