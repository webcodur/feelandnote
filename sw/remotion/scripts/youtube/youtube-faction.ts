/**
 * youtube-faction.ts — 세력도(Faction) YouTube 업로드 진입점
 *
 * 서재 탐방과 데이터 모델·출력 경로가 완전히 달라 분리한다.
 * 공통 인프라(OAuth·업로드)는 youtube-core 를, 메타 생성은 youtube-faction-meta 를 쓴다.
 *
 * 현재 범위: 한국어 세로 영상만. 서재 탐방과 같은 채널(KO)에 비공개로 올린다.
 *   - 세로 롱폼:   out/Faction/{episode}-KO-LV.mp4   (ko-longform) — 편 경계(cut) 있으면 KO-LV{N}.mp4 (ko-longform-{N}, lvPart N)
 *   - 세로 쇼츠 N편: out/Faction/{episode}-KO-S{N}.mp4 (ko-shorts-{N}, part N) — 진영 part 의 편 수만큼. 편 없으면 KO-S1 하나.
 * 영상 종류(컴포지션·출력 접미사)는 factionVariants(@feelandnote/shared, 진영 part 기반) 단일원천을 따른다.
 * 가로(LH)·영문(EN)은 렌더가 켜지면 그 표에 추가한다.
 */

import { google } from 'googleapis'
import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  OUT_DIR,
  getAuthedClient,
  uploadVideoWithSnippet,
  upsertCaption,
  setThumbnail,
} from './youtube-core.js'
import {
  factionVariants,
  buildFactionTitle,
  buildFactionDescription,
  buildFactionTags,
  buildFactionSnippet,
  type FactionMetaInput,
  type FactionVariantDef,
} from '@feelandnote/shared/lib/youtube-faction-meta'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FACTIONS_DIR = path.join(__dirname, '..', '..', 'public', 'factions')
const LINEUP_PATH = path.join(__dirname, 'faction-lineup.json')

// ─── 데이터 ─────────────────────────────────────────────

async function loadFactionData(episode: string): Promise<FactionMetaInput> {
  const dataPath = path.join(FACTIONS_DIR, episode, 'faction-data.json')
  if (!existsSync(dataPath)) {
    throw new Error(`세력도 데이터 없음: ${dataPath}`)
  }
  const raw = JSON.parse(await readFile(dataPath, 'utf-8'))
  // faction-data.json 상위 필드가 FactionMetaInput 과 동일 구조다(title/titleEn/heroes/groups...).
  return raw as FactionMetaInput
}

function variantFiles(episode: string, v: FactionVariantDef) {
  const dir = path.join(OUT_DIR, 'Faction')
  const base = `${episode}-${v.fileSuffix}`
  const video = path.join(dir, `${base}.mp4`)
  const srt = path.join(dir, `${base}.srt`)
  const thumb = path.join(dir, `${base}-THUMB.png`)
  return {
    video: existsSync(video) ? video : null,
    srt: existsSync(srt) ? srt : null,
    thumb: existsSync(thumb) ? thumb : null,
  }
}

/** --type longform|shorts 필터 — 미지정이면 전체 */
function matchType(v: FactionVariantDef, filterType?: string): boolean {
  if (!filterType) return true
  if (filterType === 'shorts') return v.isShorts
  if (filterType === 'longform') return !v.isShorts
  return true
}

// ─── 업로드 기록 (faction-lineup.json) ──────────────────

type FactionLineup = Record<string, { uploads?: Record<string, { videoId: string; uploadedAt: string }> }>

async function readLineup(): Promise<FactionLineup> {
  if (!existsSync(LINEUP_PATH)) return {}
  try { return JSON.parse(await readFile(LINEUP_PATH, 'utf-8')) as FactionLineup }
  catch { return {} }
}

async function saveUploadRecord(episode: string, variantKey: string, videoId: string) {
  const all = await readLineup()
  if (!all[episode]) all[episode] = {}
  if (!all[episode].uploads) all[episode].uploads = {}
  all[episode].uploads![variantKey] = { videoId, uploadedAt: new Date().toISOString() }
  await writeFile(LINEUP_PATH, JSON.stringify(all, null, 2) + '\n', 'utf-8')
  console.log(`  faction-lineup.json 기록: ${variantKey} → ${videoId}`)
}

// ─── 메타 ───────────────────────────────────────────────

function buildSnippetFor(data: FactionMetaInput, v: FactionVariantDef) {
  const title = buildFactionTitle(data, 'ko', v.isShorts, v.part, v.lvPart)
  const description = buildFactionDescription(data, 'ko', v.isShorts, v.part, v.lvPart)
  const tags = buildFactionTags(data, 'ko', v.isShorts, v.part, v.lvPart)
  return { title, description, tags, snippet: buildFactionSnippet({ title, description, tags, lang: 'ko' }) }
}

// ─── 업로드 ─────────────────────────────────────────────

