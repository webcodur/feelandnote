/*
  파일명: /lib/celeb/worldImages.ts
  기능: 세계 배너 그림 경로 조회
  책임: R2에 발행한 세계는 검증된 불변 주소를, 기존 세계는 public/images/worlds/ 경로를 돌려준다.
        등록되지 않은 세계는 null을 돌려 배너가 무늬로 대신 그리게 한다.

  주의: 인물 상세가 클라이언트 컴포넌트에서도 쓰므로 Node 전용 fs/path를 가져오지 않는다.
*/

import { CELEB_WORLDS } from "@/lib/celeb/world";

export interface WorldBannerImages {
  pc: string;
  mb: string;
}

const WORLD_IDS_WITH_BANNERS = new Set(CELEB_WORLDS.map((world) => world.id));

/** R2 정본을 쓰는 배너. 이미지가 바뀌면 내용 해시가 다른 주소로 교체한다. */
const R2_BANNERS: Readonly<Record<string, WorldBannerImages>> = {
  "modern-africa": {
    pc: "https://assets.feelandnote.com/worlds/modern-africa/pc-0a63555ca680dc30.webp",
    mb: "https://assets.feelandnote.com/worlds/modern-africa/mb-68401725a9edd987.webp",
  },
};

/** 제 그림이 아직 없어 옛 시대 그림을 빌려 쓰는 세계 */
const BORROWED_BANNERS: Readonly<Record<string, string>> = {
  "modern-latin-america": "latin-america",
};

export function getWorldBannerImages(worldId: string): WorldBannerImages | null {
  if (!WORLD_IDS_WITH_BANNERS.has(worldId)) return null;
  if (R2_BANNERS[worldId]) return R2_BANNERS[worldId];

  const imageId = BORROWED_BANNERS[worldId] ?? worldId;

  return {
    pc: `/images/worlds/${imageId}-pc.webp`,
    mb: `/images/worlds/${imageId}-mb.webp`,
  };
}
