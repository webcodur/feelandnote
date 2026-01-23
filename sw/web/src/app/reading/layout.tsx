/*
  파일명: /app/reading/layout.tsx
  기능: 독서 모드 레이아웃
  책임: 헤더/사이드바 없는 풀스크린 몰입 환경 제공
*/ // ------------------------------

export default function ReadingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-main text-text-primary">
      {children}
    </div>
  );
}
