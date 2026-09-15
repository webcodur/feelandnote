"use client";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  wide?: boolean;
}

export default function PageContainer({
  children,
  className = "",
  wide = false,
}: PageContainerProps) {
  return (
    /* 본문 폭은 창 폭을 따라 연속으로 변해야 한다. tailwind의 container는 640·768·1024·1280을
       넘는 순간에만 폭이 뛰고 그 사이에는 고정이라, 창을 좌우로 당길 때 안의 카드 크기가
       계단처럼 툭툭 튄다. 상한(1280)은 종전 container의 최대치와 같게 두어 넓은 화면의 인상은 유지한다.
       모바일 좌우 여백은 바깥 틀(LayoutMain px-2)과 합쳐 12px이 되도록 여기서는 4px만 둔다. */
    <div className={`w-full ${wide ? "max-w-[1400px]" : "max-w-[1280px]"} mx-auto px-1 md:px-4 py-4 md:py-8 ${className}`}>
      {children}
    </div>
  );
}
