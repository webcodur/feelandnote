// 2차 재명명 — 억지 수식·번역투를 정직한 분류·실제 명칭으로 되돌린다.
// node --env-file=sw/web-bo/.env data/celeb/faction-backfill/books/rename-factions-2.mjs [--apply]
import { restAll } from './_rest.mjs'

const APPLY = process.argv.includes('--apply')
const BASE = () => `${process.env.NEXT_PUBLIC_DB_API_URL}/rest/v1`
const KEY = () => process.env.DB_SECRET_KEY
const H = () => ({ apikey: KEY(), Authorization: `Bearer ${KEY()}`, 'Content-Type': 'application/json' })

const L2 = {
  'european-cinema': ['유럽의 은막', "Europe's Silver Screen"],
  'south-asian-music': ['남아시아의 가수들', 'Singers of South Asia'],
  'fashion-models': ['런웨이의 모델들', 'Models of the Runway'],
  'sns-stars': ['인플루언서', 'Influencers'],
  'chefs': ['주방의 거장들', 'Masters of the Kitchen'],
  'business-leaders': ['재계의 거물들', 'Titans of Business'],
  'economists': ['경제학자들', 'The Economists'],
  'electronic-dance-music': ['페스티벌의 DJ들', 'DJs of the Festival Circuit'],
}

const L3 = {
  'world-politics|브뤼셀의 시대': ['유럽의 지도자들', 'Leaders of Europe'],
  'world-politics|아시아의 거인들': ['아시아의 지도자들', 'Leaders of Asia'],
  'world-politics|사막의 권좌': ['중동과 북아프리카의 지도자들', 'Leaders of the Middle East & North Africa'],
  'world-politics|탈식민의 지도자들': ['아프리카의 지도자들', 'Leaders of Africa'],
  'world-politics|신대륙의 수장들': ['아메리카의 지도자들', 'Leaders of the Americas'],
  'world-politics|세계의 사무총장들': ['국제기구의 수장들', 'Heads of International Organizations'],
  'world-politics|남태평양의 수장들': ['오세아니아의 지도자들', 'Leaders of Oceania'],
  'us-politics|민주당의 당나귀들': ['민주당', 'The Democrats'],
  'us-politics|공화당의 코끼리들': ['공화당', 'The Republicans'],
  'us-politics|검은 로브의 사람들': ['대법관과 법조인', 'Justices and Jurists'],
  'us-politics|제국의 관료들': ['군사·안보·외교의 관료들', 'Defense, Security & Diplomacy Officials'],
  'us-politics|카메라 앞의 논객들': ['언론인과 논평가', 'Journalists and Commentators'],
  'european-cinema|프랑스의 얼굴들': ['프랑스', 'France'],
  'european-cinema|셰익스피어의 후예들': ['영국과 아일랜드', 'Britain & Ireland'],
  'european-cinema|북쪽의 얼굴들': ['북유럽', 'The Nordics'],
  'european-cinema|독일어권의 얼굴들': ['독일어권', 'The German-Speaking World'],
  'european-cinema|네오레알리즘의 후예들': ['이탈리아', 'Italy'],
  'european-cinema|유럽의 또 다른 얼굴들': ['그 밖의 나라들', 'The Rest of Europe'],
  'indian-cinema|남인도의 스타들': ['남인도', 'South India'],
  'indian-cinema|카메라 뒤의 장인들': ['감독과 제작자들', 'Directors and Producers'],
  'hollywood|마이크 하나로 선 사람들': ['스탠드업 코미디언', 'Stand-up Comedians'],
  'hollywood|웃음을 파는 배우들': ['코미디 배우들', 'Comic Actors'],
  'hollywood|카메라 뒤의 장인들': ['감독과 제작자들', 'Directors and Producers'],
  'spies|제2차 대전의 그림자들': ['제2차 세계대전', 'The Second World War'],
  'exiles|고국을 떠난 사람들': ['한국의 망명자들', 'Korean Exiles'],
}

const l2s = await restAll('faction_lv2', { select: 'id,slug,name' })
const l3s = await restAll('faction_lv3', { select: 'id,lv2_id,name' })
const slug2id = new Map(l2s.map((f) => [f.slug, f.id]))

let done = 0, err = 0, skip = 0
const apply = async (table, id, body, label) => {
  if (!APPLY) { console.log(' ', label, '→', body.name); return }
  const r = await fetch(`${BASE()}/${table}?id=eq.${id}`, { method: 'PATCH', headers: { ...H(), Prefer: 'return=minimal' }, body: JSON.stringify(body) })
  if (r.ok) done++; else { err++; console.log('ERR', label, r.status) }
}

console.log('== LV2 ==')
for (const [slug, [ko, en]] of Object.entries(L2)) {
  const f = l2s.find((x) => x.slug === slug)
  if (!f) { skip++; console.log('없음', slug); continue }
  await apply('faction_lv2', f.id, { name: ko, name_en: en }, `${slug}(${f.name})`)
}
console.log('== LV3 ==')
for (const [key, [ko, en]] of Object.entries(L3)) {
  const [fslug, oldName] = key.split('|')
  const fid = slug2id.get(fslug)
  const g = l3s.find((x) => x.lv2_id === fid && x.name === oldName)
  if (!g) { skip++; console.log('없음', key); continue }
  await apply('faction_lv3', g.id, { name: ko, name_en: en }, `${fslug}/${oldName}`)
}
console.log(`반영 ${done} / 오류 ${err} / 미매칭 ${skip}`)
