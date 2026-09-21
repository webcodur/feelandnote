// 세력도감 그룹 재구성 3차 — 실재 집단(기구·동맹·가문·극단·운동)으로 분화
// 출연·캐스팅 결은 별개 데이터 파이프로 — 도감에는 실재 집단만 둔다
// node --env-file=sw/web-bo/.env data/celeb/faction-backfill/books/restructure-named-groups-3.mjs [--apply]
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

// ── 1) 신규 그룹 ──
const NEW = {
  'world-politics': [
    ['유럽의 왕실', 'The Royal Houses of Europe', '유럽의 현직 군주들과 역사 속 왕비들이다. 찰스와 빌럼알렉산더르, 펠리페의 옥좌다.', 'The reigning monarchs of Europe and the queens of history — the thrones of Charles, Willem-Alexander, and Felipe.', 113],
    ['비세그라드 그룹', 'The Visegrád Group', '폴란드·헝가리·체코·슬로바키아 네 나라의 중부유럽 협의체다.', 'The Central European alliance of Poland, Hungary, Czechia, and Slovakia.', 114],
    ['베네룩스', 'Benelux', '벨기에·네덜란드·룩셈부르크의 정상과 지도자들이다.', 'The leaders of Belgium, the Netherlands, and Luxembourg.', 115],
    ['발트 3국', 'The Baltic States', '리투아니아·라트비아·에스토니아의 대통령과 총리들이다.', 'The presidents and prime ministers of Lithuania, Latvia, and Estonia.', 116],
    ['서발칸', 'The Western Balkans', 'EU 가입을 앞둔 서발칸 여섯 나라의 정상들이다.', 'The leaders of the six Western Balkan states awaiting EU accession.', 117],
    ['남코카서스', 'The South Caucasus', '아르메니아·조지아·아제르바이잔의 정상들이다.', 'The leaders of Armenia, Georgia, and Azerbaijan.', 118],
    ['북유럽', 'The Nordic Countries', '노르딕 다섯 나라의 정상들이다. 노르웨이·스웨덴·덴마크·핀란드·아이슬란드.', 'The leaders of the five Nordic states — Norway, Sweden, Denmark, Finland, Iceland.', 119],
    ['아일랜드', 'Ireland', '아일랜드의 대통령과 총리들이다.', 'The presidents and prime ministers of Ireland.', 120],
    ['아세안', 'ASEAN', '동남아시아국가연합 회원국의 정상들이다.', 'The leaders of the ASEAN member states.', 121],
    ['남아시아', 'South Asia', '인도·파키스탄·방글라데시·네팔·스리랑카·몰디브·부탄의 정상들이다.', 'The leaders of India, Pakistan, Bangladesh, Nepal, Sri Lanka, the Maldives, and Bhutan.', 122],
    ['중앙아시아', 'Central Asia', '옛 소련에서 독립한 다섯 나라의 대통령들이다.', 'The presidents of the five post-Soviet states.', 123],
    ['아랍 연맹', 'The Arab League', '아랍 연맹 회원국의 정상들이다.', 'The leaders of the Arab League member states.', 124],
    ['서아프리카 경제공동체', 'ECOWAS', '서아프리카 경제공동체 회원국의 정상들이다.', 'The leaders of the Economic Community of West African States.', 125],
    ['남아프리카 개발공동체', 'SADC', '남아프리카 개발공동체 회원국의 정상들이다.', 'The leaders of the Southern African Development Community.', 126],
    ['동아프리카 공동체', 'The EAC', '동아프리카 공동체 회원국의 정상들이다.', 'The leaders of the East African Community.', 127],
    ['중앙아프리카 경제공동체', 'CEMAC', '중앙아프리카 경제·통화공동체 회원국의 정상들이다.', 'The leaders of the Central African Economic and Monetary Community.', 128],
    ['아프리카의 뿔', 'The Horn of Africa', '에티오피아·지부티 등 아프리카 북동부의 지도자들이다.', 'The leaders of Ethiopia, Djibouti, and the Horn of Africa.', 129],
    ['호주', 'Australia', '오스트레일리아의 총리들이다.', 'The prime ministers of Australia.', 130],
    ['태평양 제도', 'The Pacific Islands', '태평양 섬나라의 정상들이다.', 'The leaders of the Pacific island states.', 131],
  ],
  'indian-cinema': [
    ['카푸르 가문', 'The Kapoor Family', '프리스비라지에서 라지와 샴미와 샤시, 리시와 카리스마와 카리나와 란비르까지 — 4대를 이어온 발리우드의 연기 왕조다.', 'Four generations of Bollywood\'s acting dynasty — from Prithviraj to Raj, Shammi, and Shashi, to Rishi, Karisma, Kareena, and Ranbir.', 100],
    ['데올 가문', 'The Deol Family', '다르멘드라와 헤마 말리니가 일군 가문이다. 써니와 바비, 에샤와 조카 아바이까지.', 'The house built by Dharmendra and Hema Malini — Sunny and Bobby, Esha, and nephew Abhay.', 101],
    ['바찬 가문', 'The Bachchan Family', '아미타브와 자야, 아비셱 — 발리우드의 가장 유명한 가문이다.', 'Amitabh and Jaya, and Abhishek — Bollywood\'s most famous family.', 102],
    ['칸 삼인방', 'The Three Khans', '샤루크와 살만과 아미르 — 1990년대 이후 발리우드를 지탱해 온 세 칸이다.', 'Shah Rukh, Salman, and Aamir — the three Khans who have carried Bollywood since the 1990s.', 103],
    ['무케르지 가문', 'The Mukherjee Family', '타누자와 그녀의 딸 카졸과 타니샤, 사촌 라니 — 벵골 영화 가문의 계보다.', 'Tanuja and her daughters Kajol and Tanisha, and cousin Rani — a Bengali film dynasty.', 104],
    ['라자몰리 사단', 'The Rajamouli Troupe', '바후발리와 RRR을 함께 만든 감독과 배우들이다.', 'The director and the actors who made Baahubali and RRR together.', 105],
  ],
  'european-cinema': [
    ['잉마르 베리만의 배우들', 'Bergman\'s Actors', '베리만의 레퍼토리 극단이다. 그의 영화를 떠받친 스웨덴 배우들이다.', 'Bergman\'s repertory company — the Swedish actors who carried his films.', 100],
    ['스카르스고르드 가', 'The Skarsgård Family', '스텔란과 그의 아들들이다. 스웨덴의 연기 가문.', 'Stellan and his sons — Sweden\'s acting dynasty.', 101],
    ['신독일영화', 'New German Cinema', '1960~70년대 독일 영화를 되살린 감독들과 그들의 배우들이다.', 'The directors and their actors who revived German cinema in the 1960s and 70s.', 102],
  ],
  'hollywood': [
    ['SCTV', 'SCTV', '토론토 세컨드 시티의 텔레비전 쇼다. 캐나다 코미디의 사관학교였다.', 'Second City Television out of Toronto — the academy of Canadian comedy.', 100],
    ['웨이언스 형제들', 'The Wayans Brothers', '인 리빙 컬러를 만든 코미디 가문의 형제들이다.', 'The brothers of the comedy family behind In Living Color.', 101],
  ],
}
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

