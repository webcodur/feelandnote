"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Save, RotateCcw } from "lucide-react";

interface TierEditHeaderProps {
  playlistName: string;
  isSaving: boolean;
  onSave: () => void;
  onReset: () => void;
}

export default function TierEditHeader({ playlistName, isSaving, onSave, onReset }: TierEditHeaderProps) {
  const router = useRouter();

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="font-bold">티어 설정</h1>
          <p className="text-xs text-text-secondary">{playlistName}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onReset}
          className="p-2 text-text-secondary hover:text-text-primary transition-colors"
          title="초기화"
        >
          <RotateCcw size={20} />
        </button>
        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover disabled:bg-accent/50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Save size={16} />
          {isSaving ? "저장 중..." : "저장"}
        </button>
      </div>
    </header>
  );
}
