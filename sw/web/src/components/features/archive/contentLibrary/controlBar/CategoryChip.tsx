/*
  파일명: /components/features/archive/contentLibrary/controlBar/components/CategoryChip.tsx
  기능: 카테고리 칩 버튼
  책임: 선택 가능한 카테고리 필터 칩을 제공한다.
*/ // ------------------------------
import Button from "@/components/ui/Button";

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

interface CategoryChipProps {
  label: string;
  count?: number;
  isActive: boolean;
  onClick: () => void;
}

export default function CategoryChip({ label, count, isActive, onClick }: CategoryChipProps) {
  return (
    <Button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap border",
        isActive
          ? "bg-accent/10 border-accent/20 text-accent shadow-sm"
          : "bg-surface border-transparent text-text-secondary hover:bg-surface-hover hover:text-text-primary"
      )}
    >
      {label}
      {count !== undefined && <span className="opacity-60">({count})</span>}
    </Button>
  );
}
