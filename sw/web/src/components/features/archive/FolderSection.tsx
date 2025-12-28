"use client";

import { ChevronRight, ChevronDown, FolderOpen, FolderInput } from "lucide-react";

interface FolderSectionProps {
  folderId: string;
  folderName: string;
  itemCount: number;
  isCollapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export default function FolderSection({
  folderId,
  folderName,
  itemCount,
  isCollapsed,
  onToggle,
  children,
}: FolderSectionProps) {
  return (
    <div className="ml-4 mt-2">
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 mb-2 text-left cursor-pointer group"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        <FolderOpen size={14} className="text-text-secondary" />
        <span className="text-xs font-medium text-text-secondary">{folderName}</span>
        <span className="text-xs text-text-secondary/60">({itemCount})</span>
      </button>
      {!isCollapsed && <div className="ml-4">{children}</div>}
    </div>
  );
}

interface UncategorizedSectionProps {
  itemCount: number;
  isCollapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export function UncategorizedSection({
  itemCount,
  isCollapsed,
  onToggle,
  children,
}: UncategorizedSectionProps) {
  if (itemCount === 0) return null;

  return (
    <div className="ml-4 mt-2">
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 mb-2 text-left cursor-pointer group"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        <FolderInput size={14} className="text-text-secondary" />
        <span className="text-xs font-medium text-text-secondary">미분류</span>
        <span className="text-xs text-text-secondary/60">({itemCount})</span>
      </button>
      {!isCollapsed && <div className="ml-4">{children}</div>}
    </div>
  );
}
