import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

const pack = 'pack/pack-geography-quiz-v1.tgz'
const listed = execFileSync('tar', ['-tzf', pack], { encoding: 'utf8' })
  .split('\n')
  .map((line) => line.trim())
  .filter((name) => name && !name.endsWith('/'))

const missing = listed.filter((name) => !existsSync(path.join('data', name)))
if (missing.length === 0) {
  process.stdout.write('data/ already matches the pack file list\n')
  process.exit(0)
}

execFileSync('tar', ['-xzf', pack, '-C', 'data', ...missing], { stdio: 'inherit' })
process.stdout.write(`restored ${missing.length} pack file(s) into data/\n`)
