/*
  파일명: /components/ui/Tab.tsx
  기능: 탭 컴포넌트
  책임: 탭 네비게이션 UI를 제공한다.
*/ // ------------------------------

import { ReactNode } from "react";
import Link from "next/link";

interface TabProps {
  label: ReactNode;
  active: boolean;
  onClick?: () => void;
}

interface LinkTabProps {
  href: string;
  label: ReactNode;
  active: boolean;
}

interface TabsProps {
  children: ReactNode;
  className?: string;
}

const tabBaseClass = "py-3 px-0 rounded-none relative font-semibold cursor-pointer flex items-center gap-1.5";
const activeClass = "text-text-primary";
const inactiveClass = "text-text-secondary hover:text-text-primary hover:bg-white/5";

export function Tab({ label, active, onClick }: TabProps) {
  return (
    <div
      className={`${tabBaseClass} ${active ? activeClass : inactiveClass}`}
      onClick={onClick}
    >
      {label}
      {active && (
        <span className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-accent" />
      )}
    </div>
  );
}

export function LinkTab({ href, label, active }: LinkTabProps) {
  return (
    <Link
      href={href}
      className={`${tabBaseClass} no-underline ${active ? activeClass : inactiveClass}`}
    >
      {label}
      {active && (
        <span className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-accent" />
      )}
    </Link>
  );
}

export function Tabs({ children, className = "" }: TabsProps) {
  return (
    <div className={`flex gap-8 border-b border-border ${className}`}>
      {children}
    </div>
  );
}
