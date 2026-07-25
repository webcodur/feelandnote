/**
 * 담화 대본이 실제로 쓰고 있는 사진 — 수집과 경로 따라가기.
 *
 * 수집(collectUsedImages)은 이미지 목록에서 「쓰는 것 / 안 쓰는 것」을 갈라 보여주는 데 쓴다.
 * 따라가기(remapDiscourseImages)는 사진을 다른 폴더로 옮기거나 폴더 이름을 바꿨을 때
 * 대본이 가리키던 경로를 새 자리로 고쳐 준다. 이게 없으면 파일을 옮기는 순간 연결이 전부 끊긴다.
 */

import type { DiscourseScript } from '@/lib/discourse-types'
import { isLocalPath, makePathRemapper } from '@feelandnote/shared/bo/editor'

/**
 * 대본에 연결된 사진 경로 전부.
 * 인물 소개 사진, 발언 시작 사진, 발언 도중 교체 사진, 시작·마지막 화면, 롱폼 썸네일까지 모은다.
 */
export function collectUsedImages(script: DiscourseScript | null): Set<string> {
  const out = new Set<string>()
  if (!script) return out
  const add = (v?: string) => { if (isLocalPath(v)) out.add(v) }

  for (const sp of script.cast ?? []) add(sp.image)
  for (const t of script.turns ?? []) {
    add(t.image)
    for (const c of t.imageChanges ?? []) add(c.image)
  }
  add(script.introImage)
  add(script.outroImage)
  add(script.lvThumbnailImage)
  return out
}

/**
 * 사진 경로 갈아끼우기 — 파일 하나를 옮겼거나(from=파일경로) 폴더 이름을 바꿨을 때(from=폴더경로) 부른다.
 * 폴더인 경우 그 아래 모든 파일 경로의 앞부분을 새 폴더로 바꾼다.
 * 바뀐 곳이 없으면 원래 대본을 그대로 돌려준다(불필요한 저장 방지).
 *
 * 갈아끼우기 규칙 자체는 시리즈 공용(makePathRemapper)을 쓰고, 순회만 여기서 맡는다.
 */
export function remapDiscourseImages(script: DiscourseScript, from: string, to: string): DiscourseScript {
  if (!from || from === to) return script
  const remap = makePathRemapper(from, to)
  let changed = 0

  const swap = (v?: string): string | undefined => {
    const next = remap(v)
    if (next !== v) changed++
    return next
  }

  const next: DiscourseScript = {
    ...script,
    cast: (script.cast ?? []).map(sp => ({ ...sp, image: swap(sp.image) })),
    turns: (script.turns ?? []).map(t => ({
      ...t,
      image: swap(t.image),
      ...(t.imageChanges ? { imageChanges: t.imageChanges.map(c => ({ ...c, image: swap(c.image) ?? c.image })) } : {}),
    })),
    introImage: swap(script.introImage),
    outroImage: swap(script.outroImage),
    lvThumbnailImage: swap(script.lvThumbnailImage),
  }

  return changed ? next : script
}