// ── 2) 멤버 이동 (같은 세력 안에서 그룹만 바꾼다) ──
const MOVES = {
  'world-politics|유럽의 왕실': ['찰스 3세', '빌럼알렉산더르', '펠리페 6세', '세르비아의 나탈리예', '드라가 마신'],
  'world-politics|비세그라드 그룹': ['오르반 빅토르', '슈요크 터마시', '안드레이 바비시', '페트르 파벨', '로베르트 피초', '페테르 펠레그리니', '도날트 투스크', '안제이 두다'],
  'world-politics|베네룩스': ['딕 스호프', '헤이르트 빌더르스', '알렉산더르 더크로', '바르트 더 베버르', '뤼크 프리덴'],
  'world-politics|발트 3국': ['기타나스 나우세다', '긴타우타스 팔루츠카스', '에드가르스 링케비치', '에비카 실리냐', '알라르 카리스', '크리스텐 미할'],
  'world-politics|서발칸': ['에디 라마', '알빈 쿠르티', '비오사 오스마니', '야코브 밀라토비치', '밀로이코 스파이치', '젤카 츠비야노비치', '젤리코 콤시치', '알렉산다르 부치치', '흐리스티얀 미츠코스키', '고르다나 실리아노프스카다프코바'],
  'world-politics|남코카서스': ['니콜 파시냔', '바하그 하차투랸', '미헤일 카벨라슈빌리', '살로메 주라비슈빌리', '이라클리 코바히제', '일함 알리예프'],
  'world-politics|북유럽': ['요나스 가르 스퇴레', '그로 할렘 브룬틀란', '울프 크리스테르손', '메테 프레데릭센', '알렉산데르 스투브', '할라 토마스도티르', '카트린 야콥스도티르', '크리스트룬 프로스타도티르'],
  'world-politics|아일랜드': ['미할 마틴', '마이클 D. 히긴스', '메리 로빈슨', '사이먼 해리스'],
  'world-politics|아세안': ['패통탄 친나왓', '세타 타위신', '훈 마넷', '조코 위도도', '프라보워 수비안토', '봉봉 마르코스', '로런스 웡', '리콴유', '안와르 이브라힘', '손사이 시판돈', '또럼'],
  'world-politics|남아시아': ['나렌드라 모디', '드라우파디 무르무', '라훌 간디', '셰바즈 샤리프', '임란 칸', '아시프 알리 자르다리', '셰이크 하시나', '카드가 프라사드 샤르마 올리', '람 찬드라 파우델', '하리니 아마라수리야', '아누라 쿠마라 디사나야카', '모하메드 무이주', '이브라힘 모하메드 솔리', '체링 톱게', '지그메 케사르 남기엘 왕축', '시드케옹 툴쿠 남갈'],
  'world-politics|중앙아시아': ['사디르 자파로프', '샤브카트 미르지요예프', '세르다르 베르디무하메도프', '에모말리 라흐몬', '카심조마르트 토카예프'],
  'world-politics|아랍 연맹': ['압둘팟타흐 시시', '무함마드 울드가즈와니', '압델마지드 테분', '아흐마드 알샤라', '카이스 사이에드', '나지브 미카티', '압둘라 2세', '압둘 라티프 라시드', '압델 하미드 드베이바', '모하메드 알멘피', '모하메드 시아 알수다니', '조지프 아운', '압델 파타 알부르한', '마흐무드 압바스'],
  'world-politics|서아프리카 경제공동체': ['볼라 티누부', '굿럭 조너선', '올루세군 오바산조', '존 드라마니 마하마', '알라산 우아타라', '조지프 보아카이', '바시루 디오마이 파이', '줄리어스 마다 비오', '마마디 둠부야', '우마로 시소코 엠발로', '포르 냐싱베'],
  'world-politics|남아프리카 개발공동체': ['시릴 라마포사', '하카인데 히칠레마', '마이클 사타', '에머슨 음낭가과', '두마 보코', '모퀘치 마시시', '네툼보 난디은다이트와', '주앙 로렌수', '안드리 라조엘리나', '나빈 람굴람', '프라빈드 주그노트', '와벨 람칼라완', '음스와티 3세', '레치에 3세', '펠릭스 치세케디', '사미아 술루후', '아잘리 아수마니'],
  'world-politics|동아프리카 공동체': ['요웨리 무세베니', '윌리엄 루토', '폴 카가메', '하산 셰흐 마하무드', '살바 키르 마야르디트'],
  'world-politics|중앙아프리카 경제공동체': ['폴 비야', '드니 사수 응게소', '브리스 올리기 응게마', '테오도로 오비앙 응게마 음바소고', '마하마트 데비 이트노'],
  'world-politics|아프리카의 뿔': ['아비 아머드', '타예 아츠케 셀라시에', '이야수 5세', '이스마일 오마르 겔레'],
  'world-politics|호주': ['케빈 러드', '앤서니 앨버니지'],
  'world-politics|태평양 제도': ['아노테 통', '힐다 하이네'],
  'indian-cinema|카푸르 가문': ['프리스비라지 카푸르', '라지 카푸르', '샴미 카푸르', '샤시 카푸르', '리시 카푸르', '카리스마 카푸르', '카리나 카푸르', '란비르 카푸르'],
  'indian-cinema|데올 가문': ['다르멘드라', '헤마 말리니', '써니 데올', '바비 데올', '에샤 데올', '아바이 데올'],
  'indian-cinema|바찬 가문': ['아미타브 바찬', '자야 바찬', '아비셱 바찬'],
  'indian-cinema|칸 삼인방': ['샤루크 칸', '살만 칸', '아미르 칸'],
  'indian-cinema|무케르지 가문': ['타누자', '카졸', '타니샤 무케르지', '라니 무케르지'],
  'indian-cinema|라자몰리 사단': ['S. S. 라자몰리', '프라바스', 'N. T. 라마 라오 주니어', '람 차란', '아누슈카 셰티', '타마나 바티아'],
  'european-cinema|잉마르 베리만의 배우들': ['막스 폰 쉬도브', '비비 안데르손', '하리에트 안데르손', '리브 울만', '잉리드 툴린', '엘란드 요세프손', '군넬 린드블롬'],
  'european-cinema|스카르스고르드 가': ['스텔란 스카르스고르드', '알렉산데르 스카르스고르드', '구스타프 스카르스고르드', '빌 스카르스고드'],
  'european-cinema|신독일영화': ['라이너 베르너 파스빈더', '베르너 헤어초크', '빔 벤더스', '폴커 슐뢴도르프', '알렉산더 클루게', '마르가레테 폰 트로타', '하나 쉬굴라', '바르바라 수코바'],
  'hollywood|SCTV': ['유진 레비', '조 플래허티', '앤드리아 마틴', '존 캔디', '릭 머래니스', '캐서린 오하라'],
  'hollywood|웨이언스 형제들': ['키넨 아이보리 웨이언스', '숀 웨이언스', '말런 웨이언스', '데이먼 웨이언스'],
}
// 이중배정: 기존 소속을 유지한 채 행을 하나 더 만든다 (전량 hidden)
const DUAL = {
  'hollywood|SCTV': ['마틴 쇼트'],
}
// 그룹 해제 → 세력 직속
const UNGROUP = {
  'world-politics': ['메이지 천황', '캐리 람', '레제프 타이이프 에르도안'],
}

