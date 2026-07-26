/**
 * 테마 배경음악 투영 — 도감 태그(`celeb_tags.theme_music`)에 실어 나르는 값을 만든다. 서버 전용.
 *
 * ## 판정은 여기서 하지 않는다
 *
 * 「그 테마 구간에서 실제로 흐르는 곡」은 **렌더 엔진의 선곡 모듈이 유일 출처**다
 * (`sw/remotion/src/compositions/Faction/bgm-select.ts`). 판정을 관리 화면에 다시 쓰면 언젠가
 * 엔진과 어긋나고, 어긋난 날 도감에 엉뚱한 곡이 걸린다.
 *
 * 그래서 렌더 저장소의 얇은 CLI(`scripts/faction/theme-music.ts`)를 **자식 프로세스로 부르고
 * 결과만 받아 쓴다** — 개인샷을 얼굴 사진으로 승격할 때 스크립트를 부르는 것과 같은 방식이다.
 * 이 파일이 아는 것은 ① CLI 를 어떻게 부르는가 ② 세력 결과를 태그 단위로 어떻게 접는가
 * ③ mp3 를 어디에 올리는가, 셋뿐이다.
 *
 * ## 곡 파일 저장
 *
 * `faction-music/<내용 sha1 앞 8자>-<파일명>` 키. **내용 해시가 키에 들어가므로 같은 곡을
 * 여러 테마가 공유해도 한 번만 올라간다**(에피소드 하나의 여러 테마가 대개 같은 곡을 쓴다).
 * 키가 내용에 매여 있어 1년 불변 캐시를 그대로 쓸 수 있다 — `?v=` 를 붙이지 않는다.
 *
 * ## 되쓰기 규칙
 *
 * 인물 대사·테마 영상과 같다 — **채움 전용이 아니라 항상 되쓴다.** 제작 쪽에서 곡을 빼면
 * 도감 쪽도 null 로 비운다.
 */

import { spawn } from 'child_process'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { REMOTION_ROOT } from '@feelandnote/shared/bo/remotion-root'
import { fileHash } from './manifest'
import { missingR2Env, publicUrl, uploadToR2 } from './r2'
import type { PublishGroup } from './collect'

/** CLI 가 이 시간을 넘기면 죽인다 — 한 편의 컷 계산이라 실측 몇 초다 */
const TIMEOUT_MS = 120_000

/** mp3 MIME — R2 에 올릴 때 붙인다 */
const MUSIC_CONTENT_TYPE = 'audio/mpeg'

/** 선곡 CLI 가 세력 한 칸에 내놓는 값 */
export interface ThemeMusicGroup {
  index: number
  name: string
  variant: string | null
  file: string | null
  /** 곡 파일 절대경로. 파일이 실물로 없으면 null */
  abs: string | null
  note: string
}

export interface ThemeMusicResult {
  episode: string
  musicDir: string
  groups: ThemeMusicGroup[]
}

/** `celeb_tags.theme_music` 에 그대로 들어가는 값 */
export interface TagMusic {
  /** `music/` 아래 파일 이름 — 되짚기용 */
  file: string
  /** R2 공개 주소 */
  url: string
  /** 어느 에피소드에서 왔는지 */
  episode: string
  /** 판정에 쓴 영상 종류 키 */
  variant: string
  checkedAt: string
}

/* ────────────────────────── 선곡 CLI 부르기 ────────────────────────── */

/**
 * 렌더 저장소의 선곡 CLI 를 돌린다.
 *
 * 셸을 거치지 않는다 — 셸을 켜면 공백·한글이 섞인 인자가 토막으로 쪼개진다.
 * 그래서 `tsx` 의 `.cmd` 대신 그 실행 파일(js)을 node 로 직접 부른다.
 * **stdout 은 결과 JSON 전용**이라 그대로 파싱한다. 실패는 사유를 들고 던진다(조용한 폴백 금지).
 */
export async function runThemeMusicCli(folder: string): Promise<ThemeMusicResult> {
  const root = REMOTION_ROOT
  const script = path.join(root, 'scripts', 'faction', 'theme-music.ts')
  if (!existsSync(script)) throw new Error(`선곡 도구를 찾을 수 없습니다: ${script}`)
  const tsxCli = path.join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs')
  if (!existsSync(tsxCli)) throw new Error(`tsx 실행 파일을 찾을 수 없습니다: ${tsxCli}`)

  const { code, out, err } = await new Promise<{ code: number; out: string; err: string }>((resolve, reject) => {
    const child = spawn(process.execPath, [tsxCli, script, '--episode', folder], { cwd: root })
    let out = ''
    const errLines: string[] = []
    const timer = setTimeout(() => {
      errLines.push(`[중단] ${TIMEOUT_MS / 1000}초를 넘겨 강제 종료`)
      child.kill('SIGKILL')
    }, TIMEOUT_MS)
    child.stdout.on('data', (d: Buffer) => { out += d.toString() })
    child.stderr.on('data', (d: Buffer) => { errLines.push(d.toString().trimEnd()) })
    child.on('error', (e) => { clearTimeout(timer); reject(e) })
    child.on('close', (c) => { clearTimeout(timer); resolve({ code: c ?? -1, out, err: errLines.join('\n') }) })
  })

  if (code !== 0) throw new Error(`선곡 도구 실패(코드 ${code}): ${err || '사유 없음'}`)
  try {
    const parsed = JSON.parse(out) as ThemeMusicResult
    if (!Array.isArray(parsed?.groups)) throw new Error('groups 배열이 없다')
    return parsed
  } catch (e) {
    throw new Error(`선곡 결과를 읽지 못했습니다: ${e instanceof Error ? e.message : String(e)}`)
  }
}

