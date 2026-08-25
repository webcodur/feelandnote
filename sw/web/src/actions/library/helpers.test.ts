import assert from 'node:assert/strict'
import test from 'node:test'
import { fetchUserContentCounts } from './helpers'

test('선택된 콘텐츠가 없으면 전체 회원 수 RPC를 호출하지 않는다', async () => {
  const calls: string[] = []
  const supabase = {
    rpc(name: string) {
      calls.push(name)
      return Promise.resolve({ data: [], error: null })
    },
  } as unknown as Parameters<typeof fetchUserContentCounts>[0]

  const counts = await fetchUserContentCounts(supabase, undefined, [])

  assert.deepEqual(calls, [])
  assert.equal(counts.size, 0)
})

test('선택된 콘텐츠만 범위 집계 RPC로 조회한다', async () => {
  const calls: Array<{ name: string; args: unknown }> = []
  const supabase = {
    rpc(name: string, args: unknown) {
      calls.push({ name, args })
      return Promise.resolve({
        data: [{ content_id: 'content-a', user_count: 3 }],
        error: null,
      })
    },
  } as unknown as Parameters<typeof fetchUserContentCounts>[0]

  const counts = await fetchUserContentCounts(
    supabase,
    undefined,
    ['content-a', 'content-b'],
  )

  assert.deepEqual(calls, [{
    name: 'get_content_celeb_user_counts',
    args: { p_content_ids: ['content-a', 'content-b'] },
  }])
  assert.equal(counts.get('content-a'), 3)
  assert.equal(counts.has('content-b'), false)
})
