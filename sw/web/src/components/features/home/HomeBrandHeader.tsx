/*
  파일명: /components/features/home/HomeBrandHeader.tsx
  기능: 홈 상단 브랜드 줄 — 로고와 별칭, 서비스 소개로 가는 한 줄
  책임: 브랜드 선언을 첫 화면 전체가 아니라 가운데 한 단으로 압축한다. 소개 본문은 /about이 쥐고,
        홈은 그 문으로 가는 링크만 남긴다. 머리기사(오늘의 인물)가 첫 화면의 주인공이 된다.
        로고는 브랜드 결정이라 모양·부제를 여기서 바꾸지 않는다.
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
    // 아래 헤어라인은 신문 1면의 제호 아래 괘선이다 — 브랜드 영역과 본문(목차·구획)을 가른다.
    // 목차가 로고 쪽에 붙어 보이지 않도록, 목차는 이 선 바로 아래에서 시작한다(page.tsx)
    // 선 위는 짧게 끊는다(소개 링크의 누르는 칸 44px가 이미 아래 여백을 품는다). 선 아래 간격은 page.tsx가 넓게 준다
    <header className="flex w-full min-w-0 flex-col items-center border-b border-line px-4 pt-4 pb-1 md:pt-6 md:pb-2">
      <h1 className="sr-only">{brandHeading}</h1>
      <Logo size="sm" variant="hero" subtitle="YOUR CULTURAL LEGACY" />
      <p className="mt-3 max-w-full text-center text-sm font-medium tracking-[0.08em] text-accent text-balance break-keep">
        {brandAlias}
      </p>
      <Link
        href="/about"
        className="group mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm text-text-secondary hover:text-accent"
      >
        {aboutLabel}
        <ArrowRight size={14} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
      </Link>
    </header>
  );
}
