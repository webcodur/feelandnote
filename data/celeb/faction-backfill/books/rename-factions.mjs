// 신규 lv2·lv3 이름 재명명 — 「페이팔 마피아」「제자백가」「르네상스」처럼 이름 붙은 개념으로.
// node --env-file=sw/web-bo/.env data/celeb/faction-backfill/books/rename-factions.mjs [--apply]
import { restAll } from './_rest.mjs'

const APPLY = process.argv.includes('--apply')
const BASE = () => `${process.env.NEXT_PUBLIC_DB_API_URL}/rest/v1`
const KEY = () => process.env.DB_SECRET_KEY
const H = () => ({ apikey: KEY(), Authorization: `Bearer ${KEY()}`, 'Content-Type': 'application/json' })

// lv2: slug → [새 ko, 새 en]  (할리우드·성서·십자군·신라는 이미 고유명사라 유지)
const L2 = {
  'world-politics': ['세계의 정상들', "The World's Leaders"],
  'us-politics': ['캐피톨 힐', 'Capitol Hill'],
  'european-cinema': ['올드 월드의 은막', "The Old World's Silver Screen"],
  'indian-cinema': ['인도의 은막', "India's Silver Screen"],
  'native-americans': ['아메리카의 첫 사람들', "America's First Peoples"],
  'classical-music': ['클래식의 거장들', 'Masters of Classical Music'],
  'electronic-dance-music': ['메인스테이지의 DJ들', 'DJs of the Main Stage'],
  'south-asian-music': ['남아시아의 목소리들', 'Voices of South Asia'],
  'fashion-models': ['런웨이의 얼굴들', 'Faces of the Runway'],
  'sns-stars': ['피드 위의 스타들', 'Stars of the Feed'],
  'chefs': ['주방의 스타들', 'Stars of the Kitchen'],
  'visual-artists': ['캔버스 밖의 예술가들', 'Artists Beyond the Canvas'],
  'european-monarchs': ['옥좌의 주인들', 'Masters of the Thrones'],
  'business-leaders': ['자본의 거인들', 'Titans of Capital'],
  'economists': ['보이지 않는 손의 후예들', 'Heirs of the Invisible Hand'],
  'scientists': ['자연을 푼 사람들', 'Those Who Unraveled Nature'],
}

