/**
 * 인물에게 얼굴 재료를 하나씩 배정한다. 세 축으로 고른다 — 얼굴 계통·성별·나이대.
 *
 * 규칙
 *   한 얼굴은 한 인물에게만 간다. 배정된 파일은 `지정/`으로 옮기고 풀에서 지운다.
 *   극단 AI형(synthetic=extreme)과 아이 얼굴은 후보에서 뺀다.
 *   관문은 셋이다 — 계통, 성별, 그리고 나이 두 칸(스무 살). 발주서가 나이를 되돌리지만
 *   스무 살이 한계이고 그 이상은 생성기가 못 넘는다(26.09.07). 체구는 있으면 맞추고 없으면 넘긴다.
 *
 * 사용법 (sw/web-bo 에서):
 *   node scripts/photo/assign-faces.mjs [--write]   (--write 없으면 계산만 하고 파일을 안 만든다)
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, copyFileSync, mkdirSync, unlinkSync } from 'fs'
import { join, extname, resolve } from 'path'
import { fileURLToPath } from 'url'

const ROOT = 'D:/image/_재료'
const PINNED = join(ROOT, '지정')
const AGES = ['20s', '30s', '40s', '50s', '60s', '70s', '80s']

/** 국적 → 얼굴 계통 버킷. 국가가 아니라 얼굴이 기준이므로 이웃 문화권을 한 버킷에 넣는다 */
const BUCKET = {
  KR: 'EastAsian', CN: 'EastAsian', JP: 'EastAsian', MN: 'EastAsian', TW: 'EastAsian', VN: 'EastAsian',
  KH: 'SEAsian', TH: 'SEAsian', ID: 'SEAsian', MM: 'SEAsian', PH: 'SEAsian', LA: 'SEAsian', MY: 'SEAsian', BN: 'SEAsian', SG: 'SEAsian',
  IL: 'MiddleEastern', IQ: 'MiddleEastern', IR: 'MiddleEastern', TR: 'MiddleEastern', SA: 'MiddleEastern',
  SY: 'MiddleEastern', JO: 'MiddleEastern', LB: 'MiddleEastern', EG: 'MiddleEastern', AE: 'MiddleEastern',
  PS: 'MiddleEastern', YE: 'MiddleEastern', OM: 'MiddleEastern', KW: 'MiddleEastern', AF: 'MiddleEastern',
  MA: 'MiddleEastern', DZ: 'MiddleEastern', TN: 'MiddleEastern', LY: 'MiddleEastern', MR: 'MiddleEastern',
  IN: 'Indian', NP: 'Indian', LK: 'Indian', PK: 'Indian', BD: 'Indian', BT: 'Indian',
  NG: 'Black', ML: 'Black', UG: 'Black', ZA: 'Black', BJ: 'Black', GH: 'Black', ET: 'Black', SN: 'Black',
  CM: 'Black', TZ: 'Black', KE: 'Black', ZW: 'Black', BF: 'Black', CD: 'Black', SD: 'Black', AO: 'Black',
  ZM: 'Black', RW: 'Black', TD: 'Black', NE: 'Black', GN: 'Black', CI: 'Black', TG: 'Black', SO: 'Black',
  // 아메리카 건국 인물은 전원 콜럼버스 이전 사람이다. 현대 라틴아메리카 스톡(Latino)은
  // 화장·후프귀걸이·살롱 머리의 도시 인물이라 여기에 못 쓴다(26.09.06 검수). Amerind 만 본다.
  MX: 'Amerind', PE: 'Amerind', GT: 'Amerind', CO: 'Amerind', BO: 'Amerind', CL: 'Amerind', BR: 'Amerind',
  EC: 'Amerind', AR: 'Amerind', PY: 'Amerind', VE: 'Amerind', CU: 'Amerind', HN: 'Amerind', NI: 'Amerind',
  // 오세아니아·태평양. 오스트로네시아 계통이라 동남아 얼굴이 가장 가깝다.
  NZ: 'SEAsian', FJ: 'SEAsian', TO: 'SEAsian', WS: 'SEAsian', AU: 'SEAsian',
  // 중앙아시아 튀르크. 유럽이 아니라 동아시아 쪽 얼굴이다.
  KZ: 'EastAsian', KG: 'EastAsian', UZ: 'EastAsian', TM: 'EastAsian', TJ: 'MiddleEastern',
  // 캅카스. 북유럽보다 아나톨리아·레반트에 가깝다.
  AM: 'MiddleEastern', GE: 'MiddleEastern', AZ: 'MiddleEastern',
}
/** 위에 없는 나머지는 전부 유럽 계통으로 본다 */
const DEFAULT_BUCKET = 'white-etc'

