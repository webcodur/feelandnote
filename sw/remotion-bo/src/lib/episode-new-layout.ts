/**
 * 신구조(책 단위 분할) 에피소드 입출력 모듈.
 *
 * 디스크 구조:
 *   {person}/
 *     meta.{ko,en}.json + meta.{ko,en}.timing.json
 *     books/{NN-제목}/
 *       book.{ko,en}.json + book.{ko,en}.timing.json
 *       shorts.{ko,en}.json + shorts.{ko,en}.timing.json
 *
 * 이 모듈의 출력 형태는 레거시 EpisodeData 와 동일하다 — UI / Remotion 은 신구조 여부를 모른다.
 */

import { existsSync } from 'fs'
import { readFile, readdir, writeFile, unlink } from 'fs/promises'
import path from 'path'
import { findEpisodeDir, parseEpisodeId } from './server-utils'
import { splitEpisodeData } from './episode-data'

/* eslint-disable @typescript-eslint/no-explicit-any */

export function isNewLayout(epDir: string): boolean {
  return existsSync(path.join(epDir, 'books'))
}

/** 책 폴더 목록을 NN- prefix 순서대로 반환 */
export async function listBookFolders(epDir: string): Promise<string[]> {
  const booksDir = path.join(epDir, 'books')
  try {
    const entries = await readdir(booksDir, { withFileTypes: true })
    return entries
      .filter(e => e.isDirectory() && /^\d+-/.test(e.name))
      .map(e => e.name)
      .sort()
  } catch { return [] }
}

async function readJsonOrNull(fp: string): Promise<any> {
  try { return JSON.parse(await readFile(fp, 'utf-8')) } catch { return null }
}

export async function loadNewLayoutEpisode(name: string) {
  const { person, locale } = parseEpisodeId(name)
  const found = findEpisodeDir(person)!
  const epDir = found.dir

  const metaContent = await readJsonOrNull(path.join(epDir, `meta.${locale}.json`))
  if (!metaContent) throw new Error(`meta.${locale}.json 없음: ${person}`)
  const metaTiming = (await readJsonOrNull(path.join(epDir, `meta.${locale}.timing.json`))) ?? {}

  const folders = await listBookFolders(epDir)
  const books: any[] = []
  const shortsArr: any[] = []

  for (let i = 0; i < folders.length; i++) {
    const bd = path.join(epDir, 'books', folders[i])

    const book = await readJsonOrNull(path.join(bd, `book.${locale}.json`))
    if (!book) continue  // 해당 locale 미작성 책은 skip
    const bookT = (await readJsonOrNull(path.join(bd, `book.${locale}.timing.json`))) ?? {}

    const merged: any = { ...book, ...bookT }
    if (bookT.quotePairDurations && Array.isArray(merged.quotePairs)) {
      merged.quotePairs = merged.quotePairs.map((p: any, pi: number) => ({
        ...p, ...(bookT.quotePairDurations[pi] ?? {}),
      }))
      delete merged.quotePairDurations
    }
    books.push(merged)

    const sc = await readJsonOrNull(path.join(bd, `shorts.${locale}.json`))
    if (sc) {
      const st = (await readJsonOrNull(path.join(bd, `shorts.${locale}.timing.json`))) ?? {}
      const mergedShorts: any = { ...sc, featuredBookIndex: i }
      if (st.segments && Array.isArray(sc.segments)) {
        mergedShorts.segments = sc.segments.map((seg: any, si: number) => ({
          ...seg, ...(st.segments[si] ?? {}),
        }))
      }
      shortsArr.push(mergedShorts)
    }
  }

  const result: any = {
    ...metaContent,
    voiceTimings: metaTiming.voiceTimings ?? metaContent.voiceTimings,
    narrator: { ...metaContent.narrator, ...metaTiming.narrator },
    host: { ...metaContent.host, ...metaTiming.host },
    books,
  }
  if (shortsArr.length > 0) result.shorts = shortsArr
  return result
}

/**
 * 신구조 통저장 — meta + 책별 + 쇼츠별 파일을 한 번에 분해 기록.
 *
 * 책 매핑: data.books[i] ↔ books/ 폴더 i번째 (NN- prefix 정렬 순서).
 *   - 새 책 추가는 별도 API 에서 폴더 생성이 선행되어야 한다 (현재는 skip 경고).
 *   - 책 삭제는 별도 API 에서 폴더 제거 처리 (이 함수는 잉여 폴더를 건드리지 않는다).
 *
 * 쇼츠: data.shorts[].featuredBookIndex 가 가리키는 책 폴더에 저장.
 *   - 책 폴더당 0~1개 (1책=1쇼츠 원칙).
 *   - 입력에서 빠진 책의 기존 shorts.{locale}.json 은 제거한다.
 *
 * scope — 어떤 파일군을 기록할지 한정한다(교차 덮어쓰기 방지).
 *   - 'all'(기본): meta + books + shorts 전부 (하위호환)
 *   - 'longform' : meta + books 만 (shorts 파일은 손대지 않음)
 *   - 'shorts'   : shorts 만 (meta·books 파일은 손대지 않음)
 *   solo.{locale}.json 은 어떤 scope 에서도 건드리지 않는다(별도 PATCH API 전담).
 */
