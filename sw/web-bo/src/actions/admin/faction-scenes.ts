'use server'

import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { revalidatePath } from 'next/cache'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import { toTeamImages, toSceneImages, type FactionTeamImage } from '@feelandnote/shared/lib/faction-team-image'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { requireAdmin } from '@/lib/admin-auth'
import { createClient } from '@/lib/db/server'
import { revalidateWebLists } from '@/lib/revalidate-web'
import { uploadToR2, R2_PUBLIC_URL } from '@/lib/r2'
import { coverIndex, mergeSceneArtwork, validateSceneDraft, stableArtworkJSON, SCENE_UPLOAD_MAX_BYTES } from '@/lib/faction-scene-editor'
import { getFactionMembers } from './factions/entries'
import { uploadFactionTeamImage } from './storage'

const revisionOf = (value: unknown) => createHash('sha256').update(stableArtworkJSON(value)).digest('hex')
type ArtworkRow = { id: string; name: string; name_en: string | null; slug: string | null; is_myth: boolean; team_images: unknown }

export interface SceneEntrySummary {
  id: string; name: string; nameEn: string | null; slug: string | null; isMyth: boolean
  sceneCount: number; koCount: number; enCount: number; hasCover: boolean
}

export async function listSceneEntries(): Promise<SceneEntrySummary[]> {
  await requireAdmin()
  const db = await createClient()
  const rows = await selectAllPages<ArtworkRow>((from, to) => db.from('faction_lv2')
    .select('id,name,name_en,slug,is_myth,team_images').order('name').order('id').range(from, to))
  return rows.map(row => ({
    id: row.id, name: row.name, nameEn: row.name_en, slug: row.slug, isMyth: row.is_myth,
    sceneCount: toTeamImages(row.team_images).filter(image => image.kind === 'scene').length,
    koCount: toSceneImages(row.team_images, 'ko').length, enCount: toSceneImages(row.team_images, 'en').length,
    hasCover: coverIndex(row.team_images, row.is_myth) >= 0,
  }))
}

export async function getSceneEditorData(id: string) {
  await requireAdmin()
  const db = await createClient()
  const { data, error } = await db.from('faction_lv2').select('id,name,slug,is_myth,team_images').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  const images = toTeamImages(data.team_images)
  const index = coverIndex(data.team_images, data.is_myth)
  const raw = Array.isArray(data.team_images) ? data.team_images : []
  return {
    id: data.id, name: data.name, slug: data.slug, isMyth: data.is_myth,
    revision: revisionOf(data.team_images),
    cover: index < 0 ? null : toTeamImages([raw[index]])[0] ?? null,
    scenes: images.filter(image => image.kind === 'scene'),
    members: await getFactionMembers(id),
  }
}
export type SceneEditorData = NonNullable<Awaited<ReturnType<typeof getSceneEditorData>>>

export async function saveSceneArtwork(input: { id: string; revision: string; scenes: FactionTeamImage[]; cover: FactionTeamImage | null }) {
  await requireAdmin()
  const db = await createClient()
  const { data: current, error } = await db.from('faction_lv2').select('team_images,is_myth,xmin').eq('id', input.id).single()
  if (error) return { success: false as const, error: error.message || '저장 전 내용을 확인하지 못했습니다. 잠시 뒤 다시 저장해 주세요.' }
  if (revisionOf(current.team_images) !== input.revision) return { success: false as const, error: '다른 곳에서 이미지나 설명이 수정됐습니다. 입력한 내용을 복사한 뒤 새로고침해 주세요.' }
  const invalid = validateSceneDraft(input.scenes, input.cover, current.is_myth)
  if (invalid) return { success: false as const, error: invalid }
  const next = mergeSceneArtwork(current.team_images, input.scenes, input.cover, current.is_myth)
  const revision = revisionOf(next)
  let warning: string | undefined
  if (revision !== input.revision) {
    // 긴 JSON 비교 조건은 REST 주소 제한(414)에 걸린다. 방금 읽은 PostgreSQL 행 버전으로 경합을 막는다.
    // xmin은 DB의 기존 시스템 열이며, 장기 편집 충돌은 위의 내용 해시로 검사한다.
    const saved = await db.from('faction_lv2')
      .update({ team_images: next, updated_at: new Date().toISOString() })
      .eq('id', input.id).eq('xmin', current.xmin).select('id').maybeSingle()
    if (saved.error) return { success: false as const, error: saved.error.message || `저장 요청이 실패했습니다 (${saved.status}). 편집 내용은 유지되므로 다시 시도해 주세요.` }
    if (!saved.data) return { success: false as const, error: '저장하는 사이 다른 수정이 들어왔습니다. 새로고침 후 다시 확인해 주세요.' }
    revalidatePath('/faction-scenes')
    revalidatePath('/myths')
    revalidatePath('/factions/[entry]', 'page')
    // 신화·팩션의 목록 데이터에 장면도 함께 들어 있으므로 해당 목록만 갱신한다.
    try { await revalidateWebLists(CACHE_TAGS.FACTIONS) }
    catch { warning = '내용은 저장했지만 사용자 화면의 캐시 갱신에 실패했습니다. 잠시 뒤 사용자 화면을 다시 확인해 주세요.' }
  }
  return { success: true as const, revision, warning }
}

export async function uploadSceneArtwork(form: FormData) {
  await requireAdmin()
  const id = form.get('id'), role = form.get('role'), file = form.get('file')
  if (typeof id !== 'string' || !['cover', 'scene'].includes(String(role)) || !(file instanceof File)) return { success: false as const, error: '업로드할 파일과 대상을 확인해 주세요.' }
  if (!file.size || file.size > SCENE_UPLOAD_MAX_BYTES) return { success: false as const, error: '업로드할 파일은 9 MB 이하로 준비해 주세요.' }
  const db = await createClient()
  const { data: entry, error } = await db.from('faction_lv2').select('slug,is_myth').eq('id', id).single()
  if (error) return { success: false as const, error: '등록할 신화·팩션을 찾을 수 없습니다.' }
  try {
    const body = Buffer.from(await file.arrayBuffer())
    if (role === 'cover' && entry.is_myth) {
      const metadata = await sharp(body).metadata()
      if ((metadata.pages ?? 1) > 1) return { success: false as const, error: '신화 시작 그림에는 정지 이미지를 등록해 주세요.' }
      const png = await sharp(body).rotate().png().toBuffer()
      const hash = createHash('sha256').update(png).digest('hex').slice(0, 12)
      const slug = (entry.slug || id).toLowerCase().replace(/[^a-z0-9-]/g, '-')
      const key = `myth/title-art/${slug}-${hash}.png`
      await uploadToR2(key, png, 'image/png')
      return { success: true as const, url: `${R2_PUBLIC_URL.replace(/\/$/, '')}/${key}` }
    }
    return await uploadFactionTeamImage({ lv2Id: id, image: `data:application/octet-stream;base64,${body.toString('base64')}` })
  } catch (error) { return { success: false as const, error: error instanceof Error ? error.message : '이미지를 올리지 못했습니다.' } }
}
