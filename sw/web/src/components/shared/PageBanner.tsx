/*
  파일명: /components/shared/PageBanner.tsx
  기능: 반응형 배너 토글 래퍼
  책임: 모바일에서는 경량 MobileBanner, 데스크탑에서는 기존 Canvas 배너를 표시한다.
*/ // ------------------------------

import { ReactNode } from "react";
import MobileBanner from "./MobileBanner";

interface PageBannerProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export default function PageBanner({ title, subtitle, children }: PageBannerProps) {
  return (
    <>
      <MobileBanner title={title} subtitle={subtitle} />
      <div className="hidden md:block">{children}</div>
    </>
  );
}
