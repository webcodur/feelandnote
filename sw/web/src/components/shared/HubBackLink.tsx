/*
  파일명: /components/shared/HubBackLink.tsx
  기능: 허브 뒤로가기 링크
  책임: 서브페이지에서 허브로 돌아가는 링크를 표시한다. 허브 루트에서는 숨긴다.
*/ // ------------------------------

"use client";

import { usePathname, Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";

interface HubBackLinkProps {
  hubPath: string;
  label: string;
}

/**
 * 자체 뒤로가기를 가진 화면 — 여기서는 숨긴다.
 *
 * 두 단계 이상 깊은 화면은 「허브로」보다 「한 단계 위로」가 쓸모 있다.
 * 방금 온 곳으로 돌아가려는데 허브까지 튕겨나가면 오히려 길을 잃는다.
 * 그런 화면은 자기 화면에 맞는 뒤로가기를 직접 두므로, 두 개가 겹치지 않게 비운다.
 */
const SELF_HANDLED = [
  /^\/library\/curated\/[^/]+/, // 기관 화면·목록 화면(기관 선정 허브는 제외)
];
// 세력도감(/explore/faction)은 여기 넣지 않는다. 그 화면의 자체 뒤로가기는
// 테마 상세로 들어갔을 때만 나타나고 목록 상태에는 없어, 빼면 탐색으로 갈 길이 사라진다.

export default function HubBackLink({ hubPath, label }: HubBackLinkProps) {
  const pathname = usePathname();

  // 허브 루트에서는 표시하지 않음
  if (pathname === hubPath) return null;

  if (SELF_HANDLED.some((re) => re.test(pathname))) return null;

  return (
    <div className="mb-4">
      <Link
        href={hubPath}
        className="inline-flex items-center gap-1.5 text-sm hover:text-accent transition-colors"
      >
        <ArrowLeft size={14} />
        {label}
      </Link>
    </div>
  );
}