/** 국적으로 못 가르는 인물의 문화권 지정 (docs/todo/founding-myth.md) */
const OVERRIDE = {
  mazigh: 'MiddleEastern', 'madghis-al-abtar': 'MiddleEastern',
  'alp-er-tunga': 'EastAsian', 'oghuz-khagan': 'EastAsian', 'yizhi-nishidu': 'EastAsian', nadulu: 'EastAsian',
  rus: 'white-etc', filimer: 'white-etc',
  // 모리타니는 무어인 기준으로 중동에 묶여 있으나 와가두(가나 제국) 건국자는 소닌케족이다.
  'djabe-cisse': 'Black', 'dinga-cisse': 'Black',
}

/** 국적이 US 인 인물은 북미 원주민과 하와이인이 섞여 있어 슬러그로 가른다 */
const US_SPLIT = {
  Amerind: ['deganawidah', 'hiawatha', 'tadodaho', 'sky-woman', 'jigonhsasee', 'white-buffalo-calf-woman'],
  SEAsian: ['hāloa', 'paʻao', 'pilikaʻaiea', 'wākea'],
}
for (const [bucket, slugs] of Object.entries(US_SPLIT)) for (const s of slugs) OVERRIDE[s] = bucket

export const bucketOf = (r) => OVERRIDE[r.slug] || (r.nationality ? (BUCKET[r.nationality] ?? DEFAULT_BUCKET) : DEFAULT_BUCKET)

