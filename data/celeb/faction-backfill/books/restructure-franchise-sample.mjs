// 프랜차이즈 대표 샘플 — MCU 배우 이중배정 + 스타워즈·해리 포터 lv2 신설(이중배정, 전량 hidden)
// 나머지 출연진 그룹은 별도 캐스팅 시스템으로 이관 — docs/todo/film-cast-system.md
// node --env-file=sw/web-bo/.env data/celeb/faction-backfill/books/restructure-franchise-sample.mjs [--apply]
import { restAll, restGet, headers } from './_rest.mjs'

const APPLY = process.argv.includes('--apply')
const BASE = () => `${process.env.NEXT_PUBLIC_DB_API_URL}/rest/v1`

async function post(t, body, label) {
  if (!APPLY) { console.log(' POST', label || body.name || body.slug); return [{ id: 'dry-' + Math.random().toString(36).slice(2) }] }
  const r = await fetch(`${BASE()}/${t}`, { method: 'POST', headers: headers({ Prefer: 'return=representation', 'Content-Type': 'application/json' }), body: JSON.stringify(body) })
  const d = await r.json()
  if (!r.ok) { console.log(' !ERR post', label, r.status, JSON.stringify(d)); return [] }
  return d
}

const l2s = await restAll('faction_lv2', { select: 'id,slug,name,lv1_id' })
const l3s = await restAll('faction_lv3', { select: 'id,name,lv2_id' })
const mem = await restAll('faction_members', { select: 'id,celeb_id,lv2_id,lv3_id' })
const slug2 = new Map(l2s.map((x) => [x.slug, x.id]))
const gmap = new Map(l3s.map((x) => [`${x.lv2_id}|${x.name}`, x.id]))
const cids = [...new Set(mem.map((m) => m.celeb_id))]
const nick2 = new Map()
for (let i = 0; i < cids.length; i += 200) {
  const c = await restGet(`celebs?id=in.(${cids.slice(i, i + 200).join(',')})&select=id,nickname`)
  for (const x of c) nick2.set(x.nickname, x.id)
}

// ── 1) lv2 신설: 스타워즈·해리 포터 (MCU·반지의 제왕·엑스맨과 같은 lv1) ──
const mcu = l2s.find((x) => x.name === '마블 시네마틱 유니버스')
const LV1 = mcu.lv1_id
const NEWF = [
  ['star-wars', '스타워즈', 'Star Wars', '은하의 사가를 만든 사람들이다. 루카스필름을 이끈 캐슬린 케네디, 후속 3부작의 에이브럼스와 존슨, 만달로리안의 패브로, 그리고 한 솔로와 오비완의 배우들.', 'The makers of the galactic saga — Kennedy of Lucasfilm, Abrams and Johnson of the sequel trilogy, Favreau of The Mandalorian, and the actors behind Han Solo and Obi-Wan.', 1090],
  ['harry-potter', '해리 포터', 'Harry Potter', '호그와트의 배우들이다. 황금 3인방에서 교수진까지, 마법 세계를 입은 사람들.', 'The cast of Hogwarts — from the golden trio to the professors, the actors who wore the wizarding world.', 1091],
]
for (const [slug, ko, en, dko, den, so] of NEWF) {
  if (slug2.has(slug)) continue
  const r = await post('faction_lv2', { lv1_id: LV1, slug, name: ko, name_en: en, description: dko, description_en: den, sort_order: so, color: '#8a8378', published: false, is_myth: false, is_fiction: false, is_featured: false }, `lv2 ${ko}`)
  if (r[0]?.id) slug2.set(slug, r[0].id)
}

// ── 2) 이중배정 목록: 세력slug → [그룹명(null이면 직속), 닉네임들] ──
const DUAL = {
  'mcu': [
    ['각자의 이야기를 이끈 히어로들', ['채드윅 보즈먼', '앤서니 매키', '폴 러드', '시무 리우']],
    ['빌런', ['조너선 메이저스']],
    ['유니버스를 채운 사람들', ['윈스턴 듀크', '앤절라 배싯', '돈 치들', '테런스 하워드', '마이클 더글러스', '브라이언 타이리 헨리']],
  ],
  'star-wars': [
    [null, ['해리슨 포드', '이완 맥그리거', '존 보예가', '도널 글리슨', '로사리오 도슨', '캐슬린 케네디', 'J. J. 에이브럼스', '라이언 존슨', '존 패브로']],
  ],
  'harry-potter': [
    [null, ['다니엘 래드클리프', '엠마 왓슨', '루퍼트 그린트', '톰 펠튼', '매슈 루이스', '보니 라이트', '이반나 린치', '매기 스미스', '피오나 쇼', '브렌던 글리슨', '도널 글리슨', '케네스 브래나', '빌 나이', '게리 올드만', '에마 톰프슨']],
  ],
}

const nomatch = []
let added = 0
for (const [fslug, groups] of Object.entries(DUAL)) {
  const fid = slug2.get(fslug)
  if (!fid) { console.log(' !no faction', fslug); continue }
  for (const [gname, nicks] of groups) {
    const gid = gname ? gmap.get(`${fid}|${gname}`) : null
    if (gname && !gid) { console.log(' !no group', fslug, gname); continue }
    for (const n of nicks) {
      const cid = nick2.get(n)
      const exists = mem.some((m) => m.celeb_id === cid && m.lv2_id === fid)
      if (!cid) { nomatch.push(`${fslug}/${n} (no celeb)`); continue }
      if (exists) { console.log('  =skip(이미 소속)', n); continue }
      const r = await post('faction_members', { celeb_id: cid, lv2_id: fid, lv3_id: gid, hidden: true }, `member ${n}→${fslug}${gname ? '/' + gname : ''}`)
      if (r[0]?.id) { mem.push({ id: r[0].id, celeb_id: cid, lv2_id: fid, lv3_id: gid }); added++ }
    }
  }
}

console.log(`이중배정 ${added}건${nomatch.length ? ' / 미매칭: ' + nomatch.join(', ') : ''} ${APPLY ? '' : '(dry-run)'}`)
