/*
  파일명: /components/features/home/HomeBrandHeader.tsx
  기능: 홈 상단 브랜드 줄 — 로고와 별칭, 서비스 소개로 가는 한 줄
  책임: 브랜드 선언을 첫 화면 전체가 아니라 한 단으로 압축한다. 소개 본문은 /about이 쥐고,
        홈은 그 문으로 가는 링크만 남긴다. 머리기사(오늘의 인물)가 첫 화면의 주인공이 된다.
*/

import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import Logo from "@/components/ui/Logo";

interface HomeBrandHeaderProps {
  brandHeading: string;
  brandAlias: string;
  aboutLabel: string;
}

export default function HomeBrandHeader({
  brandHeading,
  brandAlias,
  aboutLabel,
}: HomeBrandHeaderProps) {
  return (
    <header className="flex flex-col items-center pt-12 pb-4 md:pt-16">
      <h1 className="sr-only">{brandHeading}</h1>
      <Logo size="lg" variant="hero" subtitle="YOUR CULTURAL LEGACY" />
      <p className="mt-5 text-sm font-medium tracking-[0.08em] text-accent md:mt-6">
        {brandAlias}
      </p>
      <Link
        href="/about"
        className="group mt-4 inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-accent"
      >
        {aboutLabel}
        <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </header>
  );
}
