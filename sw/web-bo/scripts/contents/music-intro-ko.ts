/**
 * 음악 작품의 한국어 소개를 채운다.
 *
 * 애플은 음악 소개를 주지 않는다. 화면은 요청 때마다 위키백과·Last.fm을 뒤지는데,
 * 한국어 문서가 없는 외국 음반은 영문이 그대로 실린다. 여기서 한 번 채워 두면
 * 화면은 DB 값을 먼저 쓰므로 영문 노출이 사라지고 요청마다 바깥을 부르지도 않는다.
 *
 * 조달 순서
 *   1) 한국어 위키백과 — 사람이 쓴 한국어 원문이므로 그대로 쓴다
 *   2) 영문 위키백과 → agy(제미니)로 한국어 재작성
 *   3) Last.fm 영문 소개 → agy로 한국어 재작성
 *   넷 다 없으면 건너뛴다. 지어내지 않는다.
 *
 * 실행:
 *   pnpm contents:music-ko --limit 20 --dry
 *   pnpm contents:music-ko --limit 200
 */

import path from 'node:path'
import { execFile } from 'node:child_process'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { getMusicIntro, type MusicUnit } from '@feelandnote/content-search/wikipedia'
import { getAlbumIntro, getTrackIntro, isLastfmEnabled } from '@feelandnote/content-search/lastfm'

config({ path: path.resolve(process.cwd(), '.env'), quiet: true })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 없음')

const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

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

interface Target {
  contentId: string
  unit: MusicUnit
  koTitle: string
  koArtist: string
  enTitle: string
  enArtist: string
  sources: Record<string, unknown>
}

