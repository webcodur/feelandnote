import test from 'node:test'
import assert from 'node:assert/strict'
import type { DatabaseClient } from '@feelandnote/db'
import { writeActivityLog, filterActivityBatch, type ActivityLogInput } from './activity-content-reference'

const input: ActivityLogInput = {
  actionType: 'REVIEW_UPDATE', targetType: 'content', targetId: 'historical-member-content-id',
  contentId: '9780192802552', metadata: { rating: { from: 2, to: 4 }, hasReview: true },
}
function fixture({ ids = [] as string[], aliases = [] as string[], lookupError = null as unknown, insertError = null as unknown, insertErrors = [] as unknown[] } = {}) {
  const inserted: Record<string, unknown>[] = [], lookups: [string, string][] = []
  const db = {
    from(table: string) {
      if (table === 'activity_logs') return { insert(row: Record<string, unknown>) { inserted.push(row); return Promise.resolve({ error: insertErrors.length ? insertErrors.shift() : insertError }) } }
      let field = '', value = ''
      const query = {
        select() { return query },
        eq(key: string, id: string) { field = key; value = id; lookups.push([key, id]); return query },
        maybeSingle() { return Promise.resolve({ data: ids.includes(value) ? { id: value } : null, error: lookupError }) },
        limit() { return Promise.resolve({ data: field === 'external_id' ? aliases.map(id => ({ id })) : [], error: lookupError }) },
      }
      return query
    },
  } as unknown as DatabaseClient
  return { db, inserted, lookups }
}

test('유일한 외부 alias는 canonical 작품으로 기록하고 역사 target·metadata를 보존', async () => {
  const f = fixture({ aliases: ['canonical-work-id'] })
  await writeActivityLog(f.db, 'member', input)
  assert.deepEqual(f.inserted, [{ user_id: 'member', action_type: input.actionType, target_type: input.targetType, target_id: input.targetId, content_id: 'canonical-work-id', metadata: { ...input.metadata, historicalContentId: input.contentId } }])
  assert.deepEqual(f.lookups, [['id', input.contentId!], ['external_id', input.contentId!]])
})

test('실제 contents.id는 UUID 모양이 아니어도 현재 참조이며 외부 alias로 재해석하지 않음', async () => {
  const f = fixture({ ids: ['book-registered-id'], aliases: ['different-id'] })
  await writeActivityLog(f.db, 'member', { ...input, contentId: 'book-registered-id' })
  assert.equal(f.inserted[0].content_id, 'book-registered-id')
  assert.equal((f.inserted[0].metadata as Record<string, unknown>).historicalContentId, 'book-registered-id')
  assert.equal(f.lookups.length, 1)
})

test('삭제된 ID나 여러 작품의 alias는 새 책을 만들지 않고 NULL 참조와 역사값을 기록', async () => {
  for (const aliases of [[], ['one', 'two']]) {
    const f = fixture({ aliases })
    const before = structuredClone(input)
    await writeActivityLog(f.db, 'member', input)
    assert.equal(f.inserted[0].content_id, null)
    assert.equal(f.inserted[0].target_id, input.targetId)
    assert.deepEqual(f.inserted[0].metadata, { ...input.metadata, historicalContentId: input.contentId })
    assert.deepEqual(input, before)
  }
})

test('기존 역사 metadata와 작품 없는 활동은 그대로 보존', async () => {
  const f = fixture()
  await writeActivityLog(f.db, 'member', { ...input, metadata: { historicalContentId: 'original-alias', memo: '원문' } })
  assert.deepEqual(f.inserted[0].metadata, { historicalContentId: 'original-alias', memo: '원문' })
  await writeActivityLog(f.db, 'member', { ...input, contentId: undefined, metadata: undefined })
  assert.equal(f.inserted[1].content_id, null)
  assert.equal(f.inserted[1].metadata, null)
})

test('조회 실패를 실제 삭제로 오인해 로그를 쓰지 않으며 insert 실패도 확인', async () => {
  const f = fixture({ lookupError: new Error('unavailable') })
  await assert.rejects(writeActivityLog(f.db, 'member', input), /unavailable/)
  assert.equal(f.inserted.length, 0)
  const failed = fixture({ insertError: new Error('rejected') })
  await assert.rejects(writeActivityLog(failed.db, 'member', input), /rejected/)
})

test('피드는 현재 책이 없는 NULL·삭제 ID를 제외하고 현재 작품의 유형만 사용', () => {
  const activities = [{ id: 'null', content_id: null }, { id: 'removed', content_id: 'deleted' }, { id: 'book', content_id: 'book' }, { id: 'video', content_id: 'video' }]
  const contents = [{ id: 'book', type: 'BOOK' }, { id: 'video', type: 'VIDEO' }]
  assert.deepEqual(filterActivityBatch(activities, contents, null).map(row => row.id), ['book', 'video'])
  assert.deepEqual(filterActivityBatch(activities, contents, 'BOOK').map(row => row.id), ['book'])
  assert.deepEqual(filterActivityBatch(activities, [], null), [])
  assert.equal(activities.length, 4)
})

test('작품이 조회 직후 삭제된 FK race는 역사 원값과 함께 NULL 참조로 기록', async () => {
  const f = fixture({ aliases: ['canonical'], insertErrors: [{ code: '23503', message: 'violates foreign key constraint "activity_logs_content_id_fkey"' }, null] })
  await writeActivityLog(f.db, 'member', input)
  assert.equal(f.inserted.length, 2)
  assert.equal(f.inserted[1].content_id, null)
  assert.equal(f.inserted[1].target_id, input.targetId)
  assert.deepEqual(f.inserted[1].metadata, { ...input.metadata, historicalContentId: input.contentId })
  const other = fixture({ insertError: { code: '23503', message: 'violates foreign key constraint "activity_logs_accounts_fkey"' } })
  await assert.rejects(writeActivityLog(other.db, 'member', input))
  assert.equal(other.inserted.length, 1)
})
