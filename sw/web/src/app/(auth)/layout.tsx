/*
  파일명: /app/(auth)/layout.tsx
  기능: 인증 페이지 레이아웃
  책임: 로그인/회원가입 페이지의 공통 레이아웃을 제공한다.
*/ // ------------------------------

export default function AuthLayout({
  children
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
