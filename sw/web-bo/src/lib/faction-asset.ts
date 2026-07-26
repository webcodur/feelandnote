/**
 * 세력도 자산 경로 해석 — 서버 전용.
 *
 * 파일을 그대로 내주는 창구의 급소다. 라우트 안에 두면 검증할 방법이 없어서 따로 뺐다.
 *
 * ⚠ 이 앱의 진입 검사(`src/proxy.ts`)는 **경로가 이미지 확장자로 끝나면 아예 건너뛴다**
 *   (matcher 가 `.*\.(svg|png|jpg|jpeg|gif|webp)$` 를 제외한다). 실측으로 확인했다 —
 *   `/api/faction/asset/x/y.png` 은 로그인 검사를 통과해 곧바로 라우트에 닿는다.
 *   그래서 라우트 자신이 사람을 확인하고, 이 함수가 경로를 잠근다. 둘 중 하나만 있으면 뚫린다.
 *
 * 두 겹으로 잠근다.
 *   1. `..`·절대경로·빈 토막을 걷어낸 뒤, 결과가 뿌리 폴더 안쪽인지 **다시** 확인한다.
 *   2. 확장자 허용 목록 — 목록에 없으면 내주지 않는다(대본 json·조사 문서 유출 차단).
 */

import path from 'path'
import { safeRelSegs, resolveEpisodeLocation } from '@feelandnote/shared/bo/episode-store'

/** 내줄 수 있는 확장자만 */
export const FACTION_ASSET_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.m4v': 'video/x-m4v',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
}

export type FactionAssetResolution =
  | { ok: true; abs: string; mime: string; ext: string }
  | { ok: false; status: 400 | 403; reason: string }

/**
 * 뿌리 폴더 기준 상대경로를 실제 파일 경로로 바꾼다.
 *
 * @param root    public/factions 절대경로
 * @param relPath 슬래시로 이은 상대경로(URL 디코딩은 호출 측이 마친 상태)
 */
export function resolveFactionAsset(root: string, relPath: string): FactionAssetResolution {
  if (!safeRelSegs(relPath).length) return { ok: false, status: 400, reason: '경로가 비었습니다' }

  // 아이디어 보관함 편의 사진은 실물이 public 밖(idea-bank/)에 있다 — 뿌리를 그 함수가 정한다
  const loc = resolveEpisodeLocation(root, relPath)
  const segs = loc.segs
  if (!segs.length) return { ok: false, status: 400, reason: '경로가 비었습니다' }

  const base = path.resolve(loc.root)
  const abs = path.resolve(base, ...segs)
  // safeRelSegs 가 '..' 을 걷어내지만, 이상한 입력까지 감당하도록 결과를 다시 확인한다
  if (abs !== base && !abs.startsWith(base + path.sep)) {
    return { ok: false, status: 403, reason: '뿌리 폴더 밖입니다' }
  }

  const ext = path.extname(abs).toLowerCase()
  const mime = FACTION_ASSET_MIME[ext]
  if (!mime) return { ok: false, status: 400, reason: `내줄 수 없는 확장자입니다: ${ext || '(없음)'}` }

  return { ok: true, abs, mime, ext }
}
