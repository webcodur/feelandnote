import { PLATFORM_LINKS } from "@/constants/platformLinks";
import type { ContentType } from "@/types/database";

export interface GeneratedPlatformLink {
  key: string;
  name: string;
  url: string;
}

/** 콘텐츠 정보로 외부 플랫폼 링크 목록 생성 */
export function generatePlatformLinks(
  contentId: string,
  contentType: ContentType,
  title: string,
): GeneratedPlatformLink[] {
  const platforms = PLATFORM_LINKS[contentType];
  if (!platforms?.length) return [];

  return platforms
    .map((p) => ({
      key: p.key,
      name: p.name,
      url: p.buildUrl({ id: contentId, title }),
    }))
    .filter((link) => link.url !== "");
}