function main() {
  const write = process.argv.includes('--write')
  const people = JSON.parse(readFileSync('.tmp/brief-targets.json', 'utf-8'))
  const ages = JSON.parse(readFileSync('.tmp/age.json', 'utf-8'))
  const labels = JSON.parse(readFileSync('.tmp/pool-labels.json', 'utf-8'))

  // 이미 나간 얼굴은 파일 이름이 인물 이름이라 원본 파일명으로는 못 찾는다.
  // 대신 지정 폴더의 인물 이름을 모아 두고, 그 인물은 배정에서 건너뛴다.
  const already = new Set()
  if (existsSync(PINNED)) {
    for (const f of readdirSync(PINNED)) already.add(f.replace(extname(f), ''))
  }

  // 후보 얼굴을 (버킷·성별·나이) 로 쌓는다. 시트 태그가 m-EastAsian 꼴이라 거기서 판다
  const pool = {}
  let dropped = 0, stale = 0
  for (const [id, v] of Object.entries(labels)) {
    if (v.age === 'child') { dropped++; continue }   // 아이 얼굴은 어느 인물에게도 안 간다
    // 나이를 모르는 얼굴은 배정하지 않는다. 배정이 풀려 돌아온 얼굴은 라벨이 틀려서 풀린 것이라
    // uncast 가 나이를 비워 두고, 사람이 다시 매긴 뒤에야 후보가 된다(26.09.07).
    if (!v.age) { dropped++; continue }
    const m = id.match(/^([mf])-(.+?)-\d+$/)
    if (!m) continue
    // 배정하면 원본을 지우므로 라벨이 실물보다 오래 산다. 없는 파일을 배정하면
    // 그 인물은 빈손으로 남고 다음 회차가 같은 라벨을 또 집는다 — 여기서 걸러 낸다.
    const sexDir = m[1] === 'f' ? 'female' : 'male'
    if (!existsSync(join(ROOT, sexDir, m[2], v.file))) { stale++; continue }
    const key = `${m[2]}/${m[1]}`
    ;(pool[key] = pool[key] || []).push({ id, ...v, bucket: m[2], sex: m[1] })
  }
  if (stale) console.log(`실물 없는 라벨 ${stale}건 제외`)
  // 극단 AI형은 버리지 않고 뒤로 민다. 계통이 관문이고 AI 티는 그 안에서의 선호다 —
  // 예전처럼 먼저 버렸더니 동아시아 남성 39장 중 32장이 막혀 한국·중국 인물에 유럽 얼굴이 갔다(26.09.07).
  // 씨앗에서 AI 티는 발주서가 덮지만 계통은 남는다.
  for (const list of Object.values(pool)) {
    list.sort((a, b) => (a.synthetic === 'extreme') - (b.synthetic === 'extreme') || a.id.localeCompare(b.id))
  }

  const used = new Set()
  const take = (bucket, sex, wantAge, wantBuild) => {
    const list = pool[`${bucket}/${sex}`] || []
    const wi = AGES.indexOf(wantAge)
    // 두 칸(스무 살)까지만 벌린다. 발주서가 나이를 되돌리기는 하나 스무 살이 한계다 —
    // 그 이상은 생성기가 못 넘는다(26.09.07 유저 판단). 못 찾으면 가까운 계통으로 넘어가고,
    // 거기서도 못 찾으면 빈칸으로 남긴다. 빈칸은 재료를 더 긁어와 채운다.
    for (const spread of [0, 1, 2]) {
      const ok = list.filter(f => !used.has(f.id) && Math.abs(AGES.indexOf(f.age) - wi) <= spread)
      if (!ok.length) continue
      const exact = ok.filter(f => f.build === wantBuild)
      const pick = (exact.length ? exact : ok)[0]
      used.add(pick.id)
      return { face: pick, spread }
    }
    return null
  }

  /**
   * 계통이 가까운 순서. 제 버킷이 마르면 여기 순서로 넘어간다.
   * 발주서의 ANCESTRY 줄이 계통을 다시 못 박으므로 씨앗이 남의 계통이어도 무너지지는 않는다.
   * 다만 골격은 씨앗에서 오므로 가까운 쪽부터 준다 — 먼 계통일수록 모델이 더 많이 고쳐야 한다.
   */
  const NEAR = {
    EastAsian: ['SEAsian', 'Amerind', 'Indian', 'MiddleEastern', 'white-etc', 'white-blonde', 'Black'],
    SEAsian: ['EastAsian', 'Amerind', 'Indian', 'MiddleEastern', 'white-etc', 'white-blonde', 'Black'],
    Amerind: ['EastAsian', 'SEAsian', 'Latino', 'Indian', 'MiddleEastern', 'white-etc', 'white-blonde', 'Black'],
    Indian: ['MiddleEastern', 'SEAsian', 'EastAsian', 'white-etc', 'Black', 'white-blonde', 'Amerind'],
    MiddleEastern: ['Indian', 'white-etc', 'white-blonde', 'SEAsian', 'Black', 'EastAsian', 'Amerind'],
    Black: ['MiddleEastern', 'Indian', 'Latino', 'SEAsian', 'white-etc', 'white-blonde', 'EastAsian'],
    'white-etc': ['white-blonde', 'white-red', 'MiddleEastern', 'Latino', 'Indian', 'EastAsian', 'SEAsian', 'Black'],
    'white-blonde': ['white-etc', 'white-red', 'MiddleEastern', 'Latino', 'Indian', 'EastAsian', 'SEAsian', 'Black'],
  }

  const out = [], unmet = []
  for (const p of people) {
    if (already.has(p.nickname)) continue           // 53명은 이미 배정돼 있다
    const bucket = bucketOf(p)
    const sex = p.gender === false ? 'f' : 'm'
    const a = ages[p.slug]
    if (!a) { unmet.push({ ...p, why: '나이대 없음' }); continue }

    let got = take(bucket, sex, a.age, a.build), from = bucket
    for (const alt of (NEAR[bucket] ?? [])) {
      if (got) break
      got = take(alt, sex, a.age, a.build)
      if (got) from = alt
    }
    if (!got) { unmet.push({ slug: p.slug, nickname: p.nickname, bucket, sex, age: a.age, why: '재고 없음' }); continue }
    out.push({ slug: p.slug, nickname: p.nickname, bucket, sex, wantAge: a.age, wantBuild: a.build,
      faceId: got.face.id, faceAge: got.face.age, faceBuild: got.face.build, file: got.face.file,
      spread: got.spread, seedBucket: from, xbucket: from !== bucket })
  }

  const byBucket = {}
  for (const r of out) {
    const k = `${r.bucket}/${r.sex}`
    byBucket[k] = byBucket[k] || { n: 0, exact: 0 }
    byBucket[k].n++
    if (r.spread === 0) byBucket[k].exact++
  }
  const xb = out.filter(r => r.xbucket)
  console.log(`배정 ${out.length}명 · 이미 배정 ${already.size}명 · 실패 ${unmet.length}명 · 극단 AI형 제외 ${dropped}장`)
  if (xb.length) {
    console.log(`계통을 넘어간 칸 ${xb.length}건 (발주서 ANCESTRY 줄이 다시 못 박는다):`)
    const t = {}
    for (const r of xb) { const k = `${r.seedBucket} → ${r.bucket}`; t[k] = (t[k] || 0) + 1 }
    for (const [k, v] of Object.entries(t).sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(3)}건  ${k}`)
  }
  console.log('버킷별 (나이 정확히 맞은 비율):')
  for (const [k, v] of Object.entries(byBucket).sort()) console.log(`  ${String(v.n).padStart(4)}명  ${k}  나이일치 ${v.exact}`)
  if (unmet.length) {
    const short = {}
    for (const u of unmet) { const k = `${u.bucket}/${u.sex}`; short[k] = (short[k] || 0) + 1 }
    console.log('재고 부족:')
    for (const [k, v] of Object.entries(short).sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(4)}명  ${k}`)
  }

  if (!write) { console.log('\n(계산만 했다. 파일을 만들려면 --write)'); return }
  writeFileSync('.tmp/face-assign.json', JSON.stringify(out, null, 1), 'utf-8')
  writeFileSync('.tmp/face-assign-unmet.json', JSON.stringify(unmet, null, 1), 'utf-8')

  // 원장은 회차마다 덮지 않고 쌓는다. 지정 폴더의 파일명은 인물명이라 원본 출처가 남지 않고,
  // 회차 파일만 두었더니 어느 얼굴이 어느 폴더에서 왔는지 잃어 해시로 역추적해야 했다(26.09.06).
  const LEDGER = '.tmp/face-assign-ledger.json'
  const ledger = existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, 'utf-8')) : []
  // 재배정하면 덮어쓴다. 첫 배정만 남기던 예전 방식은 회차를 거듭할수록 원장이 실물과 어긋나
  // 어느 칸이 계통을 넘어갔는지 알 수 없게 만들었다(26.09.07).
  const at = new Date().toISOString().slice(0, 10)
  const idx = new Map(ledger.map((r, i) => [r.nickname, i]))
  for (const r of out) {
    const e = { ...r, at }
    if (idx.has(r.nickname)) ledger[idx.get(r.nickname)] = e
    else { idx.set(r.nickname, ledger.length); ledger.push(e) }
  }
  writeFileSync(LEDGER, JSON.stringify(ledger, null, 1), 'utf-8')
  console.log(`원장 ${ledger.length}건 → ${LEDGER}`)
  // 지정으로 옮긴 얼굴은 풀에서 뺀다. 복사만 하고 두었더니 다음 회차에 같은 얼굴이 다시 뽑혀
  // 한 얼굴이 세 사람에게까지 갔다(26.09.06: 15장이 37명에게 물림). `used`는 회차 안에서만 산다.
  mkdirSync(PINNED, { recursive: true })
  let moved = 0
  for (const r of out) {
    const sex = r.sex === 'f' ? 'female' : 'male'
    const src = join(ROOT, sex, r.seedBucket ?? r.bucket, r.file)   // 씨앗은 다른 버킷에서 왔을 수 있다
    if (!existsSync(src)) continue
    copyFileSync(src, join(PINNED, `${r.nickname}${extname(r.file)}`))
    unlinkSync(src)
    moved++
  }
  console.log(`\n지정 폴더로 ${moved}장 이동(풀에서 제거) → ${PINNED}`)
}

// 다른 스크립트가 bucketOf 만 가져다 쓸 수 있게, 직접 실행일 때만 돈다.
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main()
