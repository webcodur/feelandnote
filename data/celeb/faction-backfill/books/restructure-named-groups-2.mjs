// 세력도감 그룹 재구성 2차 — 「지도자들·수장들」 분류표 이름을 실체 기관명으로 교체
// node --env-file=sw/web-bo/.env data/celeb/faction-backfill/books/restructure-named-groups-2.mjs [--apply]
import { restAll, restGet, headers } from './_rest.mjs'

const APPLY = process.argv.includes('--apply')
const BASE = () => `${process.env.NEXT_PUBLIC_DB_API_URL}/rest/v1`

async function patch(t, id, body, label) {
  if (!APPLY) return console.log(' PATCH', label || id)
  const r = await fetch(`${BASE()}/${t}?id=eq.${id}`, { method: 'PATCH', headers: headers({ Prefer: 'return=representation', 'Content-Type': 'application/json' }), body: JSON.stringify(body) })
  if (!r.ok) console.log(' !ERR', label || id, r.status, await r.text())
}
async function del(t, id, label) {
  if (!APPLY) return console.log(' DELETE', label || id)
  const r = await fetch(`${BASE()}/${t}?id=eq.${id}`, { method: 'DELETE', headers: headers() })
  if (!r.ok) console.log(' !ERR del', label || id, r.status)
}
async function post(t, body, label) {
  if (!APPLY) { console.log(' POST', label || body.name || body.slug); return [{ id: 'dry-' + Math.random().toString(36).slice(2) }] }
  const r = await fetch(`${BASE()}/${t}`, { method: 'POST', headers: headers({ Prefer: 'return=representation', 'Content-Type': 'application/json' }), body: JSON.stringify(body) })
  const d = await r.json()
  if (!r.ok) { console.log(' !ERR post', label, r.status, JSON.stringify(d)); return [] }
  return d
}

const l2s = await restAll('faction_lv2', { select: 'id,slug,name' })
const l3s = await restAll('faction_lv3', { select: 'id,name,lv2_id,sort_order' })
const mem = await restAll('faction_members', { select: 'id,celeb_id,lv2_id,lv3_id' })
const slug2 = new Map(l2s.map((x) => [x.slug, x.id]))
const gmap = new Map(l3s.map((x) => [`${x.lv2_id}|${x.name}`, x.id]))
const cids = [...new Set(mem.map((m) => m.celeb_id))]
const nick2 = new Map()
for (let i = 0; i < cids.length; i += 200) {
  const c = await restGet(`celebs?id=in.(${cids.slice(i, i + 200).join(',')})&select=id,nickname`)
  for (const x of c) nick2.set(x.nickname, x.id)
}

// ── 1) 그룹 개명: 지역 라벨 정직화 + 실체 기관명 ──
const GREN = {
  'world-politics|유럽의 지도자들': ['유럽', 'Europe'],
  'world-politics|아시아의 지도자들': ['아시아', 'Asia'],
  'world-politics|중동과 북아프리카의 지도자들': ['중동과 북아프리카', 'Middle East & North Africa'],
  'world-politics|아프리카의 지도자들': ['아프리카', 'Africa'],
  'world-politics|아메리카의 지도자들': ['아메리카', 'The Americas'],
  'world-politics|오세아니아의 지도자들': ['오세아니아', 'Oceania'],
  'ww2-asia-pacific|중국의 항전 지도자들': ['제2차 국공합작', 'The Second United Front'],
}
for (const [key, [ko, en]] of Object.entries(GREN)) {
  const [fslug, old] = key.split('|')
  const gid = gmap.get(`${slug2.get(fslug)}|${old}`)
  if (!gid) { console.log(' !no group', key); continue }
  await patch('faction_lv3', gid, { name: ko, name_en: en }, `lv3 ${old}→${ko}`)
  gmap.delete(`${slug2.get(fslug)}|${old}`)
  gmap.set(`${slug2.get(fslug)}|${ko}`, gid)
}
// 국공합작 설명 보강
{
  const gid = gmap.get(`${slug2.get('ww2-asia-pacific')}|제2차 국공합작`)
  if (gid) await patch('faction_lv3', gid, {
    description: '일본에 맞서 국민당과 공산당이 손을 잡은 항일 전선이다. 장제스와 마오쩌둥, 총을 겨누던 두 진영이 같은 적 앞에 선 자리다.',
    description_en: 'The anti-Japanese front where Nationalists and Communists joined hands — Chiang Kai-shek and Mao Zedong, two camps that had aimed guns at each other, standing before the same enemy.',
  }, 'lv3 제2차 국공합작 desc')
}

