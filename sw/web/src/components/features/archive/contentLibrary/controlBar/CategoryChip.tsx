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
        "flex items-center gap-1 px-3 py-1.5 rounded-sm text-sm font-serif font-medium whitespace-nowrap border transition-all duration-300",
        isActive
          ? "bg-accent/10 border-accent text-accent shadow-[0_0_10px_rgba(212,175,55,0.2)]"
          : "bg-transparent border-transparent text-text-secondary hover:text-text-primary hover:bg-accent/5 hover:border-accent-dim/30"
      )}
    >
      {label}
      {count !== undefined && <span className="opacity-60 text-xs ml-1">({count})</span>}
    </Button>
  );
}
