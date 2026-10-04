import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'

const compiled = ts.transpileModule(readFileSync(new URL('./faction-celebs.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

function fixture(ids: string[], failurePage?: number) {
  const calls: { ids: string[]; page: number; limit: number; includeInactive: boolean }[] = []
  const exports: { getFactionCelebs?: (factionId: string, memberIds: string[]) => Promise<{ id: string }[]> } = {}
  const getCelebs = async (params: typeof calls[number]) => {
    calls.push(params)
    return {
      celebs: [...ids.filter(id => params.ids.includes(id)).reverse(), 'unregistered'].map(id => ({ id })),
      error: calls.length === failurePage ? 'DB failure' : null,
    }
  }
  const require = (name: string) => name === '@/actions/home'
    ? { getCelebs }
    : { CELEB_REALITIES: ['REAL', 'BOTH', 'FICTION'] }
  new Function('require', 'exports', compiled)(require, exports)
  return { calls, load: exports.getFactionCelebs! }
}

test('숨김 배정은 요청하지 않고 정확한 ID만 DB 명단 순서로 반환한다', async () => {
  const hidden = Array.from({ length: 350 }, (_, index) => `hidden-${index}`)
  const f = fixture([...hidden, 'second', 'first'])
  assert.deepEqual(await f.load('faction', ['first', 'second', 'first']), [{ id: 'first' }, { id: 'second' }])
  assert.equal(f.calls.length, 1)
  assert.deepEqual(f.calls[0].ids, ['first', 'second'])
  assert.ok(f.calls.every(call => call.includeInactive))
})

test('300명 초과 명단 전원을 중복 없이 반환한다', async () => {
  const ids = Array.from({ length: 425 }, (_, index) => `member-${index}`)
  const f = fixture(ids)
  assert.deepEqual((await f.load('faction', ids)).map(row => row.id), ids)
  assert.equal(f.calls.length, 6)
  assert.ok(f.calls.every(call => call.ids.length <= 75 && call.page === 1 && call.limit === call.ids.length))
  assert.deepEqual(f.calls.flatMap(call => call.ids), ids)
})

test('빈 명단은 조회하지 않는다', async () => {
  const f = fixture(['hidden'])
  assert.deepEqual(await f.load('faction', []), [])
  assert.equal(f.calls.length, 0)
})

test('명단 프로필 누락과 다음 ID 묶음 실패를 부분 성공으로 숨기지 않는다', async () => {
  await assert.rejects(fixture(['present']).load('faction', ['present', 'missing']), /프로필 누락: 1명/)
  const ids = Array.from({ length: 120 }, (_, index) => `member-${index}`)
  await assert.rejects(fixture(ids, 2).load('faction', ids), /DB failure/)
})