// ── 2) 신규 그룹 (세력|이름|영문|설명ko|설명en) ──
const NEW = {
  'world-politics': [
    ['유럽연합', 'The European Union', '유럽연합의 집행위원장과 정상회의 상임의장, 외교안보 고위대표다. 국가 위에서 움직이는 유럽의 자리들.', 'The presidents of the Commission, the European Council, and the foreign policy office — the seats that move Europe above the states.', 100],
    ['독일 총리', 'Chancellors of Germany', '독일의 총리들이다. 비스마르크의 제국 총리에서 메르켈·숄츠·메르츠의 연방총리까지 한 직위의 계보다.', 'The chancellors of Germany — one office from Bismarck\'s imperial chancellorship to Merkel, Scholz, and Merz.', 101],
    ['영국 총리', 'Prime Ministers of the UK', '영국의 총리들이다. 디즈레일리에서 블레어와 스타머까지 다우닝가의 주인들.', 'The prime ministers of Britain — the occupants of Downing Street from Disraeli to Blair and Starmer.', 102],
    ['나토', 'NATO', '북대서양조약기구의 사무총장들이다.', 'The secretaries-general of NATO.', 103],
    ['일본의 총리들', 'Prime Ministers of Japan', '일본의 내각총리대신들이다. 초대 이토 히로부미에서 오늘의 총리까지 한 직위의 계보다.', 'The prime ministers of Japan — one office from the first, Itō Hirobumi, to the incumbent.', 104],
    ['중국 공산당', 'The Chinese Communist Party', '중국 공산당의 지도부다. 총서기와 정치국 상무위원, 외교를 맡는 사람들이다.', 'The leadership of the Chinese Communist Party — the general secretary, the politburo standing committee, and the foreign office.', 105],
    ['중화민국', 'The Republic of China', '대만의 총통들이다.', 'The presidents of the Republic of China on Taiwan.', 106],
    ['걸프협력회의', 'The Gulf Cooperation Council', '걸프협력회의 여섯 나라의 군주들이다. 사우디와 UAE, 카타르와 쿠웨이트, 오만과 바레인의 옥좌.', 'The monarchs of the six GCC states — the thrones of Saudi Arabia, the Emirates, Qatar, Kuwait, Oman, and Bahrain.', 107],
    ['이스라엘', 'Israel', '이스라엘의 총리와 대통령들이다. 건국자 벤구리온에서 네타냐후까지.', 'The prime ministers and presidents of Israel — from the founder Ben-Gurion to Netanyahu.', 108],
    ['이란', 'Iran', '이란의 최고지도자와 대통령이다.', 'The supreme leader and the president of Iran.', 109],
    ['카리콤', 'CARICOM', '카리브해 공동체 회원국의 정상들이다.', 'The heads of government of the Caribbean Community.', 110],
    ['캐나다', 'Canada', '캐나다의 총리와 야당 지도자다.', 'The prime ministers and the opposition leader of Canada.', 111],
    ['유엔', 'The United Nations', '국제연합의 사무총장과 산하 기구의 수장들이다.', 'The secretaries-general of the UN and the heads of its agencies.', 112],
  ],
  'energy-cartel': [
    ['세븐 시스터스', 'The Seven Sisters', '석유 메이저 일곱을 가리킨 이름이다. 스탠다드 오일의 록펠러, 셸의 사무엘, 엑손의 틸러슨과 우즈 — 세계 석유를 나눈 카르텔의 사람들.', 'The name for the seven oil majors — Rockefeller of Standard Oil, Samuel of Shell, Tillerson and Woods of Exxon: the men of the cartel that divided the world\'s oil.', 100],
    ['OPEC', 'OPEC', '석유수출국기구의 사우디 진영이다. 야마니 장관과 파이살 국왕, 아람코의 나세르 — 산유국의 목소리들이다.', 'The Saudi side of OPEC — Minister Yamani, King Faisal, and Nasser of Aramco: the voices of the oil states.', 101],
  ],
  'logistics-empire': [
    ['DHL', 'DHL', '도이체 포스트 DHL을 이어받아 이끈 경영자들이다.', 'The executives who inherited and ran Deutsche Post DHL.', 100],
    ['UPS', 'UPS', '브라운 유니폼의 UPS를 이어받아 이끈 경영자들이다.', 'The executives who inherited and ran UPS.', 101],
  ],
  'new-hollywood': [
    ['감독들', 'The Directors', '스튜디오 시대를 뒤엎고 뜬 감독들이다.', 'The directors who rose as the studio era collapsed.', 100],
  ],
}
const fidSlug = new Map()
for (const [fslug, gs] of Object.entries(NEW)) {
  for (const [ko, en, dko, den, so] of gs) {
    const fid = slug2.get(fslug)
    let gid = gmap.get(`${fid}|${ko}`)
    if (!gid) {
      const r = await post('faction_lv3', { lv2_id: fid, name: ko, name_en: en, description: dko, description_en: den, sort_order: so }, `lv3 ${fslug}/${ko}`)
      gid = r[0]?.id
      if (gid) gmap.set(`${fid}|${ko}`, gid)
    }
  }
}

