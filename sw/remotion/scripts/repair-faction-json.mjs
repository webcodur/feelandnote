/**
 * Fix faction-data.json files that accidentally end with literal \n (backslash + n)
 * or other trailing garbage after the root object.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const FAC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/factions')

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      if (ent.name === 'voice' || ent.name === 'node_modules') continue
      walk(p, acc)
    } else if (ent.name === 'faction-data.json') acc.push(p)
  }
  return acc
}

function firstJsonEnd(t) {
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (inStr) {
      if (esc) esc = false
      else if (c === '\\') esc = true
      else if (c === '"') inStr = false
      continue
    }
    if (c === '"') {
      inStr = true
      continue
    }
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

let ok = 0
let fixed = 0
let failed = 0

for (const file of walk(FAC)) {
  const t = fs.readFileSync(file, 'utf8')
  try {
    JSON.parse(t)
    ok++
    continue
  } catch {
    // try first complete object
  }
  const end = firstJsonEnd(t)
  if (end < 0) {
    console.log('FAIL no root', path.relative(FAC, file))
    failed++
    continue
  }
  const head = t.slice(0, end + 1)
  try {
    JSON.parse(head)
    fs.writeFileSync(file, head + '\n', 'utf8')
    JSON.parse(fs.readFileSync(file, 'utf8'))
    console.log('FIXED', path.relative(FAC, file), 'trimmed', t.length - head.length, 'bytes')
    fixed++
  } catch (e) {
    console.log('FAIL', path.relative(FAC, file), e.message)
    failed++
  }
}

console.log({ ok, fixed, failed })