export async function uploadFaction(episode: string, filterType?: string, dry = false) {
  const data = await loadFactionData(episode)

  const variants = factionVariants(data.groups, data.longformLayout).filter(v => matchType(v, filterType))

  let yt: ReturnType<typeof google.youtube> | null = null
  async function getYt() {
    if (dry) return null
    if (!yt) yt = google.youtube({ version: 'v3', auth: await getAuthedClient('ko') })
    return yt
  }

  console.log(`\n세력도 에피소드: ${episode}`)
  console.log(`대상: ${variants.map(v => v.key).join(', ')}\n`)

  for (const v of variants) {
    const { title, description, snippet } = buildSnippetFor(data, v)
    const files = variantFiles(episode, v)

    console.log(`── ${v.label} (${v.key}, KO채널) ──`)
    console.log(`  제목: ${title}`)

    if (dry) {
      console.log(`  영상: ${files.video ?? '없음 (미렌더)'}`)
      console.log(`  자막: ${files.srt ?? '없음'}`)
      console.log(`  썸네일: ${files.thumb ?? '없음'}`)
      console.log(`  태그(${snippet.tags.length}): ${snippet.tags.join(', ')}`)
      console.log(`  공개: private (고정)`)
      console.log(`  ── 설명 미리보기 ──\n${description.split('\n').map(l => '    ' + l).join('\n')}`)
      continue
    }

    if (!files.video) {
      console.log(`  건너뜀: 영상 파일 없음 (${episode}-${v.fileSuffix}.mp4)`)
      continue
    }

    const client = await getYt()
    if (!client) continue
    const videoId = await uploadVideoWithSnippet(client, files.video, snippet, 'private')

    if (files.srt) {
      console.log('  자막 업로드 대기 (10초)...')
      await new Promise(r => setTimeout(r, 10_000))
      try { await upsertCaption(client, videoId, files.srt, 'ko') }
      catch (e: any) { console.warn(`  자막 업로드 실패: ${e.message}`) }
    }
    if (files.thumb) await setThumbnail(client, videoId, files.thumb)

    await saveUploadRecord(episode, v.key, videoId)
    console.log()
  }

  console.log('완료.')
}

// ─── 삭제 (YouTube 영상 삭제 + 업로드 기록 제거) ─────────

async function removeUploadRecord(episode: string, variantKey: string) {
  const all = await readLineup()
  const uploads = all[episode]?.uploads
  if (!uploads?.[variantKey]) return
  delete uploads[variantKey]
  await writeFile(LINEUP_PATH, JSON.stringify(all, null, 2) + '\n', 'utf-8')
  console.log(`  faction-lineup.json 기록 제거: ${variantKey}`)
}

/**
 * 업로드된 세력도 영상을 YouTube 에서 삭제하고 업로드 기록도 지운다.
 * 되돌릴 수 없다 — 호출부(스킬·BO)에서 사용자 확인을 받은 뒤 실행한다.
 */
export async function deleteFactionUploads(episode: string, filterType?: string, dry = false) {
  const data = await loadFactionData(episode)
  const lineup = await readLineup()
  const uploads = lineup[episode]?.uploads
  if (!uploads || Object.keys(uploads).length === 0) {
    console.error(`업로드 기록 없음: faction-lineup.json 의 ${episode}.uploads 가 비어 있다.`)
    process.exit(1)
  }

  const variants = factionVariants(data.groups, data.longformLayout).filter(v => uploads[v.key] && matchType(v, filterType))
  if (variants.length === 0) {
    console.error(`대상 없음: ${episode} 에 삭제할 업로드가 없다(--type 필터 확인).`)
    process.exit(1)
  }

  let yt: ReturnType<typeof google.youtube> | null = null
  async function getYt() {
    if (dry) return null
    if (!yt) yt = google.youtube({ version: 'v3', auth: await getAuthedClient('ko') })
    return yt
  }

  console.log(`\n세력도 에피소드: ${episode} (삭제 모드)`)
  console.log(`대상: ${variants.map(v => v.key).join(', ')}\n`)

  for (const v of variants) {
    const videoId = uploads[v.key]!.videoId
    const { title } = buildSnippetFor(data, v)
    console.log(`── ${v.label} (${v.key}, videoId=${videoId}) ──`)
    console.log(`  제목: ${title}`)
    console.log(`  https://youtu.be/${videoId}`)

    if (dry) { console.log('  (dry: 삭제 호출 생략)'); continue }

    const client = await getYt()
    if (!client) continue
    await client.videos.delete({ id: videoId })
    console.log('  YouTube 삭제 완료')
    await removeUploadRecord(episode, v.key)
  }

  console.log('완료.')
}

// ─── 메타 패치 (영상 그대로, 제목·설명·태그만 갱신) ──────

export async function patchFactionMetadata(episode: string, filterType?: string, dry = false) {
  const data = await loadFactionData(episode)
  const lineup = await readLineup()
  const uploads = lineup[episode]?.uploads
  if (!uploads || Object.keys(uploads).length === 0) {
    console.error(`업로드 기록 없음: faction-lineup.json 의 ${episode}.uploads 가 비어 있다.`)
    process.exit(1)
  }

  const variants = factionVariants(data.groups, data.longformLayout).filter(v => uploads[v.key] && matchType(v, filterType))

  let yt: ReturnType<typeof google.youtube> | null = null
  async function getYt() {
    if (dry) return null
    if (!yt) yt = google.youtube({ version: 'v3', auth: await getAuthedClient('ko') })
    return yt
  }

  console.log(`\n세력도 에피소드: ${episode} (메타 패치 모드)`)
  console.log(`대상: ${variants.map(v => v.key).join(', ')}\n`)

  for (const v of variants) {
    const videoId = uploads[v.key]?.videoId
    if (!videoId) { console.log(`── ${v.key}: 업로드 기록 없음, 건너뜀`); continue }

    const { title, snippet } = buildSnippetFor(data, v)
    console.log(`── ${v.label} (videoId=${videoId}) ──`)
    console.log(`  제목: ${title}`)

    if (dry) { console.log('  (dry: PUT 호출 생략)'); continue }

    const client = await getYt()
    if (!client) continue
    try {
      await client.videos.update({ part: ['snippet'], requestBody: { id: videoId, snippet } })
      console.log('  YouTube 갱신 완료')
    } catch (e: any) {
      console.error(`  YouTube 갱신 실패: ${e.message}`)
    }
  }

  console.log('완료.')
}