function buildPrompt(kind: '음반' | '곡', title: string, source: string): string {
  return [
    `아래 영문 ${kind} 소개를 한국어로 다시 쓴다. 결과 본문만 출력한다. 머리말, 설명, 따옴표, 마크다운 기호를 붙이지 않는다.`,
    '',
    '규칙',
    '- 원문에 있는 사실만 쓴다. 원문에 없는 평가, 배경, 영향, 수식을 덧붙이지 않는다.',
    '- 번역투를 쓰지 않는다. 사물을 주어로 세우지 말고 사람이 행동하는 문장으로 쓴다. 영어 어순을 그대로 옮기지 않는다.',
    '- 수동태와 명사화를 피한다. "~되었다", "~에 의해", "~의 발매" 대신 능동형 서술을 쓴다.',
    '- 문예체 수식어를 쓰지 않는다. 다음 어휘는 금지한다: 포개다, 벼리다, 빚어내다, 꿰뚫다, 녹아들다, 스며들다, 깃들다, 아로새기다, 떠받치다, 도사리다, 휘몰아치다, 직조하다, 천착하다, 머금다, 갈무리하다, 점철되다, 발돋움하다, 궤를 같이하다, 방점을 찍다, 화룡점정, 백미, 압권, 단초, 지난한, 여실히, 사뭇, 일련의.',
    '- 마지막 문장을 교훈이나 의미 부여로 끝내지 않는다. 사실을 적고 멈춘다.',
    `- ${kind}명과 곡명은 원어 표기를 유지한다. 인명은 한국에서 통용되는 한글 표기를 쓴다.`,
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
function rejectReason(text: string, source: string): string | null {
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

async function translate(kind: '음반' | '곡', title: string, source: string): Promise<string | null> {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    let out = ''
    try {
      out = await runAgy(buildPrompt(kind, title, source))
    } catch (error) {
      console.log(`    agy 실패(${attempt}회): ${(error as Error).message.slice(0, 80)}`)
      continue
    }
    const reason = rejectReason(out, source)
    if (!reason) return out
    console.log(`    반려(${attempt}회): ${reason}`)
  }
  return null
}

async function loadTargets(limit: number, retryMissing: boolean): Promise<Target[]> {
  const out: Target[] = []
  const PAGE = 500
  for (let from = 0; out.length < limit; from += PAGE) {
    const { data, error } = await db
      .from('contents')
      .select('id, metadata, content_locales(locale, title, creator, description, sources)')
      .eq('type', 'MUSIC')
      .range(from, from + PAGE - 1)
    if (error) throw error
    if (!data?.length) break

    for (const row of data) {
      const locales = (row.content_locales ?? []) as {
        locale: string
        title: string | null
        creator: string | null
        description: string | null
        sources: Record<string, unknown> | null
      }[]
      const ko = locales.find((l) => l.locale === 'ko')
      const en = locales.find((l) => l.locale === 'en')
      if (!ko) continue
      if (ko.description?.trim()) continue
      // 지난 회차에 어느 출처에도 원문이 없던 건. 다시 훑으면 앞 구간만 반복하고 진도가 안 나간다.
      if (!retryMissing && (ko.sources as Record<string, unknown> | null)?.introMissing) continue

      const metadata = (row.metadata ?? {}) as Record<string, unknown>
      const itunesUrl = typeof metadata.itunesUrl === 'string' ? metadata.itunesUrl : ''
      out.push({
        contentId: row.id as string,
        unit: itunesUrl.includes('?i=') ? 'track' : 'album',
        koTitle: ko.title ?? '',
        koArtist: ko.creator ?? '',
        enTitle: en?.title ?? '',
        enArtist: en?.creator ?? '',
        sources: ko.sources ?? {},
      })
      if (out.length >= limit) break
    }
    if (data.length < PAGE) break
  }
  return out
}

/**
 * 어느 출처에도 원문이 없었다고 표시한다.
 *
 * 표시가 없으면 다음 회차가 같은 건을 다시 조회해 목록 앞 구간에서만 맴돈다(26.08.19 —
 * 200건을 돌렸는데 전부 지난 회차에 이미 비었던 클래식 음반이었다).
 * 나중에 문서가 생겼을 수 있으니 `--retry-missing`으로 표시를 무시하고 다시 볼 수 있다.
 */
async function markMissing(target: Target) {
  const sources = { ...target.sources, introMissing: true }
  await db
    .from('content_locales')
    .update({ sources })
    .eq('content_id', target.contentId)
    .eq('locale', 'ko')
}

async function save(target: Target, text: string, sourceUrl: string) {
  const sources = { ...target.sources, description: sourceUrl }
  const { error } = await db
    .from('content_locales')
    .update({ description: text, sources })
    .eq('content_id', target.contentId)
    .eq('locale', 'ko')
  if (error) throw error
}

/**
 * 여러 건을 동시에 처리한다. 일꾼마다 앞에서부터 하나씩 집어 간다.
 *
 * agy는 로컬 실행 파일이라 한 건에 20초 안팎이 걸린다. 4건을 함께 부르면 각 건의
 * 소요는 그대로면서 전체 시간이 4분의 1로 줄어든다(26.08.19 실측 — 동시 4건 모두 성공).
 */
async function runPool<T>(
  items: T[],
  size: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let cursor = 0
  const runners = Array.from({ length: Math.max(1, size) }, async () => {
    for (;;) {
      const index = cursor
      cursor += 1
      if (index >= items.length) return
      await worker(items[index], index)
    }
  })
  await Promise.all(runners)
}

async function main() {
  const args = process.argv.slice(2)
  const limit = Number(args[args.indexOf('--limit') + 1]) || 20
  const concurrency = Number(args[args.indexOf('--concurrency') + 1]) || 1
  const dry = args.includes('--dry')
  const retryMissing = args.includes('--retry-missing')

  const targets = await loadTargets(limit, retryMissing)
  console.log(`대상 ${targets.length}건 (dry=${dry}, 동시 ${concurrency})\n`)

  const stat = { koWiki: 0, enWiki: 0, lastfm: 0, none: 0, failed: 0 }

  await runPool(targets, concurrency, async (target, index) => {
    const label = `${index + 1}/${targets.length} ${target.koTitle || target.enTitle}`
    const kind = target.unit === 'album' ? '음반' : '곡'

    // 1) 한국어 위키 — 사람이 쓴 한국어라 그대로 쓴다
    const ko = target.koTitle && target.koArtist
      ? await getMusicIntro(target.unit, target.koTitle, target.koArtist, 'ko')
      : null
    if (ko && HANGUL.test(ko.text)) {
      console.log(`✔ ${label} | ko위키 | ${ko.text.slice(0, 50)}`)
      if (!dry) await save(target, ko.text, ko.url)
      stat.koWiki += 1
      return
    }

    // 2) 영문 위키 → 한국어 재작성
    const en = target.enTitle && target.enArtist
      ? await getMusicIntro(target.unit, target.enTitle, target.enArtist, 'en')
      : null
    if (en) {
      const text = await translate(kind, target.enTitle, en.text)
      if (text) {
        console.log(`✔ ${label} | en위키→번역 | ${text.slice(0, 50)}`)
        if (!dry) await save(target, text, en.url)
        stat.enWiki += 1
        return
      }
      stat.failed += 1
      console.log(`✕ ${label} | 번역 반려`)
      return
    }

    // 3) Last.fm → 한국어 재작성
    if (isLastfmEnabled() && (target.enTitle || target.koTitle)) {
      const artist = target.enArtist || target.koArtist
      const title = target.enTitle || target.koTitle
      const found = artist && title
        ? target.unit === 'album'
          ? await getAlbumIntro(artist, title, 'en')
          : await getTrackIntro(artist, title, 'en')
        : null
      if (found) {
        const text = await translate(kind, title, found.text)
        if (text) {
          console.log(`✔ ${label} | lastfm→번역 | ${text.slice(0, 50)}`)
          if (!dry) await save(target, text, found.url)
          stat.lastfm += 1
          return
        }
        stat.failed += 1
        console.log(`✕ ${label} | 번역 반려`)
        return
      }
    }

    stat.none += 1
    if (!dry) await markMissing(target)
    console.log(`- ${label} | 원문 없음`)
  })

  console.log(
    `\n완료 · ko위키 ${stat.koWiki} · en위키→번역 ${stat.enWiki} · lastfm→번역 ${stat.lastfm} · 원문없음 ${stat.none} · 반려 ${stat.failed}`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
