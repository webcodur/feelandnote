import assert from 'node:assert/strict'
import test from 'node:test'
import { findContentIssues, findReasonIssues, personaToRows, type ReasonRow } from './spectrum-reason-check'

const row = (slug: string, axis: string, score: number, reason_ko: string, gender: boolean | null = true): ReasonRow =>
  ({ slug, axis, score, reason_ko, gender })

test('같은 근거문에 다른 점수는 ERROR', () => {
  const issues = findReasonIssues([
    row('a', 'martial', 34, '아이돌 평균 수준의 댄스 체력', false),
    row('b', 'martial', 36, '아이돌 평균 수준의 댄스 체력', false),
  ])
  assert.ok(issues.some(i => i.code === 'score-spread'))
})

test('무력은 성별이 다르면 점수 차이를 보정으로 본다', () => {
  const issues = findReasonIssues([
    row('a', 'martial', 52, '특별한 신체 활동 이력 없는 일반 배우', true),
    row('b', 'martial', 37, '특별한 신체 활동 이력 없는 일반 배우', false),
  ])
  assert.ok(!issues.some(i => i.code === 'score-spread'))
})

test('셋 이상이 공유하면 over-shared, 기본값 문구는 generic', () => {
  const issues = findReasonIssues([
    row('a', 'fairness', 50, '공개된 판단 사례 제한적'),
    row('b', 'fairness', 50, '공개된 판단 사례 제한적'),
    row('c', 'fairness', 50, '공개된 판단 사례 제한적'),
  ])
  assert.ok(issues.some(i => i.code === 'over-shared' && i.slugs.length === 3))
  assert.ok(issues.some(i => i.code === 'generic'))
})

test('두 인물이 4축 넘게 겹치면 pair-overlap, focus로 좁힌다', () => {
  const rows: ReasonRow[] = []
  for (const axis of ['charm', 'command', 'loyalty', 'humility', 'courage']) {
    rows.push(row('asa', axis, 50, `${axis} 개별 행적 문장`), row('ahyeon', axis, 50, `${axis} 개별 행적 문장`))
  }
  rows.push(row('x', 'charm', 60, '전혀 다른 문장'))
  const all = findReasonIssues(rows)
  assert.ok(all.some(i => i.code === 'pair-overlap'))
  const focused = findReasonIssues(rows, new Set(['x']))
  assert.equal(focused.length, 0)
})

test('personaToRows는 빈 근거문을 건너뛴다', () => {
  const rows = personaToRows('s', null, {
    abilities: { command: { score: 30, reason_ko: '팀원', reason_en: 'member' }, martial: { score: 40, reason_ko: '' } },
    rationale_ko: '해설',
  })
  assert.deepEqual(rows.map(r => r.axis), ['command'])
})

test('사적 신상·명의 오귀속·길이·중립대 이탈은 ERROR, 연도 없음은 WARN', () => {
  const issues = findContentIssues([
    row('a', 'temperance', 42, '2025년 무리한 근무로 면역력 저하, 라임병 악화'),
    row('b', 'cautious_bold', 15, '2016 고1 때 부친 반대 무릅쓰고 자퇴, 데뷔조 도전'),
    row('c', 'benevolence', 58, '2024 팬덤이 모아 소아암 환아에 기부'),
    row('d', 'fairness', 43, '2012 데뷔 후 공정 관련 개인 행적 확인 안 됨'),
    row('e', 'charm', 60, '짧다'),
    row('f', 'loyalty', 62, '팀 활동에 성실히 임하는 모습'),
  ], { yearWarning: true, strictFloor: true })
  const codes = (slug: string) => issues.filter(i => i.slugs[0] === slug).map(i => i.code)
  assert.ok(codes('a').includes('private-info'))
  assert.ok(codes('b').includes('private-info'))
  assert.ok(codes('c').includes('proxy-credit'))
  assert.ok(codes('d').includes('floor'))
  assert.ok(codes('e').includes('length'))
  assert.ok(codes('f').includes('no-year'))
  assert.equal(issues.filter(i => i.code === 'no-year' && i.slugs[0] === 'a').length, 0)
})

test('대리 기부는 표현이 달라도 잡고, 팬을 끌어모은 서술은 잡지 않는다', () => {
  const bad = findContentIssues([
    row('a', 'benevolence', 58, '2024 팬덤 이름으로 소아암 환아에 기부'),
    row('b', 'benevolence', 58, '2023 팬클럽이 모아 보호소에 성금 전달'),
  ])
  assert.equal(bad.filter(i => i.code === 'proxy-credit').length, 2)
  const ok = findContentIssues([row('c', 'charm', 70, '2019 희소성 있는 협업으로 팬덤을 끌어모았다')])
  assert.equal(ok.filter(i => i.code === 'proxy-credit').length, 0)
})

test('배역 준비로 몸을 만든 사실은 사적 신상이 아니다', () => {
  const issues = findContentIssues([
    row('skg', 'martial', 60, '2004 역도산 위해 20kg 증량, 레슬링 훈련 소화'),
    row('psj', 'temperance', 60, '2023 콘크리트 유토피아 위해 7kg 감량, 훈련 일정 완주'),
  ])
  assert.equal(issues.filter(i => i.level === 'ERROR').length, 0)
})

test('근거 없음 문구라도 중립대 안이면 통과한다', () => {
  const issues = findContentIssues([row('x', 'fairness', 50, '2012 데뷔 후 공정 관련 개인 행적 확인 안 됨')])
  assert.equal(issues.filter(i => i.code === 'floor').length, 0)
})

test('「확인 안 됨」 문구는 여럿이 같아도 복제로 잡지 않는다', () => {
  const issues = findReasonIssues([
    row('a', 'fairness', 50, '2009년 데뷔 후 공정 관련 개인 행적 확인 안 됨'),
    row('b', 'fairness', 50, '2009년 데뷔 후 공정 관련 개인 행적 확인 안 됨'),
    row('c', 'fairness', 49, '2009년 데뷔 후 공정 관련 개인 행적 확인 안 됨'),
  ])
  assert.equal(issues.filter(i => i.level === 'ERROR').length, 0)
  assert.ok(issues.some(i => i.code === 'generic'))
})
