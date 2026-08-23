import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MAX_TARGETED_TAGS,
  buildDescriptionContentTags,
  makeRevalidationPlan,
  parseCliOptions,
  selectAllVerifiedPages,
  sendRevalidationTags,
  type CliOptions,
} from './revalidate-filled-lib'

const WEB_ENV = { NEXT_PUBLIC_WEB_URL: 'https://feelandnote.com' }
const UUID_1 = '11111111-1111-4111-8111-111111111111'
const UUID_2 = '22222222-2222-4222-8222-222222222222'

test('type과 locale를 엄격히 검증하고 dry-run은 web 주소 없이 허용한다', () => {
  assert.deepEqual(parseCliOptions(['--type', 'game', '--locale', 'KO', '--dry'], {}), {
    mode: 'targeted',
    type: 'GAME',
    locale: 'ko',
    dry: true,
    webUrl: null,
    allowLargeTargeted: false,
  })

  assert.throws(() => parseCliOptions(['--locale', 'ko', '--dry'], {}), /--type은 필수/)
  assert.throws(() => parseCliOptions(['--type', 'AUDIO', '--locale', 'ko', '--dry'], {}), /--type은 필수/)
  assert.throws(() => parseCliOptions(['--type', 'GAME', '--locale', 'ja', '--dry'], {}), /--locale은 필수/)
  assert.throws(
    () => parseCliOptions(['--type', 'GAME', '--locale', 'ko', '--wat', '--dry'], {}),
    /알 수 없는 옵션/,
  )
  assert.throws(
    () => parseCliOptions(['--type', 'GAME', '--type', 'BOOK', '--locale', 'ko', '--dry'], {}),
    /중복/,
  )
  assert.throws(
    () => parseCliOptions(
      ['--type', 'GAME', '--locale', 'ko', '--web', 'http://example.com'],
      {},
    ),
    /https:\/\/feelandnote\.com만 허용/,
  )
  assert.equal(
    parseCliOptions(
      ['--type', 'GAME', '--locale', 'ko', '--web', 'http://127.0.0.1:3000'],
      {},
    ).webUrl,
    'http://127.0.0.1:3000',
  )
})

test('전체 상세 prefix 퍼지는 별도 확인을 요구하고 type·locale와 섞지 않는다', () => {
  assert.throws(() => parseCliOptions(['--all-details'], WEB_ENV), /--confirm-bulk-purge/)
  assert.throws(
    () => parseCliOptions(['--all-details', '--type', 'BOOK', '--locale', 'en', '--dry'], WEB_ENV),
    /함께 쓸 수 없습니다/,
  )
  assert.deepEqual(
    parseCliOptions(['--all-details', '--confirm-bulk-purge'], WEB_ENV),
    {
      mode: 'all-details',
      dry: false,
      webUrl: 'https://feelandnote.com',
      confirmBulkPurge: true,
    },
  )
  assert.throws(
    () => parseCliOptions(['--all-details', '--confirm-global-purge'], WEB_ENV),
    /폐기.*--confirm-bulk-purge/,
  )
})

test('1,000행 상한을 넘어 exact count까지 전수 조회한다', async () => {
  const source = Array.from({ length: 2_505 }, (_, index) => index)
  const ranges: Array<[number, number]> = []
  const result = await selectAllVerifiedPages(async (from, to) => {
    ranges.push([from, to])
    return { data: source.slice(from, to + 1), error: null, count: source.length }
  })

  assert.equal(result.rows.length, 2_505)
  assert.equal(result.expectedCount, 2_505)
  assert.equal(result.pageCount, 3)
  assert.deepEqual(ranges, [[0, 999], [1_000, 1_999], [2_000, 2_999]])
})

test('중간에 행이 빠지면 부분 조회를 완료로 보지 않는다', async () => {
  await assert.rejects(
    selectAllVerifiedPages(async (from) => ({
      data: from === 0 ? Array.from({ length: 1_000 }, (_, index) => index) : [],
      error: null,
      count: 1_500,
    })),
    /끝나지 않았습니다: 1000\/1500/,
  )
})

