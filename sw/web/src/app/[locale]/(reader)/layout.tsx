/*
  파일명: /app/(reader)/layout.tsx
  기능: 몰입 읽기 그룹 레이아웃
  책임: 헤더·플로팅 위젯 같은 사이트 전체 UI 없이 콘텐츠만 최소한으로 감싼다.
        (main) 그룹의 MainLayout(Header·BottomNav·FloatingMusicPlayer·RecentProfilesSection)은
        전부 클라이언트 컴포넌트라 로딩 체감이 크다 — 이 묶음은 그 무게를 지지 않는다.
        번역은 각 page.tsx가 서버에서 getTranslations로 직접 읽어 내려주므로
        MessageScope(클라이언트 문구 스코프) 없이도 동작한다.
        루트 레이아웃이 항상 붙이는 Footer도 이 묶음에서는 뺀다 — data-reader-page
        표식을 globals.css의 형제 선택자가 잡아 숨긴다([data-reader-page] ~ footer).
*/ // ------------------------------

export default function ReaderGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div data-reader-page className="min-h-screen bg-bg-main text-text-primary">{children}</div>;
}
