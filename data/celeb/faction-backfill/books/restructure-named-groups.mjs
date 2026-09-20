// 실재 이름(기관·방송·왕조·유파) 기반 그룹 재편 — 워싱턴/청와대/SNL/펜타곤 등.
// node --env-file=sw/web-bo/.env data/celeb/faction-backfill/books/restructure-named-groups.mjs [--apply]
import { restAll } from './_rest.mjs'

const APPLY = process.argv.includes('--apply')
const BASE = () => `${process.env.NEXT_PUBLIC_DB_API_URL}/rest/v1`
const KEY = () => process.env.DB_SECRET_KEY
const H = () => ({ apikey: KEY(), Authorization: `Bearer ${KEY()}`, 'Content-Type': 'application/json' })

// 1. 세력 개명
const FREN = {
  'us-politics': ['워싱턴', 'Washington'],
  'south-korean-presidents': ['청와대', 'The Blue House'],
}
// 2. 그룹 개명 'lv2|현재명' → [ko,en]
const GREN = {
  'wild-west|쇼 위의 전설들': ['버팔로 빌의 와일드 웨스트', "Buffalo Bill's Wild West"],
  'wild-west|무법자와 법의 사람들': ['무법자와 보안관들', 'Outlaws and Sheriffs'],
  'lone-conquerors|동아시아의 명장들': ['나라를 구한 명장들', 'The Generals Who Saved Their Nations'],
  'lone-conquerors|근대 전장의 영웅들': ['제2차 세계대전의 영웅들', 'Heroes of WWII'],
  'lone-conquerors|저항하는 전사들': ['아파치와 라코타의 전사들', 'Apache and Lakota Warriors'],
  'great-archaeologists|에게해의 발굴자들': ['트로이와 크노소스', 'Troy and Knossos'],
  'indian-cinema|스크린의 목소리들': ['플레이백 가수들', 'The Playback Singers'],
  'trump-dynasty|백악관': ['트럼프의 백악관', "Trump's White House"],
}
// 3. 신규 그룹: lv2 → [{name,name_en,description,description_en,sort_order}]
const NEW = {
  'us-politics': [
    ['펜타곤', 'The Pentagon', '미국 국방부의 장관과 합참의장, 정보기관 수장들이다.', 'The defense secretaries, chairmen of the Joint Chiefs, and intelligence chiefs of the Pentagon.', 30],
    ['국무부', 'The State Department', '미국 외교를 총괄한 국무장관들이다.', 'The Secretaries of State who ran American diplomacy.', 31],
    ['백악관', 'The White House', '대통령 곁에서 행정부를 움직인 참모와 장관들이다. 국가안보보좌관, 법무장관, FBI 국장 등.', 'The staff and cabinet officials who moved the administration — national security advisors, attorneys general, the FBI director.', 32],
    ['연방대법원', 'The Supreme Court', '미국 연방대법원의 대법관들이다.', 'Justices of the United States Supreme Court.', 33],
    ['폭스 뉴스', 'Fox News', '폭스 뉴스의 간판 진행자들이다.', 'The signature hosts of Fox News.', 40],
    ['CNN과 MSNBC', 'CNN & MSNBC', '케이블 뉴스의 앵커와 논객들이다.', 'Anchors and commentators of cable news.', 41],
    ['인포워즈와 새 보수 매체', 'Infowars and the New Right Media', '인포워즈와 TPUSA, 데일리 와이어 — 기성 방송 밖에서 세를 키운 새 보수 매체의 사람들이다.', 'Infowars, TPUSA, the Daily Wire — the new conservative media that grew outside the old networks.', 42],
  ],
  'hollywood': [
    ['SNL', 'SNL', '새터데이 나이트 라이브를 거쳐간 코미디언들이다.', 'Comedians who passed through Saturday Night Live.', 25],
    ['MCU의 감독들', 'Directors of the MCU', '마블 시네마틱 유니버스의 연출을 맡은 감독들이다.', 'Directors who helmed the Marvel Cinematic Universe.', 51],
    ['뉴 할리우드', 'New Hollywood', '1960년대 말 스튜디오 시대를 뒤엎고 뜬 감독들이다.', 'The directors who overthrew the studio era in the late 1960s.', 52],
    ['A24', 'A24', 'A24의 이름으로 영화를 만든 감독들이다.', 'Directors who made films under the A24 banner.', 53],
  ],
  'exiles': [
    ['나치를 피해 떠난 사람들', 'Those Who Fled the Nazis', '나치와 파시즘의 박해를 피해 유럽을 떠난 사람들이다.', 'Those who left Europe fleeing Nazi and fascist persecution.', 30],
  ],
}
// 4. 멤버 이동: 그룹명 → 닉네임 목록 (같은 lv2 내 이동만)
const MOVES = {
  '펜타곤': ['마크 밀리','로이드 오스틴','피트 헤그세스','제임스 매티스','애슈턴 카터','척 헤이글','로버트 게이츠','데이비드 퍼트레이어스','마크 에스퍼'],
  '국무부': ['매들린 올브라이트','콘돌리자 라이스','콜린 파월','앤터니 블링컨'],
  '백악관': ['존 볼턴','마이클 T. 플린','마이크 왈츠','털시 개버드','리언 패네타','알레한드로 마요르카스','존 미첼','팸 본디','윌리엄 바','에릭 홀더','메릭 갈랜드','로레타 린치','카슈 파텔','칼 로브','켈리앤 콘웨이','스콧 베선트'],
  '연방대법원': ['존 로버츠','서굿 마셜','새뮤얼 알리토','클래런스 토머스','앤터닌 스컬리아','소니아 소토마요르','루스 베이더 긴즈버그','얼 워런','엘레나 케이건','에이미 코니 배럿','커탄지 브라운 잭슨','닐 고서치','브렛 캐버노'],
  '폭스 뉴스': ['터커 칼슨','숀 해니티','메긴 켈리','케일리 매커내니'],
  'CNN과 MSNBC': ['앤더슨 쿠퍼','크리스티안 아만푸어','파리드 자카리아','피어스 모건','레이철 매도','젠 사키'],
  '인포워즈와 새 보수 매체': ['앨릭스 존스','찰리 커크','벤 셔피로','캔디스 오언스'],
  'SNL': ['길다 래드너','댄 애크로이드','존 벨루시','빌 머리','마틴 쇼트','해리 시어러','데이먼 웨이언스','존 로비츠','브라이언 도일머리','마이크 마이어스','크리스 팔리','데이비드 스페이드','케빈 닐런','롭 슈나이더','몰리 섀넌','크리스 파넬','윌 페럴','티나 페이','에이미 폴러','마야 루돌프','프레드 아미슨','빌 헤이더','케이트 매키넌','앤디 샘버그','케넌 톰프슨','크리스틴 위그','크리스 엘리엇'],
  'MCU의 감독들': ['존 패브로','제임스 건','라이언 쿠글러','존 와츠','타이카 와이티티','클로이 자오','페이턴 리드','니아 다코스타','스콧 데릭슨'],
  '뉴 할리우드': ['프랜시스 포드 코폴라','브라이언 드 팔마','조지 루카스','로버트 저메키스','존 카펜터','아이번 라이트먼','론 하워드'],
  'A24': ['로버트 에거스','아리 애스터','션 베이커','배리 젱킨스'],
  '나치를 피해 떠난 사람들': ['한나 아렌트','알버트 아인슈타인','지그문트 프로이트','슈테판 츠바이크','엔리코 페르미','프리츠 하버','마르크 샤갈','안네 프랑크','이고르 스트라빈스키'],
  '동아시아의 패자들': ['유철'],
}

