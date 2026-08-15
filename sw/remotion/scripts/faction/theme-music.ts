/**
 * theme-music.ts — 세력별 「실제로 흐르는 곡」 산출 (읽기 전용 CLI)
 *
 * 사용:
 *   npx tsx scripts/faction/theme-music.ts --episode PayPal-Mafia
 *   → stdout 에 JSON 한 덩어리
 *
 * ## 왜 여기 있나
 *
 * 어느 곡이 흐르는지는 **엔진의 선곡 모듈(`src/compositions/Faction/bgm-select.ts`)이 유일 출처**다.
 * 관리 화면(web-bo)이 그 판정을 다시 쓰면 언젠가 엔진과 어긋나고, 어긋난 날 도감에 엉뚱한 곡이 걸린다.
 * 그래서 렌더 창고(`scripts/render/stage.ts`)가 그랬듯 이 CLI 도 **같은 함수를 부른다** —
 * `chapterMusicBounds` · `chapterBgmSegments` · `globalBgmTracks` · `buildCues` 를 그대로 쓰고,
 * 「어느 파일이 이기는가」를 여기서 새로 정하지 않는다.
 *
 * 관리 화면은 이 CLI 를 자식 프로세스로 부르고 결과만 받아 쓴다(개인샷 아바타 승격이
 * 스크립트를 부르는 것과 같은 방식).
 *
 * ## 무엇을 내놓나
 *
 * 세력(groups 인덱스)마다 **그 세력 구간에서 처음 흐르는 곡 한 곡**이다. 규칙:
 *
 *   ① 영상 종류(변형)를 고른다 — `factionVariants` 가 목록의 단일원천이다.
 *      세로 롱폼이 있으면 그것을 본다(챕터마다 곡이 갈리므로 세력 단위 해상도가 가장 높다).
 *      롱폼이 없거나 곡을 못 찾으면 그 세력이 속한 쇼츠 편을 본다.
 *   ② 롱폼(챕터 단위 모드) — 그 세력의 첫 컷이 놓인 프레임을 덮는 곡 구간의 파일.
 *      챕터 경계가 없으면 전역 모드와 같다.
 *   ③ 쇼츠(전역 모드) — 그 편의 재생 목록 첫 곡(`globalBgmTracks` 순서 그대로).
 *
 * `disabled` 세력은 곡이 없고, `longformOnly` 세력은 롱폼에서 실제로 흐르는 곡을 고른다.
 *
 * ⚠ 이 폴더는 `sw/remotion/tsconfig.json` 의 include 밖이라 `npx tsc --noEmit` 으로 검사되지 않는다.
 *   고친 뒤에는 컴파일러 옵션을 직접 줘서 따로 검사한다(lib.ts 머리말과 같은 주의).
 */

import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { factionLongformSegments } from '@feelandnote/shared/lib/faction-longform'
import { factionVariants, type FactionVariantDef } from '@feelandnote/shared/lib/youtube-faction-meta'
import { episodeDirOf } from '@feelandnote/shared/bo/episode-store'
import { FACTIONS_DIR, ROOT, parseArgs } from './lib.js'

import { buildCues } from '../../src/compositions/Faction/timing.js'
import {
  chapterMusicBounds, chapterBgmSegments, usesChapterBgm, globalBgmTracks,
} from '../../src/compositions/Faction/bgm-select.js'
import type { FactionScript } from '../../src/compositions/Faction/types.js'

/** 곡이 놓인 자리 — `staticFile('music/<파일>')` 이 부르는 그 폴더 */
const MUSIC_DIR = path.join(ROOT, 'public', 'music')

/** 세력 한 칸의 결과 */
export interface ThemeMusicGroup {
  /** groups[] 인덱스 */
  index: number
  /** 세력 명칭 첫 줄 — 사람이 결과를 읽을 때만 쓴다 */
  name: string
  /** 판정에 쓴 영상 종류 키(`ko-longform`·`ko-shorts-2`…). 곡이 없으면 null */
  variant: string | null
  /** `music/` 아래 파일 이름. 흐르는 곡이 없으면 null */
  file: string | null
  /** 그 파일의 절대경로. 파일이 실제로 없으면 null(사유는 note) */
  abs: string | null
  /** 사람에게 보여줄 한 줄 */
  note: string
}

export interface ThemeMusicResult {
  episode: string
  musicDir: string
  groups: ThemeMusicGroup[]
}

/** 통합 명칭(앞부분\n뒷부분)의 첫 줄 */
function firstLine(v: unknown): string {
  return typeof v === 'string' ? v.split('\n')[0].trim() : ''
}

/**
 * 롱폼 편(lvPart)에 속하는 세력 인덱스 — 바깥 편성 또는 세력 내부 sequence 경계로 가른 구간.
 * 배치에 빠진 활성 세력은 마지막 구간에 붙는다(`youtube-faction-meta`·`timing` 과 같은 규칙).
 */
function lvPartGroupIndexes(script: FactionScript, lvPart: number): Set<number> | null {
  const segments = factionLongformSegments(
    script.groups as unknown as Array<Record<string, unknown>>,
    script.longformLayout,
  )
  if (segments.length <= 1) return null
  return new Set((segments[lvPart - 1] ?? []).flatMap(step => 'gi' in step ? [step.gi] : []))
}

