import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import * as statuses from '../../../../../packages/shared/src/constants/statuses'
import * as memberContentCache from '../../lib/memberContentCache'

function fixture() {
  const record = { id: 'record', content_id: 'work', status: 'WANT', rating: null as number | null,
    review: null as string | null, review_presets: [] as string[] }
  const inserts: Record<string, unknown>[] = []
  const updates: Record<string, unknown>[] = []
  const tags: string[] = []
  const db = {
    auth: { getUser: async () => ({ data: { user: { id: 'member' } } }) },
    from(table: string) {
      let update: Record<string, unknown> | null = null
      const query = {
        select() { return query }, eq() { return query },
        insert(value: Record<string, unknown>) { inserts.push(value); return query },
        update(value: Record<string, unknown>) { updates.push(value); update = value; return query },
        async single() { return { data: { ...record }, error: null } },
        async maybeSingle() { return { data: table === 'contents' ? { id: 'work', type: 'VIDEO' } : null, error: null } },
        then(resolve: (result: unknown) => unknown) {
          if (update) Object.assign(record, update)
          return Promise.resolve({ data: null, error: null }).then(resolve)
        },
      }
      return query
    },
  }
  const mocks: Record<string, unknown> = {
    '@/lib/db/server': { createClient: async () => db },
    'next/cache': { revalidatePath() {}, revalidateTag: (tag: string) => tags.push(tag) },
    '@/actions/activity': { logActivity: async () => {} },
    '@/lib/errors': { success: (data: unknown) => ({ success: true, data }),
      failure: (error: string) => ({ success: false, error }) },
    '@feelandnote/shared/constants/statuses': statuses,
    '@/lib/memberContentCache': memberContentCache,
  }
  const load = (name: string) => {
    const source = ts.transpileModule(readFileSync(new URL(`./${name}.ts`, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText
    const mod = { exports: {} as Record<string, (params: Record<string, unknown>) => Promise<{ success: boolean; data?: unknown }>> }
    new Function('require', 'module', 'exports', source)((key: string) => mocks[key] ?? {}, mod, mod.exports)
    return mod.exports[name]
  }
  return { record, inserts, updates, tags, add: load('addContent'), review: load('updateReview'), status: load('updateStatus') }
}

test('작품 보관은 감상 안함이며 명시한 감상함과 잘못된 입력을 구별한다', async () => {
  const f = fixture()
  const work = { id: 'work', type: 'VIDEO', title: 'Work' }
  assert.ok((await f.add(work)).success)
  assert.equal(f.inserts.at(-1)?.status, 'WANT')
  await f.add({ ...work, status: 'FINISHED' })
  assert.equal(f.inserts.at(-1)?.status, 'FINISHED')
  assert.equal((await f.add({ ...work, status: 'WATCHING' })).success, false)
})

test('감상문 저장과 삭제 뒤 감상 상태를 보존하며 공개 회원 캐시도 갱신한다', async () => {
  const f = fixture()
  const saved = await f.review({ userContentId: 'record', review: '감상문' })
  assert.deepEqual(saved.data, { status: 'FINISHED' })
  assert.equal(f.record.status, 'FINISHED')
  await f.review({ userContentId: 'record', review: null })
  assert.equal(f.record.status, 'FINISHED')
  assert.ok(f.tags.includes(memberContentCache.memberContentCacheTag('member')))
})

test('감상 여부만 바꾸면 기존 별점·감상문을 지우지 않고 잘못된 상태를 거부한다', async () => {
  const f = fixture()
  f.record.review = '보존할 감상문'
  f.record.rating = 4
  assert.ok((await f.status({ userContentId: 'record', status: 'WANT' })).success)
  assert.deepEqual(f.updates.at(-1), { status: 'WANT' })
  assert.equal(f.record.review, '보존할 감상문')
  assert.equal(f.record.rating, 4)
  assert.equal((await f.status({ userContentId: 'record', status: 'DROPPED' })).success, false)
})
