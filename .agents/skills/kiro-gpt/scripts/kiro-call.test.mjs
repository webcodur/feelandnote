import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import {
  DEFAULT_KIRO_MODEL,
  DEFAULT_TOP_LEVEL_CONCURRENCY,
  MAX_INTERNAL_WORKERS_PER_TERMINAL,
  buildKiroArgs,
  resolveKiroPath,
} from './kiro-call.mjs'

const path = resolveKiroPath()
if (process.platform === 'win32') assert.equal(existsSync(path), true)

const args = buildKiroArgs('test prompt', { trustTools: ['read'] })
assert.equal(DEFAULT_KIRO_MODEL, 'gpt-5.6-sol')
assert.equal(DEFAULT_TOP_LEVEL_CONCURRENCY, 2)
assert.equal(MAX_INTERNAL_WORKERS_PER_TERMINAL, 3)
assert.equal(args.includes('--agent-engine'), true)
assert.equal(args.includes('v3'), true)
assert.equal(args.includes('--model'), true)
assert.equal(args.includes('gpt-5.6-sol'), true)
assert.equal(args.includes('--no-interactive'), true)
assert.equal(args.includes('--trust-tools=read'), true)
assert.throws(() => buildKiroArgs('test prompt'), /trustAllTools|trustTools/u)

process.stdout.write('kiro-call helper contract: ok\n')
