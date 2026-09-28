"use client";

/*
  화면 종류별 본문 폭. 좌우 여백은 바깥 틀(LayoutMain: 16 · 24 · 40px)이 한 번만 준다 — 여기서 더하지 않는다.
  폭은 창을 따라 연속으로 변하고 상한에서만 멈춘다(계단식 container를 쓰지 않는다).
  - reading 720: 긴 글·기록관·검색처럼 한 줄 길이를 지켜야 하는 화면
  - default 1200: 허브·목록(스와이프 판이 서는 1440px 이상에서는 판 자리만큼 좁아진다)
  - wide 1440: 인물 상세처럼 옆 레일을 품는 화면(바깥 틀과 같은 폭)
*/
// default는 1200px이되, 오른쪽 스와이프 판이 서는 폭에서는 판 자리만큼 줄어든다(globals.css --content-max-default)
const WIDTH_CLASS = {
  reading: "max-w-[720px]",
  default: "max-w-[var(--content-max-default)]",
  wide: "max-w-none",
} as const;

export type PageWidth = keyof typeof WIDTH_CLASS;

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  /** 옛 호출용 — width="wide"와 같다 */
  wide?: boolean;
  width?: PageWidth;
}

export default function PageContainer({
  children,
  className = "",
  wide = false,
  width,
}: PageContainerProps) {
  const resolved: PageWidth = width ?? (wide ? "wide" : "default");
  return (
    <div className={`mx-auto w-full ${WIDTH_CLASS[resolved]} ${className}`}>
      {children}
    </div>
  );
}