/* ────────────────────────── 태그 단위로 접기 ────────────────────────── */

/**
 * 한 테마의 대표 곡 — 그 태그를 쓰는 세력 중 **가장 앞 세력**의 곡.
 * 여러 곡이 섞이면(챕터가 갈리는 편) 앞 세력 것을 쓴다 — 도감은 한 곡만 보여준다.
 *
 * `disabled`·`longformOnly` 세력은 세로 영상에 안 나오므로 CLI 가 이미 곡을 비워 보낸다.
 */
export function pickTagMusic(
  result: ThemeMusicResult, tagGroups: ReadonlyArray<PublishGroup>,
): { group: ThemeMusicGroup | null; notes: string[] } {
  const byIndex = new Map(result.groups.map(g => [g.index, g]))
  const ordered = [...tagGroups].sort((a, b) => a.index - b.index)
  const notes: string[] = []
  for (const g of ordered) {
    const hit = byIndex.get(g.index)
    if (!hit) { notes.push(`${g.name}: 선곡 결과에 없음`); continue }
    if (hit.file && hit.abs) return { group: hit, notes: [hit.note] }
    notes.push(`${g.name}: ${hit.note}`)
  }
  return { group: null, notes }
}

/** 곡 R2 키 — 내용 해시가 앞에 붙어 같은 곡은 한 번만 올라간다 */
export function musicKey(hash: string, file: string): string {
  // 파일명에 공백·괄호가 섞여 있다(사람이 붙인 이름). 주소에 안전한 글자만 남긴다.
  const safe = path.basename(file).replace(/[^A-Za-z0-9._-]+/g, '_')
  return `faction-music/${hash}-${safe}`
}

/* ────────────────────────── 한 편의 자료 한 벌 ────────────────────────── */

export interface EpisodeMusicSource {
  folder: string
  result: ThemeMusicResult
  /** 이미 올린 곡 — 같은 편 안에서 되풀이 업로드를 막는다(키 → 공개 주소) */
  uploaded: Map<string, string>
  /** 사람에게 보여줄 사항(환경변수 누락 등) */
  notes: string[]
  /** R2 키가 갖춰졌는지 */
  canUpload: boolean
}

/** 선곡 CLI 를 한 번 돌려 한 편의 자료를 갖춘다 */
export async function loadEpisodeMusicSource(folder: string): Promise<EpisodeMusicSource> {
  const result = await runThemeMusicCli(folder)
  const r2Missing = missingR2Env()
  return {
    folder,
    result,
    uploaded: new Map(),
    notes: r2Missing.length ? [`곡 저장소 환경변수 누락으로 음악을 올릴 수 없습니다: ${r2Missing.join(', ')}`] : [],
    canUpload: r2Missing.length === 0,
  }
}

/**
 * 곡 파일을 올리고 공개 주소를 돌려준다 — 이미 같은 내용이 올라가 있으면 올리지 않는다.
 *
 * @returns 주소와, 이번에 실제로 올렸는지
 */
export async function ensureMusicUploaded(
  src: EpisodeMusicSource, abs: string, file: string,
): Promise<{ url: string; key: string; uploaded: boolean }> {
  const buf = await readFile(abs)
  const hash = fileHash(buf)
  const key = musicKey(hash, file)

  const seen = src.uploaded.get(key)
  if (seen) return { url: seen, key, uploaded: false }

  const url = publicUrl(key, false) // 키에 내용 해시가 있어 ?v= 가 필요 없다
  await uploadToR2(key, buf, MUSIC_CONTENT_TYPE)
  src.uploaded.set(key, url)
  return { url, key, uploaded: true }
}

/**
 * 되쓰기 판정 — 도감에 이미 같은 값이 있으면 손대지 않는다.
 * `checkedAt` 은 물어본 시각일 뿐이라 비교에서 뺀다(안 그러면 출간할 때마다 갱신으로 뜬다).
 */
export function musicChanged(dbValue: unknown, next: TagMusic | null): boolean {
  return strip(dbValue) !== strip(next)
}

function strip(v: unknown): string {
  if (!v || typeof v !== 'object') return 'null'
  const { checkedAt, ...rest } = v as Record<string, unknown>
  void checkedAt
  const entries = Object.entries(rest).filter(([, val]) => val !== undefined).sort(([a], [b]) => (a < b ? -1 : 1))
  return JSON.stringify(entries)
}
