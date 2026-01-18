/*
  파일명: /components/features/archive/contentLibrary/controlBar/components/ControlSection.tsx
  기능: 컨트롤 바 섹션 래퍼
  책임: 헤더와 콘텐츠 영역을 가진 컨트롤 바 섹션을 제공한다.
*/ // ------------------------------
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

interface ControlSectionProps {
  header: string;
  children: React.ReactNode;
  className?: string;
}

export default function ControlSection({ header, children, className }: ControlSectionProps) {
  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="w-full py-1.5 sm:py-2 bg-text-primary/5 text-center border-b border-accent-dim/20">
        <span className="text-[10px] sm:text-xs font-bold font-serif text-accent uppercase tracking-wider select-none">{header}</span>
      </div>
      <div className="flex-1 w-full p-2 sm:p-3 flex flex-col justify-center">{children}</div>
    </div>
  );
}
