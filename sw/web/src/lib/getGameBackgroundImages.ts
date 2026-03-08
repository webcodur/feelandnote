/*
  파일명: lib/getGameBackgroundImages.ts
  기능: 게임별 배경 이미지 경로 자동 탐색
  책임: public/images/backgrounds/ 디렉토리에서 {게임명}-{n}-{pc|mb}.* 패턴의 파일을 찾아 반환한다.
*/

import fs from "fs";
import path from "path";

export interface GameBackgroundImages {
  pc: string;
  mb: string;
}

/**
 * 게임명 prefix로 배경 이미지 PC/MB 쌍을 찾는다.
 * 예: prefix="dawn-1" → dawn-1-pc.webp, dawn-1-mb.png
 */
export function getGameBackgroundImages(prefix: string): GameBackgroundImages | null {
  const dir = path.join(process.cwd(), "public/images/backgrounds");

  let files: string[];
  try {
    files = fs.readdirSync(dir);
  } catch {
    return null;
  }

  // WebP 우선 탐색 (용량이 훨씬 작음)
  const findBest = (role: string) =>
    files.find((f) => f.startsWith(`${prefix}-${role}`) && f.endsWith(".webp"))
    ?? files.find((f) => f.startsWith(`${prefix}-${role}`));

  const pc = findBest("pc");
  const mb = findBest("mb");

  if (!pc || !mb) return null;

  return {
    pc: `/images/backgrounds/${pc}`,
    mb: `/images/backgrounds/${mb}`,
  };
}
