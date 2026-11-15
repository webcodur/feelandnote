// 검증 수정안을 조사 원고에 적용한다. 문제 문장(앞 25자)을 포함한 문장을 통째로 수정안으로 바꾸고, 수정안이 '삭제'면 문장을 지운다. 결과: relist/<slug>.new.ko.txt
import fs from 'node:fs'
import { R, W } from './paths.mjs'
const D = W + '/relist'
for (const s of process.argv[2].split(',')) {
  const r = JSON.parse(fs.readFileSync(`${D}/${s}.research.json`, 'utf8')), v = JSON.parse(fs.readFileSync(`${D}/${s}.verify.json`, 'utf8'))
  let paras = r.ko.split(/\n\n+/).map(p => p.match(/[^.!?。]+[.!?。]+[”’"』」)]*\s*|[^.!?。]+$/g).map(x => x.trim()))
  let applied = 0, missed = []
  for (const p of v.problems) {
    const key = p.text.replace(/\s+/g, ' ').slice(0, 25)
    let fix = String(p.fix).trim(); const alt = fix.match(/'([^']+)'로 수정/); if (alt) fix = alt[1]
    const del = /^삭제\.?$/.test(fix)
    let hit = false
    // 지적 문구가 문장 일부(끝맺음 없음)면 그 부분만 바꿔 뒷절을 살린다(26.11.15 델 토로 뒷절 유실)
    const part = p.text.replace(/\s+/g, ' ').trim(), partial = !/[.!?。”’"』」)]$/.test(part)
    for (const ss of paras) { const i = ss.findIndex(x => x.replace(/\s+/g, ' ').includes(key)); if (i >= 0) { const cur = ss[i].replace(/\s+/g, ' '); if (del) ss.splice(i, 1); else if (partial && cur.includes(part)) ss[i] = cur.replace(part, fix); else ss[i] = fix; hit = true; break } }
    hit ? applied++ : missed.push(key)
  }
  const ko = paras.map(ss => ss.join(' ')).filter(Boolean).join('\n\n')
  fs.writeFileSync(`${D}/${s}.new.ko.txt`, ko + '\n')
  console.log(s, '적용', applied, '/', v.problems.length, missed.length ? '못 찾음 ' + JSON.stringify(missed) : '', [...ko].length + '자')
}
