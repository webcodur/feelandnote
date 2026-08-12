/**
 * 로컬 faction-data.json의 확정 이미지 경로만 제작 DB에 연결한다.
 *
 * 기본은 진단 전용이다. --apply를 붙여도 faction_clusters.image와
 * faction_people.image만 갱신하며, 빈 경로는 기존 DB 값을 유지한다.
 */

import { adminClient, readFactionData, scanEpisodes } from './lib.js'
import {
  asRows,
  assertLocalImage,
  byPosition,
  imagePath,
  parseArgs,
  type FactionImageRow,
  type ImageTarget,
} from './image-sync-utils.js'

async function main(): Promise<void> {
  const { folder, apply } = parseArgs(process.argv)
  const episode = scanEpisodes().find(item => item.folder === folder)
  if (!episode) throw new Error(`팩션 에피소드 폴더가 없음: ${folder}`)

  const local = readFactionData(episode.dataPath)
  const localGroups = asRows(local.groups)
  const db = adminClient()

  const { data: episodeRow, error: episodeError } = await db
    .from('faction_episodes').select('id,updated_at').eq('folder', folder).single()
  if (episodeError || !episodeRow) {
    throw new Error(`DB 에피소드 조회 실패(${folder}): ${episodeError?.message ?? '행 없음'}`)
  }

  const { data: groupData, error: groupError } = await db
    .from('faction_groups').select('id,position,part,name')
    .eq('episode_id', episodeRow.id).order('position')
  if (groupError) throw new Error(`DB 세력 조회 실패: ${groupError.message}`)
  const dbGroups = (groupData ?? []) as FactionImageRow[]
  if (localGroups.length !== dbGroups.length) {
    throw new Error(`세력 수 불일치: 로컬 ${localGroups.length}, DB ${dbGroups.length}`)
  }

  const groupIds = dbGroups.map(row => String(row.id))
  const { data: clusterData, error: clusterError } = groupIds.length
    ? await db.from('faction_clusters').select('id,group_id,position,label,image')
      .in('group_id', groupIds).order('position')
    : { data: [], error: null }
  if (clusterError) throw new Error(`DB 묶음 조회 실패: ${clusterError.message}`)
  const dbClusters = (clusterData ?? []) as FactionImageRow[]
  const clusterIds = dbClusters.map(row => String(row.id))

  const { data: peopleData, error: peopleError } = clusterIds.length
    ? await db.from('faction_people').select('id,cluster_id,position,slug,name,image')
      .in('cluster_id', clusterIds).order('position')
    : { data: [], error: null }
  if (peopleError) throw new Error(`DB 인물 조회 실패: ${peopleError.message}`)
  const dbPeople = (peopleData ?? []) as FactionImageRow[]

  const targets: ImageTarget[] = []
  let connectedClusters = 0
  let connectedPeople = 0

  for (let gi = 0; gi < dbGroups.length; gi++) {
    const dbGroup = dbGroups[gi]
    const localGroup = localGroups[gi]
    // 단일 파트 에피소드는 로컬에 part를 생략하고 DB에는 0으로 저장한다.
    const localPart = Number(localGroup.part ?? 0)
    const dbPart = Number(dbGroup.part ?? 0)
    if (localPart !== dbPart) {
      throw new Error(`세력 ${gi + 1} part 불일치: 로컬 ${localPart}, DB ${dbPart}`)
    }

    const localClusters = asRows(localGroup.clusters)
    const groupClusters = dbClusters
      .filter(row => row.group_id === dbGroup.id).sort(byPosition)
    if (localClusters.length !== groupClusters.length) {
      throw new Error(`part ${localPart} 묶음 수 불일치: 로컬 ${localClusters.length}, DB ${groupClusters.length}`)
    }

    for (let ci = 0; ci < groupClusters.length; ci++) {
      const dbCluster = groupClusters[ci]
      const localCluster = localClusters[ci]
      const clusterSubject = `part ${localPart} 묶음 ${ci + 1}`
      const clusterImage = imagePath(localCluster.image)
      if (clusterImage) {
        assertLocalImage(episode.dir, clusterImage, clusterSubject)
        connectedClusters++
        const before = imagePath(dbCluster.image)
        if (before !== clusterImage) {
          targets.push({
            table: 'faction_clusters', id: String(dbCluster.id), subject: clusterSubject,
            before, after: clusterImage,
          })
        }
      }

      const localPeople = asRows(localCluster.people)
      const clusterPeople = dbPeople
        .filter(row => row.cluster_id === dbCluster.id).sort(byPosition)
      if (localPeople.length !== clusterPeople.length) {
        throw new Error(`${clusterSubject} 인물 수 불일치: 로컬 ${localPeople.length}, DB ${clusterPeople.length}`)
      }

      for (let pi = 0; pi < clusterPeople.length; pi++) {
        const dbPerson = clusterPeople[pi]
        const localPerson = localPeople[pi]
        const localSlug = String(localPerson.slug ?? '')
        const dbSlug = String(dbPerson.slug ?? '')
        if (!localSlug || localSlug !== dbSlug) {
          throw new Error(`${clusterSubject} 인물 ${pi + 1} slug 불일치: 로컬 ${localSlug || '-'}, DB ${dbSlug || '-'}`)
        }
        const personImage = imagePath(localPerson.image)
        if (!personImage) continue
        const personSubject = `${clusterSubject} ${localSlug}`
        assertLocalImage(episode.dir, personImage, personSubject)
        connectedPeople++
        const before = imagePath(dbPerson.image)
        if (before !== personImage) {
          targets.push({
            table: 'faction_people', id: String(dbPerson.id), subject: personSubject,
            before, after: personImage,
          })
        }
      }
    }
  }

  console.log(`검증: 묶음 이미지 ${connectedClusters}개, 인물 이미지 ${connectedPeople}개`)
  console.log(`DB 변경 대상: ${targets.length}개`)
  for (const target of targets) {
    console.log(`  ${target.subject}: ${target.before ?? '(비어 있음)'} -> ${target.after}`)
  }
  if (!apply) {
    console.log('진단만 완료. 반영하려면 --apply를 붙인다.')
    return
  }

  const applied: ImageTarget[] = []
  try {
    for (const target of targets) {
      const update = db.from(target.table).update({ image: target.after }).eq('id', target.id)
      const guarded = target.before === null ? update.is('image', null) : update.eq('image', target.before)
      const { data, error } = await guarded.select('id').maybeSingle()
      if (error || !data) {
        throw new Error(`${target.subject} 갱신 실패: ${error?.message ?? 'DB 이미지가 진단 뒤 변경됨'}`)
      }
      applied.push(target)
    }
    if (applied.length) {
      const { data, error } = await db.from('faction_episodes')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', episodeRow.id)
        .eq('updated_at', episodeRow.updated_at)
        .select('id').maybeSingle()
      if (error || !data) {
        throw new Error(`에피소드 수정 시각 갱신 실패: ${error?.message ?? '진단 뒤 다른 수정이 발생함'}`)
      }
    }
  } catch (error) {
    const rollbackErrors: string[] = []
    for (const target of applied.reverse()) {
      const { data, error: rollbackError } = await db.from(target.table)
        .update({ image: target.before }).eq('id', target.id).eq('image', target.after)
        .select('id').maybeSingle()
      if (rollbackError || !data) {
        rollbackErrors.push(`${target.subject}: ${rollbackError?.message ?? '롤백 전 값이 다시 변경됨'}`)
      }
    }
    const suffix = rollbackErrors.length ? `; 롤백 실패: ${rollbackErrors.join(' | ')}` : '; 적용분 롤백 완료'
    throw new Error(`${error instanceof Error ? error.message : String(error)}${suffix}`)
  }

  console.log(`반영 완료: ${applied.length}개 이미지 필드`)
}

main().catch(error => {
  console.error(`오류: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
