/**
 * 영문 소개를 한국어로 다시 쓰는 공용 모듈.
 *
 * agy(Antigravity CLI)는 구글 로그인으로 도는 로컬 실행 파일이라 서버에서 부를 수 없다.
 * 그래서 화면이 요청 때마다 번역하지 않고, 여기서 한 번 만들어 DB에 넣는다.
 *
 * 모델을 반드시 명시한다 — 기본값이 한 세대 낮은 모델로 잡혀 있어 오탈자와 고유명사 오역이 난다.
 */

import { execFile } from 'node:child_process'

const AGY = 'C:/Users/webco/AppData/Local/agy/bin/agy.exe'
const AGY_MODEL = 'gemini-3.7-flash-high'
const AGY_TIMEOUT_MS = 180_000
const HANGUL = /[가-힣]/

/** 클로드·제미니가 습관적으로 꺼내는 문예 어휘. no-trash-prose 블랙리스트에서 자주 나오는 것만 추렸다. */
const BANNED = [
  '포개', '벼리', '빚어', '빚다', '갈아엎', '꿰뚫', '관통하', '녹아들', '스며들', '깃들',
  '아로새기', '길어 올리', '떠받치', '도사리', '곤두박질', '휘몰아치', '직조하', '엮어내',
  '봉인하', '정조준', '천착하', '머금', '갈무리하', '점철되', '발돋움',
  '궤를 같이', '결이 다르', '방점을 찍', '화룡점정', '백미', '압권', '단초', '지난한',
  '여실히', '사뭇', '일련의',
]

function buildPrompt(kind: string, title: string, source: string): string {
  return [
    `아래 영문 ${kind} 소개를 한국어로 다시 쓴다. 결과 본문만 출력한다. 머리말, 설명, 따옴표, 마크다운 기호를 붙이지 않는다.`,
    '',
    '규칙',
    '- 원문에 있는 사실만 쓴다. 원문에 없는 평가, 배경, 영향, 수식을 덧붙이지 않는다.',
    '- 번역투를 쓰지 않는다. 사물을 주어로 세우지 말고 사람이 행동하는 문장으로 쓴다. 영어 어순을 그대로 옮기지 않는다.',
    '- 수동태와 명사화를 피한다. "~되었다", "~에 의해", "~의 발매" 대신 능동형 서술을 쓴다.',
    '- 문예체 수식어를 쓰지 않는다. 다음 어휘는 금지한다: 포개다, 벼리다, 빚어내다, 꿰뚫다, 녹아들다, 스며들다, 깃들다, 아로새기다, 떠받치다, 도사리다, 휘몰아치다, 직조하다, 천착하다, 머금다, 갈무리하다, 점철되다, 발돋움하다, 궤를 같이하다, 방점을 찍다, 화룡점정, 백미, 압권, 단초, 지난한, 여실히, 사뭇, 일련의.',
    '- 마지막 문장을 교훈이나 의미 부여로 끝내지 않는다. 사실을 적고 멈춘다.',
    '- 본문에서 대상 작품을 부를 때는 아래 「대상」에 적은 표기를 그대로 쓴다. 원문의 영문 표기로 바꾸지 않는다.',
    '- 그 밖의 작품명은 원어 표기를 유지한다. 인명은 한국에서 통용되는 한글 표기를 쓴다.',
    '- 분량은 원문과 비슷하게 맞춘다.',
    '',
    `대상 ${kind}: ${title}`,
    '',
    '영문 원문',
    source,
  ].join('\n')
}

function runAgy(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      AGY,
      ['-p', prompt, '--model', AGY_MODEL],
      { timeout: AGY_TIMEOUT_MS, maxBuffer: 8 * 1024 * 1024, encoding: 'utf8' },
      (error, stdout) => {
        if (error) return reject(error)
        resolve((stdout ?? '').trim())
      },
    )
  })
}

/** 결과가 쓸 만한지 본다. 한국어여야 하고, 원문 대비 분량이 크게 어긋나면 버린다. */
export function rejectReason(text: string, source: string): string | null {
  if (!text) return '빈 응답'
  if (!HANGUL.test(text)) return '한국어 아님'
  if (/^(죄송|미안|번역할|원문이|요청)/.test(text)) return '거절 응답'
  const ratio = text.length / Math.max(source.length, 1)
  if (ratio < 0.2) return `너무 짧음(${ratio.toFixed(2)})`
  if (ratio > 2.5) return `너무 김(${ratio.toFixed(2)})`
  const hit = BANNED.find((word) => text.includes(word))
  if (hit) return `금지 어휘 "${hit}"`
  return null
}

/**
 * 영문 소개를 한국어로 옮긴다. 두 번 시도하고도 검사를 통과하지 못하면 null.
 *
 * `kind`는 프롬프트에 그대로 들어간다 — '음반', '곡', '게임'처럼 대상 종류를 적는다.
 */
export async function toKorean(
  kind: string,
  title: string,
  source: string,
  log: (message: string) => void = () => {},
): Promise<string | null> {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    let out = ''
    try {
      out = await runAgy(buildPrompt(kind, title, source))
    } catch (error) {
      log(`    agy 실패(${attempt}회): ${(error as Error).message.slice(0, 80)}`)
      continue
    }
    const reason = rejectReason(out, source)
    if (!reason) return out
    log(`    반려(${attempt}회): ${reason}`)
  }
  return null
}
