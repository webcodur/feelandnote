/*
  파일명: /app/(policy)/layout.tsx
  기능: 정책 페이지 레이아웃
  책임: 이용약관 및 개인정보처리방침 페이지의 공통 레이아웃을 제공한다.
*/

import Logo from "@/components/ui/Logo";

export default function PolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg-main text-text-primary">
      <header className="fixed top-0 left-0 right-0 h-16 border-b border-border bg-bg-main/80 backdrop-blur-md z-50">
        <div className="mx-auto flex h-full max-w-3xl items-center px-6">
          <Logo size="md" />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 pt-24 pb-12">
        {children}
      </main>
    </div>
  );
}
