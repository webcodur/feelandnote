/**
 * 블로그 작업 리소스가 사는 곳.
 *
 * 재료 JSON·본문 HTML·미리보기·발행 대장은 **저장소에 남길 것이 아니다.** 글 한 편이
 * 6만 자를 넘고 채널이 늘수록 불어나는데, 코드가 아니라 산출물이라 이력을 뒤질 일도 없다.
 * C 드라이브와 git 밖에 둔다.
 *
 * 다른 컴퓨터에 D 드라이브가 없으면 `BLOG_ASSETS` 로 덮는다.
 */
import fs from 'node:fs';
import path from 'node:path';

export const ASSETS = process.env.BLOG_ASSETS ?? 'D:/blog-assets';

/** 채널 폴더를 보장하고 돌려준다. */
export function blogDir(channel) {
  const dir = path.join(ASSETS, channel);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
