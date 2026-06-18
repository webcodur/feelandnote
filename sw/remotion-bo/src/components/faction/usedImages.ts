import type { FactionScript } from '@/lib/faction-types'

/**
 * FactionScript 데이터에서 영상에 연결된 이미지 경로를 모두 수집한다.
 * 수집 대상: group.titleArt·image·logo, cluster.image, person.image.
 * heroes는 slug라 별도 수집 불필요 — person.image로 이미 잡힌다.
 * 외부 URL(http로 시작)은 풀(로컬 파일)과 무관하므로 제외한다.
 */
export function collectUsedImages(script: FactionScript | null): Set<string> {
  const used = new Set<string>()
  if (!script) return used

  const add = (img?: string) => {
    if (!img || img.startsWith('http')) return
    used.add(img)
  }

  for (const group of script.groups ?? []) {
    add(group.titleArt)
    add(group.image)
    add(group.logo)
    for (const cluster of group.clusters ?? []) {
      add(cluster.image)
      for (const person of cluster.people ?? []) add(person.image)
    }
    for (const person of group.people ?? []) add(person.image)
  }

  return used
}