test('description 전용 태그는 contents id와 external_id만 중복 없이 만든다', () => {
  const result = buildDescriptionContentTags([
    { content_id: UUID_1, contents: { external_id: 'OL123W' } },
    { content_id: UUID_2, contents: { external_id: null } },
    { content_id: '9791125601487', contents: { external_id: '9791125601487' } },
  ])

  assert.deepEqual(result.contentIds, [UUID_1, UUID_2, '9791125601487'])
  assert.deepEqual(result.externalIds, ['OL123W'])
  assert.deepEqual(result.tags, [
    `contents:${UUID_1}`,
    'contents:OL123W',
    `contents:${UUID_2}`,
    'contents:9791125601487',
  ])
  assert.equal(result.tags.some((tag) => tag.startsWith('celebs:')), false)
})

test('페이지네이션 중복과 정렬 깨짐을 대상 완료로 인정하지 않는다', () => {
  assert.throws(() => buildDescriptionContentTags([
    { content_id: UUID_1, contents: { external_id: null } },
    { content_id: UUID_1, contents: { external_id: null } },
  ]), /content_id가 중복/)
  assert.throws(() => buildDescriptionContentTags([
    { content_id: UUID_2, contents: { external_id: null } },
    { content_id: UUID_1, contents: { external_id: null } },
  ]), /정렬이 깨졌습니다/)
})

test('큰 항목별 퍼지는 확인 없이 막고 전체 모드는 태그 하나로 만든다', () => {
  const targeted: CliOptions = {
    mode: 'targeted',
    type: 'BOOK',
    locale: 'en',
    dry: false,
    webUrl: 'https://feelandnote.com',
    allowLargeTargeted: false,
  }
  const tags = Array.from({ length: MAX_TARGETED_TAGS + 1 }, (_, index) => `contents:item-${index}`)
  assert.throws(() => makeRevalidationPlan(targeted, tags), /퍼지 호출이 너무 큽니다/)

  const plan = makeRevalidationPlan({
    mode: 'all-details',
    dry: false,
    webUrl: 'https://feelandnote.com',
    confirmBulkPurge: true,
  })
  assert.deepEqual(plan, {
    mode: 'all-details',
    tags: ['contents:__all__'],
    estimatedCloudflareUrls: 0,
  })
})

test('all-details 완료 확인은 Cloudflare prefix 모드만 허용한다', async () => {
  const tags = ['contents:__all__']
  let endpoint = ''
  const result = await sendRevalidationTags({
    tags,
    dry: false,
    webUrl: 'https://feelandnote.com',
    secret: 'secret',
    fetchImpl: async (input) => {
      endpoint = String(input)
      return Response.json({
      revalidated: true,
      complete: true,
      tags,
      cloudflare: {
        ok: true,
        status: 'purged',
        mode: 'prefix',
        prefixes: [
          'feelandnote.com/content/',
          'feelandnote.com/en/content/',
          'feelandnote.com/celeb/',
          'feelandnote.com/en/celeb/',
        ],
        urls: [],
      },
      })
    },
  })

  assert.deepEqual(result, { plannedRequests: 1, completedRequests: 1, confirmedTags: 1 })
  assert.equal(endpoint, 'https://feelandnote.com/api/revalidate/v2')
})

test('dry-run은 secret과 HTTP 호출 없이 예정 건수만 계산한다', async () => {
  let calls = 0
  const result = await sendRevalidationTags({
    tags: Array.from({ length: 23 }, (_, index) => `contents:item-${index}`),
    dry: true,
    webUrl: null,
    fetchImpl: async () => {
      calls += 1
      throw new Error('호출되면 안 됨')
    },
  })
  assert.deepEqual(result, { plannedRequests: 1, completedRequests: 0, confirmedTags: 0 })
  assert.equal(calls, 0)
})

