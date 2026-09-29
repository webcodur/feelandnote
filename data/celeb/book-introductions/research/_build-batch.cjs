// 임시: id8 초안을 조사 작성 계획으로 바꾼다. 교정 목록은 fixes JSON 파일에서 읽는다. 작업 후 삭제한다.
// node _build-batch.cjs <draft.json> <out.json> <targets.txt> [fixes.json]
const fs = require('fs')
const [draftPath, outPath, targetsPath, fixesPath] = process.argv.slice(2)
const targets = fs.readFileSync(targetsPath, 'utf8').trim().split('\n').slice(1).map(l => JSON.parse(l))
const draft = JSON.parse(fs.readFileSync(draftPath, 'utf8'))
const fixes = fixesPath ? JSON.parse(fs.readFileSync(fixesPath, 'utf8')) : {}
const plan = draft.map(d => {
  const t = targets.find(x => x.id.startsWith(d.id8))
  if (!t) throw new Error('no target ' + d.id8)
  // 근거 주소 교정: fixes.__url = [[옛 주소, 새 주소]]
  for (const [a, b] of fixes.__url ?? []) {
    if (d.sourceUrl === a) d.sourceUrl = b
    for (const e of d.evidence) if (e.url === a) e.url = b
  }
  let description = d.description
  for (const [a, b] of fixes[d.id8] ?? []) {
    if (!description.includes(a)) throw new Error('miss ' + d.id8 + ' ' + a)
    description = description.replace(a, b)
  }
  return { contentId: t.id, locale: 'ko', title: t.ko[0], creator: t.ko[1], description, sourceUrl: d.sourceUrl,
    evidence: d.evidence.map(e => ({ ...e, url: e.url.replace(/^http:\/\//, 'https://') })) }
})
fs.writeFileSync(outPath, JSON.stringify(plan, null, 2) + '\n')
console.log(plan.length, plan.map(p => p.description.replace(/\s/g, '').length).join(','))
