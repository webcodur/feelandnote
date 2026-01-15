/*
  파일명: /components/ui/Breadcrumb.tsx
  기능: Breadcrumb 네비게이션 컴포넌트
  책임: 현재 페이지 경로를 시각적으로 표시하고 상위 페이지로 이동을 지원한다.
*/ // ------------------------------

"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumb({ items, className = "" }: BreadcrumbProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={`hidden md:flex items-center gap-1 text-sm ${className}`}>
      {/* 홈 아이콘 */}
      <Link
        href="/"
        className="flex items-center justify-center p-1 rounded text-text-secondary hover:text-accent hover:bg-white/5"
        aria-label="홈으로 이동"
      >
        <Home size={16} />
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={item.href ?? item.label} className="flex items-center gap-1">
            <ChevronRight size={14} className="text-text-secondary/50" />
            {isLast || !item.href ? (
              <span className="text-text-primary font-medium px-1" aria-current={isLast ? "page" : undefined}>
                {item.label}
              </span>
            ) : (
              <Link href={item.href} className="text-text-secondary hover:text-accent hover:bg-white/5 px-1 rounded">
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
