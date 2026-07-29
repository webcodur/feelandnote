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
 * `--public-dir` 로 그 폴더를 준다. 담는 것은 아래 `buildRenderStage` 가 정한다.
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

import { copyFileSync, existsSync, linkSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { FACTIONS_DIR, DISCOURSES_DIR, episodeDirOf } from '@feelandnote/shared/bo/episode-store'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** sw/remotion 루트 */
export const ROOT = path.join(__dirname, '..', '..')
export const PUBLIC_DIR = path.join(ROOT, 'public')
/** 창고 자리 — 저장소 안이지만 추적 대상은 아니다(.gitignore) */
export const STAGE_ROOT = path.join(ROOT, '.render-stage')

/** 시리즈별 에피소드 폴더가 놓이는 자리(창고 안 상대 경로 = staticFile 이 부르는 이름) */
const SERIES_DIR: Record<string, string> = {
  faction: 'factions',
  discourse: 'discourses',
}

/** 시리즈별 데이터 파일 이름 — 선곡을 읽으려면 이 파일을 연다 */
const DATA_FILE: Record<string, string> = {
  faction: 'faction-data.json',
  discourse: 'discourse-data.json',
}

/**
 * 에피소드 실물 폴더. 팩션의 활성·비활성 편은 모두
 * `public/factions/<폴더 키>` 한 단계에 있다.
 */
function episodeSrcDir(series: string, episode: string): string {
  const root = series === 'discourse' ? DISCOURSES_DIR : FACTIONS_DIR
  return episodeDirOf(root, episode)
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
 * - `fonts/`   2MB. 글꼴은 CSS 가 번들러로 물어 오므로 창고에 없어도 되지만, 값이 싸서 넣는다.
 *
 * 곡(`music/` 125MB)은 여기 없다 — **이 편이 실제로 재생하는 곡만** 골라 담는다(아래 `pickMusic`).
 */
const COMMON_DIRS = ['common', 'fonts']

export interface StageResult {
  /** 창고 절대경로 — 렌더에 `--public-dir` 로 넘긴다 */
  dir: string
  files: number
  bytes: number
  /** 하드링크로 건 수 / 복사로 물러난 수 */
  linked: number
  copied: number
  ms: number
  /** 담은 곡 */
  music: string[]
  /** 데이터가 부르는데 `music/` 에 없는 곡 — 통짜 방식에서도 깨질 결손이라 알린다 */
  musicMissing: string[]
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

/**
 * 이 편이 실제로 재생하는 곡 목록.
 *
 * **선곡 판정을 여기 다시 쓰지 않는다.** 어떤 곡이 흐르는지는 엔진의 배경음악 로직이 정하고,
 * 그 판정은 각 시리즈의 `bgm-select.ts` 로 빠져 있다 — 렌더와 창고가 같은 함수를 부른다.
 * 판정을 복제하면 언젠가 어긋나고, 어긋난 날 곡이 빠진 채로 영상이 나가거나 렌더가 죽는다.
 *
 * 팩션은 롱폼·쇼츠 변형마다 고르는 곡이 다르므로 **그 편의 전 변형 합집합**을 담는다
 * (한 번의 렌더는 한 변형이지만, 편 하나가 쓰는 곡은 많아야 서너 곡이라 넉넉히 담는 편이 안전하다).
 */
async function pickMusic(series: string, episode: string): Promise<string[]> {
  const dataPath = path.join(episodeSrcDir(series, episode), DATA_FILE[series])
  if (!existsSync(dataPath)) return []
  const script = JSON.parse(readFileSync(dataPath, 'utf-8')) as Record<string, unknown>

  if (series === 'discourse') {
    const { collectDiscourseBgmFiles } = await import('../../src/compositions/Discourse/bgm-select.js')
    return collectDiscourseBgmFiles(script as never)
  }

  const [{ collectBgmFiles }, { factionVariants }] = await Promise.all([
    import('../../src/compositions/Faction/bgm-select.js'),
    import('@feelandnote/shared/lib/youtube-faction-meta'),
  ])
  const groups = (script.groups ?? []) as never[]
  const layout = script.longformLayout as never[] | undefined
  const files = new Set<string>()
  for (const v of factionVariants(groups, layout)) {
    for (const f of collectBgmFiles(script as never, { portrait: v.isShorts, part: v.part, lvPart: v.lvPart })) {
      files.add(f)
    }
  }
  return [...files]
}

/**
 * 창고를 짓는다. 같은 이름의 창고가 있으면 먼저 지운다(앞 렌더의 잔재로 옛 자산이 섞이면
 * 무엇을 보고 뽑은 영상인지 알 수 없다).
 */
export async function buildRenderStage(series: string, episode: string): Promise<StageResult> {
  const started = Date.now()
  const seriesDir = SERIES_DIR[series]
  if (!seriesDir) throw new Error(`모르는 시리즈: ${series} (가능: ${Object.keys(SERIES_DIR).join(', ')})`)

  const epSrc = episodeSrcDir(series, episode)
  if (!existsSync(epSrc)) throw new Error(`에피소드 폴더가 없습니다: ${epSrc}`)

  const dir = path.join(STAGE_ROOT, `${series}-${episode.replace(/[/\\]/g, '_')}`)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })

  const c: Counter = { files: 0, bytes: 0, linked: 0, copied: 0 }

  // ① 에피소드 폴더 — 창고 안 자리는 staticFile 이 부르는 이름 그대로다
  placeDir(epSrc, path.join(dir, seriesDir, episode), c, true)

  // ② 공용 — 효과음·글꼴
  for (const rel of COMMON_DIRS) placeDir(path.join(PUBLIC_DIR, rel), path.join(dir, rel), c, false)

  // ③ 곡 — 이 편이 실제로 재생하는 것만. 데이터가 부르는데 없는 곡은 조용히 넘기지 않고 알린다
  //    (통짜 방식에서도 어차피 깨질 자산 결손이다)
  const music = await pickMusic(series, episode)
  const musicDst = path.join(dir, 'music')
  mkdirSync(musicDst, { recursive: true }) // 곡이 하나도 없는 편은 빈 폴더로 둔다
  const musicMissing: string[] = []
  const placed: string[] = []
  for (const file of music) {
    const src = path.join(PUBLIC_DIR, 'music', file)
    if (!existsSync(src)) { musicMissing.push(file); continue }
    placeFile(src, path.join(musicDst, file), c)
    placed.push(file)
  }

  return { dir, ...c, ms: Date.now() - started, music: placed, musicMissing }
}

/** 창고 정리 — 하드링크만 끊는다. 원본(`public/`)은 그대로다 */
export function cleanRenderStage(dir: string): void {
  if (!dir.startsWith(STAGE_ROOT)) {
    throw new Error(`창고 밖은 지우지 않습니다: ${dir}`)
  }
  rmSync(dir, { recursive: true, force: true })
}

export const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1)
