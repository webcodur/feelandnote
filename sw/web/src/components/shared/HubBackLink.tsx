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

export default function HubBackLink({ hubPath, label }: HubBackLinkProps) {
  const pathname = usePathname();
  
  // 허브 루트에서는 표시하지 않음
  if (pathname === hubPath) return null;

  // 스포트라이트 페이지는 내부에서 자체 뒤로가기 처리를 제공하므로 숨김
  if (pathname === '/explore/spotlight') return null;

  return (
    <div className="mb-4">
      <Link
        href={hubPath}
        className="inline-flex items-center gap-1.5 text-sm text-text-tertiary hover:text-accent transition-colors"
      >
        <ArrowLeft size={14} />
        {label}
      </Link>
    </div>
  );
}
