/*
  파일명: /app/lab/content-cards/page.tsx
  기능: 컨텐츠 카드 프리뷰 페이지
  책임: ContentCardsPreview 컴포넌트를 렌더링한다.
*/ // ------------------------------

import ContentCardsPreview from "@/components/lab/ContentCardsPreview";
import { LAB_ITEMS } from "@/constants/lab";

const item = LAB_ITEMS.find((i) => i.value === "content-cards")!;

export const metadata = { title: `${item.label} | Lab` };

export default function Page() {
  return (
    <section className="flex flex-col items-center gap-8 p-6 md:p-10 border border-white/5 bg-white/[0.02] rounded-[2rem]">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-cinzel text-accent tracking-[0.2em]">{item.title}</h2>
        <p className="text-xs text-text-tertiary uppercase tracking-widest opacity-60">{item.subtitle}</p>
      </div>
      <div className="w-full">
        <ContentCardsPreview />
      </div>
    </section>
  );
}
