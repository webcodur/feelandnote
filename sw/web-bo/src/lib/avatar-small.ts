/**
 * 원본 아바타에서 중·소 이미지를 만든다. 출력 규격은 공유 상수가 쥔다.
 *
 * 규격·주소 규칙의 원천은 packages/shared의 celeb-avatar-small이다. 여기는 만드는 방법만 안다.
 * 백오피스 화면·등록 스크립트·배경 지우기는 모두 이 함수를 거친다 —
 * 한 곳이라도 빠뜨리면 그 인물만 큰 원본을 받아 성향 분포 같은 화면에서 자리가 빈 채로 남는다.
 */
import sharp from 'sharp'
import { CELEB_AVATAR_SMALL, CELEB_AVATAR_MEDIUM } from '@feelandnote/shared/constants/celeb-avatar-small'

/** 원본 아바타 버퍼 → 작은 판 버퍼 */
export async function buildSmallAvatar(original: Buffer): Promise<Buffer> {
  return sharp(original)
    .resize(CELEB_AVATAR_SMALL.sizePx, CELEB_AVATAR_SMALL.sizePx, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: CELEB_AVATAR_SMALL.webpQuality })
    .toBuffer()
}

/** 원본 아바타 키에 대응하는 작은 판 키 */
export function smallAvatarKey(celebId: string): string {
  return `celebs/${celebId}/${CELEB_AVATAR_SMALL.smallFile}`
}

/** 중·소 모두 같은 원본에서 만든다. 작은 원본을 확대하거나 구도를 다시 자르지 않는다. */
export async function buildMediumAvatar(original: Buffer): Promise<Buffer> {
  return sharp(original)
    .resize(CELEB_AVATAR_MEDIUM.sizePx, CELEB_AVATAR_MEDIUM.sizePx, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: CELEB_AVATAR_MEDIUM.webpQuality })
    .toBuffer()
}

export function mediumAvatarKey(celebId: string): string {
  return `celebs/${celebId}/${CELEB_AVATAR_MEDIUM.file}`
}

/** DB의 새 버전을 공개하기 전에 중·소 업로드까지 성공해야 한다. */
export async function uploadAvatarVariants(
  celebId: string,
  original: Buffer,
  put: (key: string, body: Buffer) => Promise<unknown>,
): Promise<void> {
  const [small, medium] = await Promise.all([buildSmallAvatar(original), buildMediumAvatar(original)])
  await put(smallAvatarKey(celebId), small)
  await put(mediumAvatarKey(celebId), medium)
}