// lv3: 'lv2slug|현재 이름' → [새 ko, 새 en]
const L3 = {
  'world-politics|유럽': ['브뤼셀의 시대', 'The Brussels Era'],
  'world-politics|아시아': ['아시아의 거인들', 'The Giants of Asia'],
  'world-politics|중동과 북아프리카': ['사막의 권좌', 'Thrones of the Desert'],
  'world-politics|아프리카': ['탈식민의 지도자들', 'Postcolonial Leaders'],
  'world-politics|아메리카': ['신대륙의 수장들', 'Leaders of the New World'],
  'world-politics|국제기구': ['세계의 사무총장들', "The World's Secretaries-General"],
  'world-politics|오세아니아': ['남태평양의 수장들', 'Leaders of the South Pacific'],
  'us-politics|민주당': ['민주당의 당나귀들', 'The Democratic Donkeys'],
  'us-politics|공화당': ['공화당의 코끼리들', 'The Republican Elephants'],
  'us-politics|사법과 법조계': ['검은 로브의 사람들', 'The Black Robes'],
  'us-politics|군사·안보·외교': ['제국의 관료들', "The Empire's Officials"],
  'us-politics|언론과 논평가': ['카메라 앞의 논객들', 'Pundits Before the Camera'],
  'european-cinema|프랑스': ['프랑스의 얼굴들', 'The Faces of France'],
  'european-cinema|영국과 아일랜드': ['셰익스피어의 후예들', "Shakespeare's Heirs"],
  'european-cinema|북유럽': ['북쪽의 얼굴들', 'Faces of the North'],
  'european-cinema|독일어권': ['독일어권의 얼굴들', 'Faces of the German-Speaking World'],
  'european-cinema|이탈리아': ['네오레알리즘의 후예들', 'Heirs of Neorealism'],
  'european-cinema|그 밖의 나라들': ['유럽의 또 다른 얼굴들', "Europe's Other Faces"],
  'indian-cinema|남인도 영화': ['남인도의 스타들', 'Stars of the South'],
  'hollywood|스크린의 배우들': ['은막의 스타들', 'Stars of the Silver Screen'],
  'hollywood|텔레비전의 배우들': ['브라운관의 스타들', 'Stars of the Small Screen'],
  'hollywood|토크쇼의 진행자들': ['심야 토크쇼의 주인들', 'Hosts of the Late Night'],
  'hollywood|스탠드업 코미디언': ['마이크 하나로 선 사람들', 'One Mic, One Person'],
  'hollywood|코미디 배우들': ['웃음을 파는 배우들', 'Dealers in Laughter'],
  'hollywood|카메라 뒤의 사람들': ['카메라 뒤의 장인들', 'Craftsmen Behind the Camera'],
  'spies|그레이트 게임과 제1차 대전': ['그레이트 게임의 요원들', 'Agents of the Great Game'],
  'spies|제2차 세계대전': ['제2차 대전의 그림자들', 'Shadows of WWII'],
  'spies|소련과 냉전': ['철의 장막의 요원들', 'Agents of the Iron Curtain'],
  'exiles|유럽': ['유럽을 떠난 사람들', 'Those Who Left Europe'],
  'exiles|유럽 바깥': ['유럽 밖의 망명자들', 'Exiles Beyond Europe'],
  'exiles|한국': ['고국을 떠난 사람들', 'Those Who Left Home'],
  'myth-bible|구약의 인물들': ['족장과 왕과 예언자', 'Patriarchs, Kings, and Prophets'],
  'myth-bible|신약의 인물들': ['예수 곁의 사람들', 'Those Around Jesus'],
  'great-explorers|항해의 시대': ['대항해의 선장들', 'Captains of the Age of Sail'],
  'great-explorers|극지방': ['극점을 향한 사람들', 'Bound for the Poles'],
  'conquerors|고대의 제국 건설자들': ['고대의 정복왕들', 'Conqueror-Kings of Antiquity'],
  'conquerors|동아시아의 왕과 장수들': ['동아시아의 패자들', 'Hegemons of East Asia'],
  'conquerors|유럽의 제왕과 장수들': ['유럽의 정복왕들', 'Conqueror-Kings of Europe'],
  'lone-conquerors|유럽과 지중해의 영웅들': ['지중해의 영웅들', 'Heroes of the Mediterranean'],
  'wild-west|원주민의 사람들': ['원주민의 영웅들', 'Heroes of the First Nations'],
  'founding-monarchs|동아시아의 시조들': ['태조라 불린 왕들', 'The Kings Called Taizu'],
  'founding-monarchs|고대의 시조들': ['고대의 첫 왕들', 'First Kings of the Ancient World'],
  'founding-monarchs|유럽의 시조들': ["유럽의 첫 왕들", "Europe's First Kings"],
  'founding-monarchs|남아시아·동남아의 시조들': ['남아시아와 동남아의 첫 왕들', 'First Kings of South & Southeast Asia'],
  'founding-monarchs|아프리카의 시조들': ['아프리카의 첫 왕들', "Africa's First Kings"],
  'founding-monarchs|아메리카의 시조들': ['신대륙의 첫 왕들', 'First Kings of the New World'],
  'great-archaeologists|이집트의 발굴자들': ['피라미드의 발굴자들', 'Diggers of the Pyramids'],
  'great-archaeologists|그리스와 에게해': ['에게해의 발굴자들', 'Diggers of the Aegean'],
  'revolutionaries|러시아의 반란군들': ['러시아의 반란자들', 'The Russian Rebels'],
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
