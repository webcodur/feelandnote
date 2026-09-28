/*
  파일명: /components/shared/MobileBanner.tsx
  기능: 모바일 경량 배너
  책임: md 미만 뷰포트에서 Canvas 배너 대신 제목 한 줄짜리 배너를 표시한다.
*/ // ------------------------------

import { BANNER_MOBILE_SHELL_CLASS, BANNER_MOBILE_TITLE_CLASS } from "./bannerStyles";

interface MobileBannerProps {
  title: string;
  /** 옛 호출 호환 — 영문 부제는 더 이상 그리지 않는다(bannerStyles.ts) */
  subtitle?: string;
}

export default function MobileBanner({ title }: MobileBannerProps) {
  return (
    <div className={BANNER_MOBILE_SHELL_CLASS}>
      <div role="heading" aria-level={1} className={BANNER_MOBILE_TITLE_CLASS}>
        {title}
      </div>
    </div>
  );
}
