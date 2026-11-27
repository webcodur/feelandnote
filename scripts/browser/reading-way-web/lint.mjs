// 독서방식 본문 저장 전 검수. save.mjs·overwrite-save.mjs가 부르며, errors가 있으면 저장하지 않는다.
// 기준은 룰북 docs/project/celeb/celeb-05-02-reading-way.md 「작성 규칙」: 그/그녀 구분, 제목 부호, 문단 길이, 끝맺음.
const SELF_HE = /(?<=^|[\s“"‘'(])그(?=(는|가|의|에게|를|도|와|만|로서|에게서|조차|마저|처럼)[\s,.!?”"’'])/g
const paras = (s) => s.split(/\n\s*\n/)
export function lintBody({ ko, en, gender }) {
  const errors = [], warnings = []
  if (/[《》〈〉]/.test(ko)) errors.push('제목 부호 《》〈〉 — 책은 『』, 그 밖의 작품은 「」')
  const kp = paras(ko), ep = paras(en)
  if (kp.length !== ep.length) errors.push(`한영 문단 수 ${kp.length}/${ep.length}`)
  kp.forEach((p, i) => { const n = [...p].length; if (n > 450) errors.push(`P${i + 1} ${n}자 — 450자 이하로 나눈다`); else if (n > 400) warnings.push(`P${i + 1} ${n}자`) })
  if (!/[다요죠.!?…”"’'」』)]$/.test(ko.trim())) errors.push('한국어 끝 문장이 끝나지 않음: ' + ko.trim().slice(-20))
  if (!/[.!?”"’')]$/.test(en.trim())) errors.push('영어 끝 문장이 끝나지 않음: ' + en.trim().slice(-20))
  if (gender === false) {
    const he = [...ko.matchAll(SELF_HE)].map((m) => ko.slice(Math.max(0, m.index - 25), m.index + 8).replace(/\s+/g, ' '))
    if (he.length && !/그녀/.test(ko)) errors.push('여성 인물인데 「그녀」 없이 「그」만 씀: ' + he.join(' / '))
    else if (he.length) warnings.push('여성 인물 본문의 「그」가 다른 인물을 가리키는지 확인: ' + he.join(' / '))
    if (/\b(he|him|his)\b/i.test(en) && !/\b(she|her)\b/i.test(en)) errors.push('여성 인물인데 영어가 he/his만 씀')
  }
  if (gender === true && /그녀/.test(ko) && !ko.match(SELF_HE)) warnings.push('남성 인물 본문에 「그녀」만 있음')
  return { errors, warnings }
}
