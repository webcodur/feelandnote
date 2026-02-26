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

  const pc = files.find((f) => f.startsWith(`${prefix}-pc`));
  const mb = files.find((f) => f.startsWith(`${prefix}-mb`));

  if (!pc || !mb) return null;

  return {
    pc: `/images/backgrounds/${pc}`,
    mb: `/images/backgrounds/${mb}`,
  };
}
