// agy 범위 조사 결과의 결정 파일을 만든다. 모델 관측값은 obs/<slug>.agy.json 실행 기록에서 가져온다.
// 사용: node mkdec.mjs <slug> <books 배열 JSON 파일>   → <slug>.decision.json
import { W } from './paths.mjs'
import fs from 'node:fs'
const [slug, booksFile] = process.argv.slice(2)
const books = JSON.parse(fs.readFileSync(booksFile, 'utf8'))
// 크롬 웹채팅(Ultra Carbon 높음, 26.11.11부터)으로 받은 결과는 obs/<slug>.web.json의 발송 전·수집 시 모드 라벨을 그대로 쓴다.
const webObs = `${W}/obs/${slug}.web.json`
let modelObservation
if (fs.existsSync(webObs)) {
  const o = JSON.parse(fs.readFileSync(webObs, 'utf8'))
  const m = (label) => { if (!/Carbons*(높음|High)/.test(label)) throw Error('not Carbon High: ' + label); return { mode: 'CarbonHigh', family: 'Carbon', version: null, label } }
  modelObservation = { preSendMode: m(o.preMode), preSendObservedAt: o.preAt, generationModeObservations: [], collectionStartMode: m(o.collectionMode), collectionMode: m(o.collectionMode), collectionObservedAt: o.collectionAt, actualModel: 'Carbon 높음', responseModelEvidence: 'Gemini 웹 모드 버튼 라벨', route: 'chrome-web ' + o.account }
} else {
  const obs = JSON.parse(fs.readFileSync(`${W}/obs/${slug}.agy.json`, 'utf8'))
  if (obs.model !== 'gemini-4-argon-high') throw Error('unexpected model ' + obs.model)
  const mode = { mode: 'ArgonHigh', family: 'Argon', version: null, label: 'agy --model gemini-4-argon-high (CLI 명시 선택)' }
  modelObservation = { preSendMode: mode, preSendObservedAt: obs.startedAt, generationModeObservations: [], collectionStartMode: mode, collectionMode: mode, collectionObservedAt: obs.finishedAt, actualModel: obs.model, responseModelEvidence: 'agy --model flag', route: 'agy-cli' }
}
const d = { slug, original: `${W}/scoped/${slug}.agy.json`, modelObservation, books }
fs.writeFileSync(`${W}/${slug}.decision.json`, JSON.stringify(d, null, 2))
console.log('decision', slug, books.length)
