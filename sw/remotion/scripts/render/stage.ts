/**
 * stage.ts — 렌더 창고(참조 기반 public) 조립
 *
 * ## 왜
 *
 * 렌더는 시작할 때 `public/` 을 통째로 번들 폴더에 복사한다. 이 저장소의 `public/` 은 **7.3GB**
 * 다(서재 탐방 4.4GB · 세력도 2.6GB · 담화 196MB · 곡 125MB). 한 편을 뽑는 데 그 전부가 딸려
 * 가고, 편마다 매번 반복된다. 디스크가 찼던 사고도 여기서 났다.
 *
 * 그래서 렌더 직전에 **그 편이 실제로 참조하는 것만** 모은 임시 폴더를 만들고, 렌더에게
 * `--public-dir` 로 그 폴더를 준다. 담는 것은 아래 `stagePlan` 이 정한다.
 *
 * ## 어떻게
 *
 * 파일을 복사하지 않고 **하드링크**로 건다 — 같은 볼륨이면 내용이 한 벌이라 용량이 늘지 않고
 * 시간도 거의 안 든다. 볼륨이 다르거나 링크가 거부되면 그 파일만 복사로 물러난다(개수를 세어
 * 보고한다 — 조용히 넘어가면 왜 느린지 알 수 없다).
 *
 * ⚠ 창고는 **읽기 전용으로만 쓴다.** 하드링크는 원본과 같은 실체라 창고 안의 파일을 고치면
 *   `public/` 의 원본이 함께 바뀐다. 렌더는 읽기만 하므로 안전하지만, 창고를 편집 대상으로
 *   삼지 마라. 지울 때는 링크만 끊기므로 원본은 남는다.
 */

import { copyFileSync, existsSync, linkSync, mkdirSync, readdirSync, rmSync, statSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** sw/remotion 루트 */
export const ROOT = path.join(__dirname, '..', '..')
export const PUBLIC_DIR = path.join(ROOT, 'public')
/** 창고 자리 — 저장소 안이지만 추적 대상은 아니다(.gitignore) */
export const STAGE_ROOT = path.join(ROOT, '.render-stage')

/** 시리즈별 에피소드 폴더가 놓이는 자리 */
const SERIES_DIR: Record<string, string> = {
  faction: 'factions',
  discourse: 'discourses',
}

/**
 * 에피소드 폴더 안에서 렌더가 절대 읽지 않는 하위 — 발주 참고 이미지·조사 문서·백업이라
 * 크기만 차지한다(PayPal-Mafia 기준 `_refs` 만 6.8MB).
 */
const SKIP_DIRS = new Set([
  '.export-backup', '_docs', '_refs', 'quotes', '_archive', '_staging',
  // 합성 원본(정규화 전) — 영상은 정규화된 wav 만 재생한다. PayPal-Mafia 만 9.9MB, 전 편 합 135MB
  '.raw',
])

/** 에피소드 폴더 안에서 건너뛸 파일 — 발주서 문서류 */
function skipFile(name: string): boolean {
  return name.startsWith('00-발주서') && name.endsWith('.md')
}

/**
 * 시리즈·에피소드와 무관하게 늘 필요한 공용 자산.
 * - `common/`  효과음(타이핑·등장·챕터·크레딧 표식) 7.8MB
 * - `music/`   배경음악 125MB — 곡 이름이 데이터에 적혀 있어 통째로 넣는다.
 *              참조된 곡만 거르는 것은 다음 단계 과제다(지금도 7.3GB → 200MB대라 이득이 크다).
 * - `fonts/`   2MB. 글꼴은 CSS 가 번들러로 물어 오므로 창고에 없어도 되지만, 값이 싸서 넣는다.
 */
const COMMON_DIRS = ['common', 'music', 'fonts']

export interface StageResult {
  /** 창고 절대경로 — 렌더에 `--public-dir` 로 넘긴다 */
  dir: string
  files: number
  bytes: number
  /** 하드링크로 건 수 / 복사로 물러난 수 */
  linked: number
  copied: number
  ms: number
}

interface Counter { files: number; bytes: number; linked: number; copied: number }

/** 파일 하나 — 하드링크, 안 되면 복사 */
function placeFile(src: string, dst: string, c: Counter): void {
  mkdirSync(path.dirname(dst), { recursive: true })
  try {
    linkSync(src, dst)
    c.linked++
  } catch {
    // 볼륨이 다르거나 링크 수 상한에 걸리면 복사로 물러난다
    copyFileSync(src, dst)
    c.copied++
  }
  c.files++
  c.bytes += statSync(src).size
}

/** 폴더 하나 — 건너뛸 하위를 빼고 재귀 */
function placeDir(srcDir: string, dstDir: string, c: Counter, prune: boolean): void {
  if (!existsSync(srcDir)) return
  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    if (prune && entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue
    if (prune && entry.isFile() && skipFile(entry.name)) continue
    const src = path.join(srcDir, entry.name)
    const dst = path.join(dstDir, entry.name)
    if (entry.isDirectory()) placeDir(src, dst, c, prune)
    else if (entry.isFile()) placeFile(src, dst, c)
  }
}

/** 창고에 담을 것 — 무엇이 왜 들어가는지 한눈에 보이게 따로 뺐다 */
export function stagePlan(series: string, episode: string): { rel: string; prune: boolean }[] {
  const dir = SERIES_DIR[series]
  if (!dir) throw new Error(`모르는 시리즈: ${series} (가능: ${Object.keys(SERIES_DIR).join(', ')})`)
  return [
    { rel: path.join(dir, episode), prune: true },
    ...COMMON_DIRS.map(d => ({ rel: d, prune: false })),
  ]
}

/**
 * 창고를 짓는다. 같은 이름의 창고가 있으면 먼저 지운다(앞 렌더의 잔재로 옛 자산이 섞이면
 * 무엇을 보고 뽑은 영상인지 알 수 없다).
 */
export function buildRenderStage(series: string, episode: string): StageResult {
  const started = Date.now()
  const plan = stagePlan(series, episode)

  const epSrc = path.join(PUBLIC_DIR, plan[0].rel)
  if (!existsSync(epSrc)) {
    throw new Error(`에피소드 폴더가 없습니다: ${epSrc}`)
  }

  const dir = path.join(STAGE_ROOT, `${series}-${episode.replace(/[/\\]/g, '_')}`)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })

  const c: Counter = { files: 0, bytes: 0, linked: 0, copied: 0 }
  for (const item of plan) {
    placeDir(path.join(PUBLIC_DIR, item.rel), path.join(dir, item.rel), c, item.prune)
  }

  return { dir, ...c, ms: Date.now() - started }
}

/** 창고 정리 — 하드링크만 끊는다. 원본(`public/`)은 그대로다 */
export function cleanRenderStage(dir: string): void {
  if (!dir.startsWith(STAGE_ROOT)) {
    throw new Error(`창고 밖은 지우지 않습니다: ${dir}`)
  }
  rmSync(dir, { recursive: true, force: true })
}

export const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1)
