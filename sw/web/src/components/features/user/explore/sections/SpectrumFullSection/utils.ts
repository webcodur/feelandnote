/*
  파일명: /components/features/user/explore/sections/SpectrumFullSection/utils.ts
  기능: 비범한 기록가 표시 유틸
  책임: 로케일별 이름 선택 + 셀럽 링크 경로 생성.
*/ // ------------------------------

export function getName(celeb: { nickname: string; nickname_en: string | null }, locale: string) {
  return locale === "en" && celeb.nickname_en ? celeb.nickname_en : celeb.nickname;
}

export function celebHref(celeb: { slug: string | null; id: string }) {
  return `/celeb/${celeb.slug || celeb.id}`;
}
