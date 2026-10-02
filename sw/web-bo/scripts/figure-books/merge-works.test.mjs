import test from 'node:test'
import assert from 'node:assert/strict'
import { buildMergeSql, findConflicts, hasArrayReference, SNAPSHOT_TABLES, sqlLiteral } from './lib/merge-work-sql.mjs'
import { planSnapshot, executeMergeFile, checkFixedReferences, remapArrayReferences } from './merge-works.mjs'
const pair = { keep: 'keep', drop: 'drop' }
function fixture() {
  const value = Object.fromEntries(SNAPSHOT_TABLES.map(table => [table, []]))
  value.contents = [{ id: 'keep', type: 'BOOK' }, { id: 'drop', type: 'BOOK' }]
  return value
}
test('회원 중복은 리뷰·평점 같아도 전체 pair 차단', () => {
  const s = fixture(); s.member_contents = [{ id: 'a', member_id: 'm', content_id: 'keep' }, { id: 'b', member_id: 'm', content_id: 'drop' }]
  assert.equal(findConflicts(s, pair), 'member-duplicate-needs-review')
  assert.match(buildMergeSql(pair, s), /no user rows deleted/)
  assert.doesNotMatch(buildMergeSql(pair, s), /DELETE FROM public.member_contents/)
})
test('감상 서로 다른 원문·영문·상태·근거를 보존하려고 차단', () => {
  for (const key of ['review', 'review_en', 'status', 'source_url', 'visibility']) {
    const s = fixture(); s.celeb_contents = [{ id: 'a', celeb_id: 'c', content_id: 'keep', [key]: 'first' }, { id: 'b', celeb_id: 'c', content_id: 'drop', [key]: 'second' }]
    assert.equal(findConflicts(s, pair), `celeb-${key}-needs-review`)
  }
})
test('같은 근거·감상에서 빈 review만 보완 허용', () => {
  const s = fixture(); s.celeb_contents = [{ id: 'a', celeb_id: 'c', content_id: 'keep', source_url: 'source', review: null, status: 'FINISHED' }, { id: 'b', celeb_id: 'c', content_id: 'drop', source_url: 'source', review: 'text', status: 'FINISHED' }]
  assert.equal(findConflicts(s, pair), null)
})
test('동일 목록의 개별 선정 행은 통합을 막지 않고 작품 ID만 이동', () => {
  const s = fixture(); s.curated_list_items = [
    { id: 'first', list_id: 'l', content_id: 'keep', rank: 1, sort_order: 126, raw_title: '첫 원제목', note: '첫 메모' },
    { id: 'second', list_id: 'l', content_id: 'drop', rank: 2, sort_order: 127, raw_title: '둘째 원제목', note: '둘째 메모' },
  ]
  const before = structuredClone(s)
  assert.equal(findConflicts(s, pair), null)
  assert.equal(planSnapshot(s, pair).skip, null)
  const sql = buildMergeSql(pair, s)
  assert.match(sql, /UPDATE public.curated_list_items SET content_id=keep_id WHERE content_id=drop_id;/)
  assert.doesNotMatch(sql, /curated list duplicate|DELETE FROM public.curated_list_items/)
  assert.match(sql, /concurrent change in curated_list_items/)
  assert.match(sql, /<> 2 THEN RAISE EXCEPTION 'MERGE_REVIEW: curated_list_items rows lost'/)
  assert.deepEqual(s, before)
})
test('ISBN 없는 판본끼리 충돌로 판정하지 않음', () => {
  const s = fixture(); s.figure_book_editions = [{ id: 1, locale: 'ko', isbn: null, content_id: 'keep' }, { id: 2, locale: 'ko', isbn: null, content_id: 'drop' }]
  assert.equal(planSnapshot(s, pair).editions[0].collidesWith, null)
  assert.match(buildMergeSql(pair, s), /IF duplicate_edition.isbn IS NOT NULL THEN/)
})
test('SQL guard는 mutation보다 앞이고 모든 실패를 transaction 안에서 처리', () => {
  const sql = buildMergeSql(pair, fixture())
  assert.match(sql, /^\\set ON_ERROR_STOP on\nBEGIN;/)
  assert.match(sql, /END;\n\$merge_work\$;\nCOMMIT;/)
  assert.ok(sql.indexOf('concurrent change') < sql.indexOf('INSERT INTO'))
  assert.ok(sql.indexOf('member duplicate') < sql.indexOf('INSERT INTO'))
  assert.match(sql, /FOR UPDATE/)
  assert.deepEqual(new Set(sql.match(/LOCK TABLE (.+) IN SHARE ROW EXCLUSIVE MODE/)[1].split(', ')), new Set(['public.activity_logs', 'public.faction_lv2', 'public.flow_nodes', 'public.flows', 'public.tier_lists']))
  assert.ok(sql.indexOf('LOCK TABLE') < sql.indexOf('concurrent change'))
  assert.match(sql, /relation_type='authored'.*THEN 'authored'/)
  assert.ok(sql.indexOf('SET is_active=false') < sql.indexOf('SET edition_id=canonical_id'))
  assert.match(sql, /product history lost/)
  assert.match(sql, /unhandled contents FK/)
})

