import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { factionVariantsOf, writeFactionVariantsIndex } from './faction-export'

/**
 * 편별 변형 목록 색인(_variants.json) — 렌더 로더가 번들에 묶는 유일한 편 단위 정보다.
 * 컴포지션 ID 접미사(KO-S{n}·KO-LV{n})가 여기서 나오므로, 쇼츠 경계·롱폼 경계를 그대로 읽어야 한다.
 */

const person = (name: string) => ({ name, celebId: `${name}-id`, quote: `${name}의 대사` })

const withCut = {
  title: '시험 편',
  groups: [{
    name: '세력 하나',
    people: [],
    clusters: [
      { label: '앞 장면', people: [person('갑')], beats: [] },
      { label: '뒤 장면', people: [person('을')], beats: [] },
    ],
    sequence: [
      { kind: 'cluster', clusterIndex: 0 },
      { kind: 'cut' },
      { kind: 'cluster', clusterIndex: 1 },
    ],
  }],
}

test('쇼츠 경계가 있으면 편 번호대로, 롱폼 경계가 없으면 통짜 롱폼 하나다', () => {
  const list = factionVariantsOf(withCut)

  assert.deepEqual(list.map(v => v.fileSuffix), ['KO-LV', 'KO-S1', 'KO-S2'])
  assert.deepEqual(list.filter(v => v.isShorts).map(v => v.part), [1, 2])
})

test('경계가 하나도 없으면 통짜 롱폼과 단일 쇼츠만 남는다', () => {
  const list = factionVariantsOf({
    groups: [{
      name: '세력 하나',
      people: [],
      clusters: [{ label: '장면', people: [person('갑')], beats: [] }],
      sequence: [{ kind: 'cluster', clusterIndex: 0 }],
    }],
  })

  assert.deepEqual(list.map(v => v.fileSuffix), ['KO-LV', 'KO-S1'])
})

test('입력 문서를 건드리지 않는다 — 내보내기 체크섬이 어긋나면 안 된다', () => {
  const doc = {
    groups: [{
      name: '세력 하나',
      people: [],
      // sequence·beats 를 비워 두면 편 번호 산출이 정규화를 거친다. 그 결과가 입력에 새면 안 된다.
      clusters: [{ label: '장면', people: [person('갑')] }],
    }],
  }
  const before = JSON.stringify(doc)

  factionVariantsOf(doc)

  assert.equal(JSON.stringify(doc), before)
})

test('색인은 편 자리만 갱신하고, 같은 내용이면 다시 쓰지 않는다', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'faction-variants-'))
  try {
    assert.equal(writeFactionVariantsIndex(dir, 'b-episode', withCut).changed, true)
    assert.equal(writeFactionVariantsIndex(dir, 'a-episode', { groups: [] }).changed, true)
    // 같은 편을 같은 내용으로 다시 써도 파일은 그대로다 — 빌드 감시가 헛돌지 않는다.
    assert.equal(writeFactionVariantsIndex(dir, 'b-episode', withCut).changed, false)

    const raw = readFileSync(path.join(dir, '_variants.json'), 'utf-8')
    const index = JSON.parse(raw) as Record<string, { fileSuffix: string }[]>
    // 키는 정렬돼 있어 어느 편을 먼저 내보내든 파일 내용이 같다.
    assert.deepEqual(Object.keys(index), ['a-episode', 'b-episode'])
    assert.deepEqual(index['b-episode'].map(v => v.fileSuffix), ['KO-LV', 'KO-S1', 'KO-S2'])
    assert.ok(raw.endsWith('\n'))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