// ── 3) 멤버 이동 ──
// 형식: '세력slug|그룹명' → 닉네임 배열. 세력 안의 멤버 행만 건드린다.
const MOVES = {
  'world-politics|유럽연합': ['우르줄라 폰데어라이엔', '안토니우 코스타', '카야 칼라스'],
  'world-politics|독일 총리': ['오토 폰 비스마르크', '앙겔라 메르켈', '올라프 숄츠', '프리드리히 메르츠'],
  'world-politics|영국 총리': ['벤저민 디즈레일리', '토니 블레어', '키어 스타머'],
  'world-politics|나토': ['옌스 스톨텐베르그', '마르크 뤼터'],
  'world-politics|일본의 총리들': ['이토 히로부미', '아베 신조', '스가 요시히데', '기시다 후미오', '이시바 시게루', '다카이치 사나에', '노다 요시히코', '아소 다로'],
  'world-politics|중국 공산당': ['시진핑', '자오러지', '리창', '한정', '왕이'],
  'world-politics|중화민국': ['라이칭더', '마잉주'],
  'world-politics|걸프협력회의': ['무함마드 빈 살만', '모하메드 빈 자이드 알 나얀', '타밈 빈 하마드 알사니', '미샬 알-아마드 알-자베르 알-사바', '하이탐 빈 타리크 알사이드', '하마드 빈 이사 알칼리파'],
  'world-politics|이스라엘': ['베냐민 네타냐후', '시몬 페레스', '다비드 벤구리온'],
  'world-politics|이란': ['알리 하메네이', '마수드 페제시키안'],
  'world-politics|카리콤': ['랠프 곤살베스', '미아 모틀리', '개스턴 브라운', '필립 J. 피에르', '이르판 알리', '찬 산토키'],
  'world-politics|캐나다': ['쥐스탱 트뤼도', '마크 카니', '피에르 푸알리브르'],
  'world-politics|유엔': ['반기문', '안토니우 구테흐스', '테워드로스 아드하놈 거브러이여수스', '라파엘 그로시', '오드레 아줄레', '크리스티아나 피게레스'],
  'energy-cartel|세븐 시스터스': ['존 D. 록펠러', '마커스 사무엘', '렉스 틸러슨', '대런 우즈'],
  'energy-cartel|OPEC': ['셰이크 자키 야마니', '파이살 국왕', '아민 나세르'],
  'logistics-empire|DHL': ['프랑크 아펠', '토비아스 마이어', '클라우스 춤빙켈'],
  'logistics-empire|UPS': ['켄트 넬슨', '마이클 에스큐', '데이비드 애브니'],
  // 뉴 할리우드 통합: 할리우드의 감독 그룹 → 뉴 할리우드 세력의 「감독들」로 이동(lv2_id도 바뀐다)
  'new-hollywood|감독들': ['프랜시스 포드 코폴라', '브라이언 드 팔마', '조지 루카스', '로버트 저메키스', '존 카펜터', '아이번 라이트먼', '론 하워드'],
}
// 세력을 떠나는 이동: '세력slug|직속' → lv3 해제, 'revolutionaries|라틴 아메리카'처럼 다른 세력으로 이동도 지원
const MOVES_CROSS = {
  'revolutionaries|라틴 아메리카': ['투생 루베르튀르'],
}
const UNGROUP = { // 그룹 해제 → 세력 직속
  'world-politics': ['응고지 오콘조이웨알라'],
  'energy-cartel': ['J. 폴 게티', 'H. L. 헌트', '엔리코 마테이'],
  'quantum-computing': ['사티아 나델라', '순다르 피차이', '아르빈드 크리슈나'],
  'the-french-revolution': ['막시밀리앙 드 로베스피에르'],
}

