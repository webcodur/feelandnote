"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Save, RotateCcw } from "lucide-react";
import Button from "@/components/ui/Button";
import { Z_INDEX } from "@/constants/zIndex";

interface TierEditHeaderProps {
  playlistName: string;
  isSaving: boolean;
  onSave: () => void;
  onReset: () => void;
}

export default function TierEditHeader({ playlistName, isSaving, onSave, onReset }: TierEditHeaderProps) {
  const router = useRouter();

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary sticky top-0" style={{ zIndex: Z_INDEX.sticky }}>
      <div className="flex items-center gap-3">
        <Button
          unstyled
          onClick={() => router.back()}
          className="p-2 -ml-2 text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft size={24} />
        </Button>
        <div>
          <h1 className="font-bold">티어 설정</h1>
          <p className="text-xs text-text-secondary">{playlistName}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          unstyled
          onClick={onReset}
          className="p-2 text-text-secondary hover:text-text-primary"
          title="초기화"
        >
          <RotateCcw size={20} />
        </Button>
        <Button
          unstyled
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover disabled:bg-accent/50 text-white text-sm font-medium rounded-lg"
        >
          <Save size={16} />
          {isSaving ? "저장 중..." : "저장"}
        </Button>
      </div>
    </header>
  );
}
