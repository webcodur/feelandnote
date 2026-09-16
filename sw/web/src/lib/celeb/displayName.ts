/*
  파일명: /lib/celeb/displayName.ts
  기능: 셀럽 표시명 단일원천
  책임: locale이 en이고 nickname_en이 있으면 그것을, 아니면 nickname을 돌려준다.
        이 삼항이 화면·서버 액션 곳곳에 복제돼 있던 것을 한 곳에 모은다.
*/ // ------------------------------

export function celebDisplayName(
  celeb: { nickname: string; nickname_en?: string | null },
  locale: string,
): string {
  return locale === "en" && celeb.nickname_en ? celeb.nickname_en : celeb.nickname;
}
