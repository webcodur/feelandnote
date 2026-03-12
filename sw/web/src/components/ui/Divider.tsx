/*
  파일명: /components/ui/Divider.tsx
  기능: 섹션/카드 간 구분선
  책임: 모바일에서 box 대신 사용하는 경량 구분선을 렌더링한다.
*/ // ------------------------------

interface DividerProps {
  className?: string;
}

export default function Divider({ className = "" }: DividerProps) {
  return (
    <hr
      className={`border-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent ${className}`}
    />
  );
}
