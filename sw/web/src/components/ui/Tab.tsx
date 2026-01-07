/*
  파일명: /components/ui/Tab.tsx
  기능: 탭 컴포넌트
  책임: 탭 네비게이션 UI를 제공한다.
*/ // ------------------------------

import { ReactNode } from "react";

interface TabProps {
  label: ReactNode;
  active: boolean;
  onClick: () => void;
}

interface TabsProps {
  children: ReactNode;
  className?: string;
}

export function Tab({ label, active, onClick }: TabProps) {
  return (
    <div
      className={`py-3 px-0 rounded-none relative font-semibold cursor-pointer flex items-center gap-1.5
        ${active ? "text-text-primary" : "text-text-secondary hover:text-text-primary hover:bg-white/5"}`}
      onClick={onClick}
    >
      {label}
      {active && (
        <span className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-accent" />
      )}
    </div>
  );
}

export function Tabs({ children, className = "" }: TabsProps) {
  return (
    <div className={`flex gap-8 border-b border-border ${className}`}>
      {children}
    </div>
  );
}
