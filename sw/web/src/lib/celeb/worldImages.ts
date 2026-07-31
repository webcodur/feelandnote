/*
  파일명: /lib/celeb/worldImages.ts
  기능: 세계 배너 그림 경로 조회
  책임: public/images/worlds/ 에서 <세계>-pc.* · <세계>-mb.* 를 찾아 돌려준다.
        그림이 아직 없는 세계는 null을 돌려 배너가 무늬로 대신 그리게 한다.

  주의: 서버에서만 부른다(파일 목록을 읽는다). 게임 배경 조회와 같은 방식이다.
*/

import fs from "fs";
import path from "path";

export interface WorldBannerImages {
  pc: string;
  mb: string;
}

const DIR = "public/images/worlds";

/* 운영에서는 한 번만 읽는다. 개발 중에는 그림을 추가할 때마다 서버를 다시 띄우지 않도록 매번 읽는다 */
let cachedFiles: string[] | null = null;

function listFiles(): string[] {
  if (cachedFiles && process.env.NODE_ENV === "production") return cachedFiles;
  try {
    cachedFiles = fs.readdirSync(path.join(process.cwd(), DIR));
  } catch {
    cachedFiles = [];
  }
  return cachedFiles;
}

export function getWorldBannerImages(worldId: string): WorldBannerImages | null {
  const files = listFiles();
  // 용량이 작은 webp를 먼저 찾는다
  const find = (role: string) =>
    files.find((file) => file.startsWith(`${worldId}-${role}.`) && file.endsWith(".webp"))
    ?? files.find((file) => file.startsWith(`${worldId}-${role}.`));

  const pc = find("pc");
  const mb = find("mb");
  if (!pc || !mb) return null;

  return { pc: `/images/worlds/${pc}`, mb: `/images/worlds/${mb}` };
}
