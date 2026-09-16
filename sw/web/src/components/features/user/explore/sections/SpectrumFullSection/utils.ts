/*
  파일명: /components/features/user/explore/sections/SpectrumFullSection/utils.ts
  기능: 비범한 기록가 표시 유틸
  책임: 셀럽 링크 경로 생성. 로케일별 이름 선택은 lib/celeb/displayName이 단일원천이다.
*/ // ------------------------------

import { getCelebProfileUrl } from "@/lib/url";

export function celebHref(celeb: { slug: string | null; id: string }) {
  return getCelebProfileUrl(celeb);
}