test('서로 다른 티어·미배치에 있는 같은 작품은 사용자 등급을 고르지 않고 차단', () => {
  for (const table of ['flows', 'tier_lists']) {
    const s = fixture(); s[table] = [{ id: 't', tiers: { S: ['keep'], A: ['drop'] } }]
    assert.equal(findConflicts(s, pair), `${table}-rank-needs-review`)
  }
  const s = fixture(); s.tier_lists = [{ id: 't', tiers: { S: ['keep'] }, unranked: ['drop'] }]
  assert.equal(findConflicts(s, pair), 'tier_lists-rank-needs-review')
})

test('자유 티어명과 보너스·미배치 ID 배열은 순서를 유지해 치환', () => {
  assert.deepEqual(remapArrayReferences('flows', { tiers: { '다시 읽기': ['a', 'drop', 'keep', 'b'], D: [] } }, pair), { tiers: { '다시 읽기': ['a', 'keep', 'b'], D: [] } })
  assert.deepEqual(remapArrayReferences('flow_nodes', { bonus_content_ids: ['a', 'drop'] }, pair), { bonus_content_ids: ['a', 'keep'] })
  assert.deepEqual(remapArrayReferences('tier_lists', { tiers: null, unranked: ['drop', 'b'] }, pair), { unranked: ['keep', 'b'] })
})

test('등록된 다섯 배열 참조만 찾아 검수하고 원래 순서와 무관한 중복을 보존', () => {
  const cases = [
    ['flow_nodes', { bonus_content_ids: ['a', 'a', 'drop', 'keep', 'b'] }, { bonus_content_ids: ['a', 'a', 'keep', 'b'] }],
    ['flows', { tiers: { '자유 등급': ['a', 'a', 'drop', 'keep'] } }, { tiers: { '자유 등급': ['a', 'a', 'keep'] } }],
    ['tier_lists', { tiers: { S: ['drop', 'b'] }, unranked: ['a', 'a'] }, { tiers: { S: ['keep', 'b'] } }],
    ['tier_lists', { tiers: { S: ['a', 'a'] }, unranked: ['drop', 'b'] }, { unranked: ['keep', 'b'] }],
    ['faction_lv2', { theme_book_ids: ['a', 'a', 'drop', 'keep', 'b'] }, { theme_book_ids: ['a', 'keep', 'b'] }],
  ]
  for (const [table, row, expected] of cases) {
    const before = structuredClone(row)
    assert.equal(hasArrayReference(table, row, 'drop'), true)
    assert.deepEqual(remapArrayReferences(table, row, pair), expected)
    assert.deepEqual(row, before)
  }
  assert.equal(hasArrayReference('contents', { tiers: { S: ['drop'] } }, 'drop'), false)
})

test('같은 ISBN의 서로 다른 수록 범위와 인물 설명은 자동 덮어쓰기 차단', () => {
  const s = fixture(); s.figure_book_editions = [{ content_id: 'keep', locale: 'ko', isbn: 'same', text_scope: 'volume-1' }, { content_id: 'drop', locale: 'ko', isbn: 'same', text_scope: 'complete' }]
  assert.equal(findConflicts(s, pair), 'edition-text_scope-needs-review')
  s.figure_book_editions = []; s.figure_book_characters = [{ content_id: 'keep', celeb_id: 'c', description: 'first' }, { content_id: 'drop', celeb_id: 'c', description: 'second' }]
  assert.equal(findConflicts(s, pair), 'character-description-needs-review')
})

test('대표 external ISBN만 남아 있는 실제 판본은 메타 확인 없이 삭제하지 않음', () => {
  const s = fixture(); s.contents[1].external_id = '9780192802552'
  assert.equal(findConflicts(s, pair), 'external-isbn-edition-needs-review')
  assert.throws(() => buildMergeSql(pair, s), /external ISBN has no preserved edition/)
  s.figure_book_editions = [{ content_id: 'keep', locale: 'en', isbn: '0192802550' }]
  assert.equal(findConflicts(s, pair), null)
})
test('기존 catalog 없는 감상 작품도 drop의 실판본 ISBN을 keep 아래 보존', () => {
  const sql = buildMergeSql(pair, fixture())
  assert.match(sql, /IF NOT EXISTS\(SELECT 1 FROM public.figure_book_contents WHERE content_id=keep_id\)/)
  assert.match(sql, /THEN l.content_id ELSE keep_id END,l.locale/)
  assert.match(sql, /기존 ISBN 없는 판본은 삭제하지 않는다/)
})
test('양쪽 catalog 없이 같은 ISBN locale을 옮겨도 keep 메타 우선으로 한 번만 삽입', () => {
  const s = fixture()
  s.content_locales = [{ content_id: 'keep', locale: 'ko', isbn: '9788932925929', title: 'Keep' }, { content_id: 'drop', locale: 'ko', isbn: '9788932925929', title: 'Drop' }]
  const sql = buildMergeSql(pair, s)
  assert.match(sql, /ORDER BY CASE WHEN l.content_id=keep_id THEN 0 ELSE 1 END\n    ON CONFLICT \(content_id, locale, isbn\) WHERE isbn IS NOT NULL DO NOTHING/)
})