test('실실행은 secret을 필수로 요구한다', async () => {
  await assert.rejects(
    sendRevalidationTags({
      tags: ['contents:item-1'],
      dry: false,
      webUrl: 'https://feelandnote.com',
    }),
    /CRON_SECRET/,
  )
})

test('50개씩 보내고 모든 응답 태그가 확인된 경우에만 완료한다', async () => {
  const received: string[][] = []
  const tags = Array.from({ length: 23 }, (_, index) => `contents:item-${index}`)
  const result = await sendRevalidationTags({
    tags,
    dry: false,
    webUrl: 'https://feelandnote.com',
    secret: 'secret',
    fetchImpl: async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as { tag: string[] }
      received.push(body.tag)
      return Response.json({
        revalidated: true,
        complete: true,
        tags: body.tag,
        cloudflare: {
          ok: true,
          status: 'purged',
          mode: 'targeted',
          urls: body.tag.flatMap((tag) => {
            const id = tag.slice('contents:'.length)
            return [
              `https://feelandnote.com/content/${id}`,
              `https://feelandnote.com/en/content/${id}`,
            ]
          }),
        },
      })
    },
  })

  assert.deepEqual(received.map((chunk) => chunk.length), [23])
  assert.deepEqual(result, { plannedRequests: 1, completedRequests: 1, confirmedTags: 23 })
})

test('HTTP 오류와 non-JSON 응답을 실패시킨다', async () => {
  const input = {
    tags: ['contents:item-1'],
    dry: false,
    webUrl: 'https://feelandnote.com',
    secret: 'secret',
  }

  await assert.rejects(
    sendRevalidationTags({
      ...input,
      fetchImpl: async () => Response.json({ error: 'failed' }, { status: 502 }),
    }),
    /HTTP 502/,
  )
  await assert.rejects(
    sendRevalidationTags({
      ...input,
      fetchImpl: async () => new Response('<html>error</html>', { status: 200 }),
    }),
    /JSON을 반환하지 않았습니다/,
  )
})

test('HTTP 200이어도 complete나 Cloudflare 확인이 틀리면 실패시킨다', async () => {
  const run = (body: Record<string, unknown>) => sendRevalidationTags({
    tags: ['contents:item-1'],
    dry: false,
    webUrl: 'https://feelandnote.com',
    secret: 'secret',
    fetchImpl: async () => Response.json(body),
  })

  await assert.rejects(run({
    revalidated: true,
    complete: false,
    tags: ['contents:item-1'],
    cloudflare: { ok: false, status: 'failed', mode: 'targeted', urls: [] },
  }), /완료 응답 계약/)
  await assert.rejects(run({
    revalidated: true,
    complete: true,
    tags: ['contents:item-1'],
    cloudflare: { ok: false, status: 'failed', mode: 'targeted', urls: [] },
  }), /완료 응답 계약/)
  await assert.rejects(run({
    revalidated: true,
    complete: true,
    tags: ['contents:item-1'],
    cloudflare: { ok: true, status: 'purged', mode: 'everything', urls: [] },
  }), /완료 응답 계약/)
  await assert.rejects(run({
    revalidated: true,
    complete: true,
    tags: ['contents:item-1'],
    cloudflare: { ok: true, status: 'not_needed', mode: 'targeted', urls: [] },
  }), /완료 응답 계약/)
  await assert.rejects(run({
    revalidated: true,
    complete: true,
    tags: ['contents:item-1', 'contents:item-1'],
    cloudflare: {
      ok: true,
      status: 'purged',
      mode: 'targeted',
      urls: ['https://feelandnote.com/content/item-1'],
    },
  }), /완료 응답 계약/)
  await assert.rejects(run({
    revalidated: true,
    complete: true,
    tags: ['contents:item-1'],
    cloudflare: {
      ok: true,
      status: 'purged',
      mode: 'targeted',
      urls: ['https://feelandnote.com/content/item-1'],
    },
  }), /완료 응답 계약/)
})
