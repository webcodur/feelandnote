/*
  파일명: /components/shared/MobileBanner.tsx
  기능: 모바일 경량 배너
  책임: md 미만 뷰포트에서 Canvas 배너 대신 CSS 기반 경량 배너를 표시한다.
*/ // ------------------------------

interface MobileBannerProps {
  title: string;
  subtitle?: string;
}

export default function MobileBanner({ title, subtitle }: MobileBannerProps) {
  return (
    <div className="md:hidden relative py-6 flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#0a0a0a] to-[#111] -mx-2 -mt-6">
      {/* 골드 다이아몬드 구분선 */}
      <div className="flex items-center gap-3 opacity-40 mb-3">
        <div className="w-12 h-px bg-gradient-to-r from-transparent to-[#d4af37]" />
        <div className="w-1.5 h-1.5 rotate-45 bg-[#d4af37]" />
        <div className="w-12 h-px bg-gradient-to-l from-transparent to-[#d4af37]" />
      </div>

      <div
        role="heading"
        aria-level={1}
        className="text-2xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-stone-500 tracking-tight leading-normal text-center"
      >
        {title}
      </div>

      {subtitle && subtitle.toLowerCase() !== title.toLowerCase() && (
        <p className="text-[#d4af37] tracking-[0.3em] text-[10px] mt-1.5 uppercase font-cinzel text-center">
          {subtitle}
        </p>
      )}

      {/* 하단 페이드 라인 */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/20 to-transparent" />
    </div>
  );
}
