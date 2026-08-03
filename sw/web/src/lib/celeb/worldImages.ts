/*
  파일명: /lib/celeb/worldImages.ts
  기능: 세계 배너 그림 경로 조회
  책임: 등록된 세계를 public/images/worlds/<세계>-pc.webp · <세계>-mb.webp 경로로 바꾼다.
        등록되지 않은 세계는 null을 돌려 배너가 무늬로 대신 그리게 한다.

  주의: 인물 상세가 클라이언트 컴포넌트에서도 쓰므로 Node 전용 fs/path를 가져오지 않는다.
*/

import { CELEB_WORLDS } from "@/lib/celeb/world";

export interface WorldBannerImages {
  pc: string;
  mb: string;
}

const WORLD_IDS_WITH_BANNERS = new Set(CELEB_WORLDS.map((world) => world.id));

export function getWorldBannerImages(worldId: string): WorldBannerImages | null {
  if (!WORLD_IDS_WITH_BANNERS.has(worldId)) return null;

  return {
    pc: `/images/worlds/${worldId}-pc.webp`,
    mb: `/images/worlds/${worldId}-mb.webp`,
  };
}
