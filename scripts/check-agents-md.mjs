import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const agentsPath = resolve(repoRoot, 'AGENTS.md')
const text = readFileSync(agentsPath, 'utf8')
const normalized = text.replace(/\r\n/g, '\n').replace(/\n$/, '')
const lineCount = normalized.split('\n').length
const byteCount = Buffer.byteLength(text, 'utf8')
const maxLines = 140
const maxBytes = 12 * 1024

const errors = []

if (lineCount > maxLines) {
  errors.push(`AGENTS.md is ${lineCount} lines; maximum is ${maxLines}. Move domain details to docs or skills.`)
}

if (byteCount > maxBytes) {
  errors.push(`AGENTS.md is ${byteCount} bytes; maximum is ${maxBytes}. Move domain details to docs or skills.`)
}

const forbiddenHeadings = [
  '## 레퍼런스',
  '## TODO',
  '## 문서 점검 상태',
  '## 아카이브',
]

for (const heading of forbiddenHeadings) {
  if (normalized.split('\n').includes(heading)) {
    errors.push(`AGENTS.md must not recreate the delegated section: ${heading}`)
  }
}

const requiredRouters = [
  'docs/README.md',
  'docs/project/README.md',
  'docs/todo/README.md',
  'data/celeb/README.md',
]

for (const router of requiredRouters) {
  if (!normalized.includes(router)) {
    errors.push(`AGENTS.md is missing required router: ${router}`)
  }
}

if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}

console.log(`AGENTS.md guard passed: ${lineCount}/${maxLines} lines, ${byteCount}/${maxBytes} bytes`)
