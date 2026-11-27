// 문장 경계: 한국어는 종결 어미(다·요·까·죠·네·자) 뒤 마침표류, 영어는 마침표류 뒤 대문자·따옴표·숫자로 시작할 때만 본다(제목 속 ?·! 오검출 방지).
const RE = { ko: /(?<=[다요까죠네자][.!?…]+[”"’'」』)\]]*)(\s+)(?=\S)/g, en: /(?<=[.!?…]+[”"’'」』)\]]*)(\s+)(?=[A-Z0-9"“‘'(『「])/g }
export const seps = (p, lang) => [...p.matchAll(RE[lang])].map((x) => [x.index, x.index + x[0].length])
export const sents = (p, lang) => { const out = []; let last = 0; for (const [a, e] of seps(p, lang)) { out.push(p.slice(last, a)); last = e } out.push(p.slice(last)); return out }
export const cut = (p, after, lang) => { const b = seps(p, lang); let s = '', last = 0; for (const n of after) { const [a, e] = b[n - 1]; s += p.slice(last, a) + '\n\n'; last = e } return s + p.slice(last) }
