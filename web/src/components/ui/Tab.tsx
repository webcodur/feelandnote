import { ReactNode } from "react";

interface TabProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

interface TabsProps {
  children: ReactNode;
  className?: string;
}

export function Tab({ label, active, onClick }: TabProps) {
  return (
    <div className={`tab ${active ? "active" : ""}`} onClick={onClick}>
      {label}
    </div>
  );
}

export function Tabs({ children, className = "" }: TabsProps) {
  return <div className={`tab-list ${className}`}>{children}</div>;
}