const nomatch = []
let moved = 0
for (const [key, nicks] of Object.entries(MOVES)) {
  const [fslug, gname] = key.split('|')
  const fid = slug2.get(fslug)
  const gid = gmap.get(`${fid}|${gname}`)
  for (const n of nicks) {
    const cid = nick2.get(n)
    // 그 인물의 멤버 행 — 어느 세력에 있든 찾아서 목표 세력·그룹으로 옮긴다
    const row = mem.find((m) => m.celeb_id === cid && (fslug === 'new-hollywood' ? m.lv2_id === slug2.get('hollywood') : m.lv2_id === fid))
    if (!cid || !gid || !row) { nomatch.push(`${key}/${n}`); continue }
    await patch('faction_members', row.id, { lv2_id: fid, lv3_id: gid }, `member ${n}→${gname}`)
    row.lv2_id = fid; row.lv3_id = gid
    moved++
  }
}
for (const [key, nicks] of Object.entries(MOVES_CROSS)) {
  const [fslug, gname] = key.split('|')
  const fid = slug2.get(fslug)
  const gid = gmap.get(`${fid}|${gname}`)
  for (const n of nicks) {
    const cid = nick2.get(n)
    const row = mem.find((m) => m.celeb_id === cid && m.lv2_id === slug2.get('the-french-revolution'))
    if (!cid || !gid || !row) { nomatch.push(`${key}/${n}`); continue }
    await patch('faction_members', row.id, { lv2_id: fid, lv3_id: gid }, `member ${n}→${key}`)
    row.lv2_id = fid; row.lv3_id = gid
    moved++
  }
}
for (const [fslug, nicks] of Object.entries(UNGROUP)) {
  const fid = slug2.get(fslug)
  for (const n of nicks) {
    const cid = nick2.get(n)
    const row = mem.find((m) => m.celeb_id === cid && m.lv2_id === fid)
    if (!row) { nomatch.push(`ungroup ${fslug}/${n}`); continue }
    await patch('faction_members', row.id, { lv3_id: null }, `ungroup ${n}`)
    row.lv3_id = null
    moved++
  }
}

// ── 4) 빈 그룹 삭제 ──
const EMPTY = [
  'world-politics|국제기구의 수장들',
  'energy-cartel|석유 수장들',
  'logistics-empire|제국을 이은 수장들',
  'quantum-computing|빅테크의 수장들',
  'the-french-revolution|혁명의 지도자들',
  'hollywood|뉴 할리우드의 감독들',
]
for (const key of EMPTY) {
  const [fslug, gname] = key.split('|')
  const gid = gmap.get(`${slug2.get(fslug)}|${gname}`)
  if (!gid) { console.log(' !no empty group', key); continue }
  const left = mem.filter((m) => m.lv3_id === gid)
  if (left.length) { console.log(' !not empty', key, left.length); continue }
  await del('faction_lv3', gid, `lv3 ${key}`)
}

console.log(`이동 ${moved}건${nomatch.length ? ' / 미매칭: ' + nomatch.join(', ') : ''} ${APPLY ? '' : '(dry-run)'}`)
