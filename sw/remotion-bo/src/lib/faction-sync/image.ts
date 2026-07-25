/**
 * 출간용 이미지 변환 — 서버 전용.
 *
 * 규격은 web-bo 일괄 등록 스크립트 2종의 실측값을 그대로 옮겼다.
 *   개인샷: scripts/upload-faction-celeb-images.ts — 원본 비율 유지(inside) 최대 1080, webp q88, 얼굴 크롭 금지
 *   그룹샷: scripts/upload-tag-team-images.ts      — 1080 정사각(cover·attention), webp q85
 * 아바타(얼굴 크롭)는 celeb 파이프라인 소관이라 여기서 다루지 않는다.
 */

import sharp from 'sharp'

/**
 * 개인샷 — 전신·연출 화보를 그대로 살린다. 얼굴을 잘라내지 않고 비율을 유지하며
 * 긴 변만 1080으로 줄인다(작은 원본은 확대하지 않는다).
 */
export async function toSoloShot(src: Buffer): Promise<Buffer> {
  return sharp(src)
    .resize(1080, 1080, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 88 })
    .toBuffer()
}

/**
 * 그룹샷 — 도감 카드가 정사각으로 쓰므로 1080×1080으로 채운다.
 * 잘릴 위치는 sharp 가 인물·대비가 몰린 쪽(attention)을 고른다.
 */
export async function toTeamShot(src: Buffer): Promise<Buffer> {
  return sharp(src)
    .resize(1080, 1080, { fit: 'cover', position: 'attention' })
    .webp({ quality: 85 })
    .toBuffer()
}

/** 업로드 콘텐츠 타입 — 두 변환 모두 webp 로 낸다 */
export const OUTPUT_CONTENT_TYPE = 'image/webp'
