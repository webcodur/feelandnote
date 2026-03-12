/*
  파일명: /components/shared/HubCard.tsx
  기능: 허브 페이지 카드
  책임: 서브페이지 미리보기 카드를 렌더링하고 클릭 시 해당 페이지로 이동한다.
*/ // ------------------------------

import { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

interface HubCardProps {
  href?: string;
  onClick?: () => void;
  title: string;
  description: string;
  icon?: ReactNode;
  label?: string;
}

export default function HubCard({ href, onClick, title, description, icon, label }: HubCardProps) {
  const isButton = !!onClick;
  const className = "group relative flex flex-col gap-3 md:rounded-xl w-full text-left border-0 md:border md:border-white/10 bg-transparent md:bg-white/[0.02] p-0 py-4 md:p-6 transition-colors md:hover:border-accent/40 md:hover:bg-white/[0.04]";

  const content = (
    <>
      {/* 아이콘 */}
      {icon && (
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
          {icon}
        </div>
      )}

      {/* 영문 라벨 */}
      {label && (
        <span className="text-[10px] font-cinzel font-bold tracking-[0.15em] uppercase text-accent/60">
          {label}
        </span>
      )}

      {/* 제목 */}
      <h3 className="font-serif text-lg font-bold text-text-primary">
        {title}
      </h3>

      {/* 설명 */}
      <p className="text-sm leading-relaxed text-text-tertiary">
        {description}
      </p>

      {/* 하단 장식 */}
      <div className="mt-auto pt-3">
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:via-accent/20 transition-colors" />
      </div>
    </>
  );

  if (isButton) {
    return (
      <button onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return (
    <Link href={href || "#"} className={className}>
      {content}
    </Link>
  );
}