/** 이 세력이 나오는 쇼츠 편 — part 미지정(공통)은 모든 편에 나오므로 첫 편으로 본다 */
function shortsVariantOf(g: { part?: number }, shortsList: FactionVariantDef[]): FactionVariantDef | undefined {
  const want = g.part && g.part > 0 ? g.part : shortsList[0]?.part
  return shortsList.find(v => v.part === want) ?? shortsList[0]
}

/** 이 세력이 속한 롱폼 편 — 편 경계가 없으면 통짜 한 편 */
function longformVariantOf(
  script: FactionScript, gi: number, longforms: FactionVariantDef[],
): FactionVariantDef | undefined {
  if (longforms.length <= 1) return longforms[0]
  for (const v of longforms) {
    if (v.lvPart == null) continue
    const set = lvPartGroupIndexes(script, v.lvPart)
    if (!set || set.has(gi)) return v
  }
  return undefined
}

/**
 * 한 변형에서 이 세력 구간에 흐르는 곡.
 *
 * 챕터 단위 모드면 그 세력의 첫 컷 프레임을 덮는 구간의 파일을, 전역 모드면 재생 목록 첫 곡을 돌려준다.
 * 선곡 판정은 전부 엔진 함수가 한다 — 여기서 파일을 고르는 규칙을 새로 쓰지 않는다.
 */
function musicOfGroupInVariant(
  script: FactionScript, gi: number, v: FactionVariantDef,
): string | undefined {
  const portrait = v.isShorts
  const cues = buildCues(script, portrait, v.part, v.lvPart)
  const bounds = chapterMusicBounds(cues)

  if (usesChapterBgm(portrait, bounds)) {
    const segs = chapterBgmSegments(script, bounds, Number.MAX_SAFE_INTEGER)
    if (!segs.length) return undefined
    // 이 세력의 첫 컷 — 로고 컷·묶음 컷·인물 컷 중 가장 앞선 것
    const first = cues.find(tc => 'groupIndex' in tc.cue && tc.cue.groupIndex === gi)
    if (!first) return undefined
    // 그 프레임을 덮는 구간 = from 이 그 앞이면서 가장 뒤인 구간
    let hit: string | undefined
    for (const s of segs) {
      if (s.from <= first.start) hit = s.file
      else break
    }
    return hit ?? segs[0].file
  }

  return globalBgmTracks(script, v.part)[0]?.file
}

export function collectThemeMusic(script: FactionScript, episode: string): ThemeMusicResult {
  const groups = script.groups ?? []
  const variants = factionVariants(
    groups,
    script.longformLayout as never,
  )
  const longforms = variants.filter(v => !v.isShorts)
  const shortsList = variants.filter(v => v.isShorts)

  const out: ThemeMusicGroup[] = groups.map((g, gi) => {
    const name = firstLine(g.name) || `세력 ${gi + 1}`
    const blank = { index: gi, name, variant: null, file: null, abs: null }

    // 모든 영상에서 뺀 세력만 제외한다. longformOnly 는 아래 롱폼 우선 판정에 그대로 들어간다.
    if (g.disabled) return { ...blank, note: '영상에서 뺀 세력' }

    // 롱폼 먼저(챕터마다 곡이 갈려 세력 단위 해상도가 가장 높다), 없으면 그 세력의 쇼츠 편
    const order = [longformVariantOf(script, gi, longforms), shortsVariantOf(g, shortsList)]
      .filter((v): v is FactionVariantDef => !!v)

    for (const v of order) {
      const file = musicOfGroupInVariant(script, gi, v)
      if (!file) continue
      const abs = path.join(MUSIC_DIR, file)
      if (!existsSync(abs)) {
        return { index: gi, name, variant: v.key, file, abs: null, note: `곡 파일 없음: ${file}` }
      }
      return { index: gi, name, variant: v.key, file, abs, note: `${v.key} → ${file}` }
    }
    return { ...blank, note: '이 세력 구간에 흐르는 곡이 없다' }
  })

  return { episode, musicDir: MUSIC_DIR, groups: out }
}

async function main() {
  const args = parseArgs(process.argv, 'npx tsx scripts/faction/theme-music.ts --episode <폴더명>')
  const episode = args.episodes[0]
  if (!episode) throw new Error('--episode <폴더명> 이 필요합니다')

  const dataPath = path.join(episodeDirOf(FACTIONS_DIR, episode), 'faction-data.json')
  if (!existsSync(dataPath)) throw new Error(`에피소드 데이터가 없습니다: ${dataPath}`)
  const script = JSON.parse(readFileSync(dataPath, 'utf-8')) as FactionScript

  // stdout 은 오직 결과 JSON 만 — 부르는 쪽이 그대로 파싱한다(잡말이 섞이면 파싱이 깨진다)
  process.stdout.write(JSON.stringify(collectThemeMusic(script, episode)))
}

// 다른 모듈이 import 할 때는 돌지 않게 — 직접 실행일 때만
if (process.argv[1] && path.resolve(process.argv[1]).includes(path.join('faction', 'theme-music'))) {
  main().catch(e => { console.error(e instanceof Error ? e.message : String(e)); process.exit(1) })
}