const [l2s, l3s, mem, cel] = await Promise.all([
  restAll('faction_lv2', { select: 'id,slug,name' }),
  restAll('faction_lv3', { select: 'id,lv2_id,name' }),
  restAll('faction_members', { select: 'id,celeb_id,lv2_id,lv3_id' }),
  restAll('celebs', { select: 'id,nickname' }),
])
const slug2 = new Map(l2s.map((f) => [f.slug, f.id]))
const nick2 = new Map(cel.map((c) => [c.nickname, c.id]))
let gmap = new Map(l3s.map((g) => [`${g.lv2_id}|${g.name}`, g.id]))

const patch = async (t, id, body, label) => {
  if (!APPLY) { console.log(' PATCH', label, '→', JSON.stringify(body).slice(0, 80)); return true }
  const r = await fetch(`${BASE()}/${t}?id=eq.${id}`, { method: 'PATCH', headers: { ...H(), Prefer: 'return=minimal' }, body: JSON.stringify(body) })
  if (!r.ok) console.log('ERR', label, r.status, (await r.text()).slice(0, 120))
  return r.ok
}
const post = async (body, label) => {
  if (!APPLY) { console.log(' POST', label, body.name); return `dry-${label}` }
  const r = await fetch(`${BASE()}/faction_lv3`, { method: 'POST', headers: { ...H(), Prefer: 'return=representation' }, body: JSON.stringify(body) })
  if (!r.ok) { console.log('ERR', label, r.status, (await r.text()).slice(0, 200)); return null }
  return (await r.json())[0].id
}

// 1
for (const [slug, [ko, en]] of Object.entries(FREN)) {
  const f = l2s.find((x) => x.slug === slug)
  await patch('faction_lv2', f.id, { name: ko, name_en: en }, `lv2 ${slug}`)
}
// 2
for (const [key, [ko, en]] of Object.entries(GREN)) {
  const [fslug, old] = key.split('|')
  const gid = gmap.get(`${slug2.get(fslug)}|${old}`)
  if (!gid) { console.log('미매칭', key); continue }
  await patch('faction_lv3', gid, { name: ko, name_en: en }, `lv3 ${old}`)
  gmap.delete(`${slug2.get(fslug)}|${old}`)
  gmap.set(`${slug2.get(fslug)}|${ko}`, gid)
}
// 3
for (const [fslug, groups] of Object.entries(NEW)) {
  const fid = slug2.get(fslug)
  for (const [name, name_en, description, description_en, sort_order] of groups) {
    const id = await post({ lv2_id: fid, name, name_en, description, description_en, sort_order }, `${fslug}/${name}`)
    if (id) gmap.set(`${fid}|${name}`, id)
  }
}
// 4
let moved = 0, nomatch = []
for (const [gname, nicks] of Object.entries(MOVES)) {
  const gentry = [...gmap.entries()].find(([k]) => k.endsWith('|' + gname))
  const gid = gentry?.[1]
  const fid = gentry?.[0].split('|')[0]
  for (const n of nicks) {
    const cid = nick2.get(n)
    const row = mem.find((m) => m.celeb_id === cid && m.lv2_id === fid)
    if (!cid || !gid || !row) { nomatch.push(`${gname}/${n}`); continue }
    await patch('faction_members', row.id, { lv3_id: gid }, `member ${n}→${gname}`)
    moved++
  }
}
if (nomatch.length) console.log('미매칭 멤버:', nomatch)
console.log(`이동 ${moved}건${APPLY ? '' : ' (dry-run)'}`)