test('카드 seed는 pair의 기존 실판본부터 확인하고 신규 seed만 원판본 앞에서 제거', () => {
  const s = fixture()
  s.content_locales = [{ content_id: 'keep', locale: 'en', isbn: '9780063391420', title: 'Keeper card' }]
  s.figure_book_editions = [{ id: 7950, content_id: 'drop', locale: 'en', isbn: '9780063391420', title: 'Original edition' }]
  assert.equal(findConflicts(s, pair), null)
  const sql = buildMergeSql(pair, s)
  assert.match(sql, /seeded\.id NOT IN \(E'7950'\)/)
  assert.match(sql, /original\.id IN \(E'7950'\)/)
  assert.match(sql, /NOT EXISTS\(SELECT 1 FROM public\.figure_book_products p WHERE p\.edition_id=seeded\.id\)/)
  assert.match(sql, /NOT EXISTS\(SELECT 1 FROM public\.figure_book_editions e WHERE e\.content_id IN\(keep_id,drop_id\)/)
  assert.ok(sql.indexOf('DELETE FROM public.figure_book_editions seeded') < sql.indexOf('FOR duplicate_edition IN'))
})
test('세력 배열 참조는 원값 백업·잠금·동시변경 검증 후 순서 보존 치환', () => {
  const s = fixture(); s.faction_lv2 = [{ id: 'f', theme_book_ids: ['a', 'drop', 'keep', 'b', 'drop'] }]
  const sql = buildMergeSql(pair, s)
  assert.match(sql, /faction_lv2 WHERE E'drop' = ANY\(theme_book_ids\).*FOR UPDATE/)
  assert.match(sql, /concurrent change in faction_lv2/)
  assert.match(sql, /unnest\(t.theme_book_ids\) WITH ORDINALITY/)
  assert.match(sql, /min\(entry.position\)/)
  assert.match(sql, /array_agg\(mapped_id ORDER BY first_position\)/)
  assert.ok(sql.indexOf('UPDATE public.faction_lv2') < sql.indexOf('DELETE FROM public.contents'))
  assert.match(sql, /residual faction_lv2.theme_book_ids array reference/)
})
test('SQL 값에서 apostrophe·backslash·달러 태그가 실행문으로 나오지 않음', () => {
  assert.equal(sqlLiteral("one'\\two"), "E'one''\\\\two'")
  assert.throws(() => sqlLiteral('bad\0value'))
})
test('psql 오류이면 성공 반환 없고 shell:false·ON_ERROR_STOP 유지', () => {
  const calls = []
  const mock = (command, args, options) => { calls.push({ command, args, options }); return args.at(-1)?.includes('psql') ? { status: 3, stderr: 'ERROR: MERGE_REVIEW rollback' } : { status: 0, stdout: '' } }
  assert.throws(() => executeMergeFile('backup.sql', 'abc-123', mock), /rollback/)
  assert.equal(calls.length, 3)
  assert.equal(calls[2].options.shell, false)
  assert.match(calls[2].args.at(-1), /ON_ERROR_STOP=1/)
  assert.match(calls[0].args.at(-1), /-m 700/)
})
test('감상 원문에 DO 달러 구분자가 있어도 SQL 밖으로 탈출하지 않음', () => {
  const s = fixture(); s.celeb_contents = [{ content_id: 'keep', review: '$merge_work$ DROP TABLE contents;' }]
  const sql = buildMergeSql(pair, s)
  assert.match(sql, /DO \$merge_work_1\$/)
  assert.match(sql, /review.*\$merge_work\$ DROP TABLE contents;/)
})
test('코드·Remotion ID 참조가 있거나 검색 실패하면 mutation 실행 전 차단', () => {
  assert.throws(() => checkFixedReferences(pair, () => ({ status: 0, stdout: 'sw/web/src/lib/faction-theme.ts' })), /drop ID/)
  assert.throws(() => checkFixedReferences(pair, () => ({ status: 2, stderr: 'failure' })), /failure/)
})