export type SaveScope = 'all' | 'longform' | 'shorts'

export async function saveNewLayoutEpisode(name: string, data: any, scope: SaveScope = 'all') {
  const { person, locale } = parseEpisodeId(name)
  const found = findEpisodeDir(person)!
  const epDir = found.dir

  const { content, timing } = splitEpisodeData(data)
  const folders = await listBookFolders(epDir)

  const writeMetaBooks = scope === 'all' || scope === 'longform'
  const writeShorts = scope === 'all' || scope === 'shorts'

  // meta — books·shorts 제외
  if (writeMetaBooks) {
    const metaContent: any = { ...content }; delete metaContent.books
    const metaTiming: any = { ...timing }; delete metaTiming.books
    await writeFile(path.join(epDir, `meta.${locale}.json`),
      JSON.stringify(metaContent, null, 2) + '\n', 'utf-8')
    if (Object.keys(metaTiming).length > 0) {
      await writeFile(path.join(epDir, `meta.${locale}.timing.json`),
        JSON.stringify(metaTiming, null, 2) + '\n', 'utf-8')
    }
  }

  // books
  const books: any[] = writeMetaBooks && Array.isArray(content.books) ? content.books : []
  const bookTimings: any[] = Array.isArray(timing.books) ? timing.books : []
  for (let i = 0; i < books.length; i++) {
    const folder = folders[i]
    if (!folder) {
      console.warn(`[saveEpisode] 책 ${i} 에 대응하는 폴더 없음 — 책 추가 API 필요`)
      continue
    }
    const bd = path.join(epDir, 'books', folder)
    await writeFile(path.join(bd, `book.${locale}.json`),
      JSON.stringify(books[i], null, 2) + '\n', 'utf-8')
    if (bookTimings[i] && Object.keys(bookTimings[i]).length > 0) {
      await writeFile(path.join(bd, `book.${locale}.timing.json`),
        JSON.stringify(bookTimings[i], null, 2) + '\n', 'utf-8')
    }
  }

  // shorts — featuredBookIndex 로 책 폴더 매칭
  const originalShorts: any[] = writeShorts && Array.isArray(data?.shorts) ? data.shorts : []
  const usedBookIndices = new Set<number>()
  for (const sc of originalShorts) {
    const idx = sc?.featuredBookIndex
    if (typeof idx !== 'number' || !folders[idx]) {
      console.warn(`[saveEpisode] shorts featuredBookIndex 매칭 실패: ${idx}`)
      continue
    }
    usedBookIndices.add(idx)
    const bd = path.join(epDir, 'books', folders[idx])
    const sCopy: any = JSON.parse(JSON.stringify(sc))
    delete sCopy.featuredBookIndex

    // segment duration 분리
    const segDur: any[] = []
    if (Array.isArray(sCopy.segments)) {
      sCopy.segments = sCopy.segments.map((s: any) => {
        const d: any = {}
        if (s.duration != null) { d.duration = s.duration; const { duration, ...rest } = s; segDur.push(d); return rest }
        segDur.push(d); return s
      })
    }
    await writeFile(path.join(bd, `shorts.${locale}.json`),
      JSON.stringify(sCopy, null, 2) + '\n', 'utf-8')
    if (segDur.some(d => Object.keys(d).length > 0)) {
      const existingTiming = await readJsonOrNull(path.join(bd, `shorts.${locale}.timing.json`))
      const next = { ...(existingTiming ?? {}), segments: segDur }
      await writeFile(path.join(bd, `shorts.${locale}.timing.json`),
        JSON.stringify(next, null, 2) + '\n', 'utf-8')
    }
  }

  // 입력에서 빠진 책의 기존 shorts.{locale}.json 정리 — shorts 기록 scope 에서만 수행
  // (longform scope 에서는 shorts 파일을 절대 건드리지 않는다)
  if (writeShorts) {
    for (let i = 0; i < folders.length; i++) {
      if (usedBookIndices.has(i)) continue
      const bd = path.join(epDir, 'books', folders[i])
      const sf = path.join(bd, `shorts.${locale}.json`)
      if (existsSync(sf)) {
        await unlink(sf).catch(() => {})
        await unlink(path.join(bd, `shorts.${locale}.timing.json`)).catch(() => {})
      }
    }
  }

  // 1권 모드(SOLO) 자유섹션(solo.{locale}.json)은 별도 PATCH API로만 관리한다.
  // 전체 저장은 이 파일을 건드리지 않는다(책 본문과 독립된 솔로 전용 데이터).
}