const nomatch = []
let moved = 0, added = 0
for (const [key, nicks] of Object.entries(MOVES)) {
  const [fslug, gname] = key.split('|')
  const fid = slug2.get(fslug)
  const gid = gmap.get(`${fid}|${gname}`)
  for (const n of nicks) {
    const cid = nick2.get(n)
    const row = mem.find((m) => m.celeb_id === cid && m.lv2_id === fid)
    if (!cid || !gid || !row) { nomatch.push(`${key}/${n}`); continue }
    await patch('faction_members', row.id, { lv3_id: gid }, `member ${n}→${gname}`)
    row.lv3_id = gid
    moved++
  }
}
for (const [key, nicks] of Object.entries(DUAL)) {
  const [fslug, gname] = key.split('|')
  const fid = slug2.get(fslug)
  const gid = gmap.get(`${fid}|${gname}`)
  for (const n of nicks) {
    const cid = nick2.get(n)
    const exists = mem.some((m) => m.celeb_id === cid && m.lv3_id === gid)
    if (!cid || !gid || exists) { nomatch.push(`dual ${key}/${n}`); continue }
    const r = await post('faction_members', { celeb_id: cid, lv2_id: fid, lv3_id: gid, hidden: true }, `dual ${n}→${gname}`)
    if (r[0]?.id) { mem.push({ id: r[0].id, celeb_id: cid, lv2_id: fid, lv3_id: gid }); added++ }
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

// ── 3) 빈 그룹 삭제 ──
const EMPTY = [
  'world-politics|아시아',
  'world-politics|중동과 북아프리카',
  'world-politics|아프리카',
  'world-politics|오세아니아',
]
for (const key of EMPTY) {
  const [fslug, gname] = key.split('|')
  const gid = gmap.get(`${slug2.get(fslug)}|${gname}`)
  if (!gid) { console.log(' !no empty group', key); continue }
  const left = mem.filter((m) => m.lv3_id === gid)
  if (left.length) { console.log(' !not empty', key, left.length, left.map((m) => [...nick2.entries()].find(([, v]) => v === m.celeb_id)?.[0])); continue }
  await del('faction_lv3', gid, `lv3 ${key}`)
}

console.log(`이동 ${moved}건 / 이중배정 ${added}건${nomatch.length ? ' / 미매칭: ' + nomatch.join(', ') : ''} ${APPLY ? '' : '(dry-run)'}`)
