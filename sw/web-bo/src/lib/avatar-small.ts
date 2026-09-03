/**
 * 아바타 작은 판 만들기 — 원본 아바타 버퍼에서 96px webp를 뽑는다.
 *
 * 규격·주소 규칙의 원천은 packages/shared의 celeb-avatar-small이다. 여기는 만드는 방법만 안다.
 * 아바타를 올리는 곳은 셋(백오피스 화면, 등록 스크립트, 배경 지우기)이고 모두 이 함수를 거친다 —
 * 한 곳이라도 빠뜨리면 그 인물만 큰 원본을 받아 성향 분포 같은 화면에서 자리가 빈 채로 남는다.
 */
import sharp from 'sharp'
import { CELEB_AVATAR_SMALL } from '@feelandnote/shared/constants/celeb-avatar-small'

/** 원본 아바타 버퍼 → 작은 판 버퍼 */
export async function buildSmallAvatar(original: Buffer): Promise<Buffer> {
  return sharp(original)
    .resize(CELEB_AVATAR_SMALL.sizePx, CELEB_AVATAR_SMALL.sizePx, { fit: 'cover' })
    .webp({ quality: CELEB_AVATAR_SMALL.webpQuality })
    .toBuffer()
}

/** 원본 아바타 키에 대응하는 작은 판 키 */
export function smallAvatarKey(celebId: string): string {
  return `celebs/${celebId}/${CELEB_AVATAR_SMALL.smallFile}`
}
