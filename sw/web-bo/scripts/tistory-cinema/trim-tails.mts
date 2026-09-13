/**
 * 감상 끝에 붙은 **꼬리 문장**을 DB 에서 걷어낸다.
 *
 *   node --env-file=.env --import tsx scripts/tistory-cinema/triage.mts --dump 꼬리
 *   node --env-file=.env --import tsx scripts/tistory-cinema/trim-tails.mts        # 미리보기
 *   node --env-file=.env --import tsx scripts/tistory-cinema/trim-tails.mts --yes  # 반영
 *
 * `triage.mts` 가 뽑아 둔 `_triage-꼬리.txt` 를 **사람이 통독하고** 잘라낼 번호를 아래
 * `CUT` 에 적는다. 기계가 자동으로 자르지 않는다 — 「…계기가 됐다」로 끝나도 그 안에
 * 검증 가능한 사실(딸 이름, 진학, 캐스팅)이 들어 있으면 남겨야 한다.
 *
 * 26.09.05 판정: 106건 중 73건이 화자 귀속 없는 해설이었고 33건은 사실이라 남겼다.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { ASSETS } from '../blog-assets.mjs'

const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!)
const DRY = !process.argv.includes('--yes')
const FILE = path.join(ASSETS, 'tistory-cinema', '_triage-꼬리.txt')

/** 통독해서 고른 번호. 파일의 `[n]` 과 같다. */
const CUT = new Set([
  2, 3, 4, 5, 6, 8, 9, 11, 13, 15, 16, 18, 19, 20, 21, 23, 24, 25, 26, 27, 29,
  32, 34, 35, 36, 37, 38, 39, 40, 41, 42, 44, 46, 49, 50, 52, 53, 54, 55, 57,
  58, 59, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 78, 80, 81, 84,
  86, 87, 88, 89, 90, 91, 92, 93, 94, 96, 97, 100, 101, 103,
])

/**
 * 남긴 것들의 이유를 적어 둔다. 다음에 같은 파일을 다시 훑을 때 재판정하지 않게.
 *   1 속편 사실 · 10 실제 일기 인용 · 12 인용과 단정이 한 문장에 섞임 · 14 사인 일화
 *   17 설치작품 사실 · 22 논문 사실 · 28 후속작 사실 · 30 일기 수록 사실 · 31 캐스팅 경위
 *   33 자녀 이름 · 43 어머니 일화 · 45 작품 설명 · 47 팟캐스트 공개 · 48 딸 이름·피아노 구매
 *   51 인용 포함 · 56 출연 이력 · 60 자녀에게 보여줌 · 70 인연 · 72 탐사 프로젝트
 *   76 인용 포함 · 77 학교 입학 · 79 오디션 참가 · 82 배우 출세작 · 83 고교 진학
 *   85 후원 사실 · 95 작품 대응 관계(본인 인정) · 98 관제사와 관람 · 99 장소 연결
 *   102 색스 독서 계기 · 104 목록 구성 사실 · 105 답변 원문 · 106 상황 서술
 */

if (!fs.existsSync(FILE)) throw new Error(`먼저 triage.mts --dump 꼬리 를 돌려라: ${FILE}`)
const blocks = fs.readFileSync(FILE, 'utf8').split(/\n\n(?=\[\d+\])/)

const jobs: { no: number; who: string; work: string; tail: string; id: string }[] = []
for (const b of blocks) {
  const m = b.match(/^\[(\d+)\]\s([\s\S]+?)\s·\s『([\s\S]+?)』\n\s{2}([\s\S]+)\n\s{2}id=([0-9a-f-]+)/)
  if (!m) continue
  const no = Number(m[1])
  if (!CUT.has(no)) continue
  jobs.push({ no, who: m[2], work: m[3], tail: m[4].trim(), id: m[5] })
}
console.log(`잘라낼 것 ${jobs.length}건 (고른 번호 ${CUT.size}개)`)

let ok = 0
let miss = 0
for (const j of jobs) {
  const { data } = await db.from('celeb_contents').select('id, review').eq('id', j.id)
  const cur = (data?.[0]?.review ?? '').trim()
  if (!cur.endsWith(j.tail)) { console.log(`  어긋남 [${j.no}] ${j.who} · 『${j.work}』`); miss++; continue }
  const next = cur.slice(0, cur.length - j.tail.length).trim()
  if (!next) { console.log(`  통째로 비어 버린다 [${j.no}] ${j.who}`); miss++; continue }
  if (!DRY) {
    const { error } = await db.from('celeb_contents').update({ review: next }).eq('id', j.id)
    if (error) throw error
  }
  ok++
  if (ok <= 5 || ok % 20 === 0) console.log(`  [${j.no}] ${j.who} · 『${j.work}』 ${cur.length}→${next.length}자`)
}
console.log(`\n${ok}건 ${DRY ? '처리 예정' : '반영'} · 어긋남 ${miss}건`)
console.log(DRY ? '미리보기다. 실제로 고치려면 --yes 를 붙인다.' : '완료')
