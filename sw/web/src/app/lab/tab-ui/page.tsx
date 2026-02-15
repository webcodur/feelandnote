/*
  파일명: /app/lab/tab-ui/page.tsx
  기능: 탭 UI 프리뷰 페이지
  책임: TabUIPreview 컴포넌트를 렌더링한다.
*/ // ------------------------------

import TabUIPreview from "@/components/lab/TabUIPreview";
import { LAB_ITEMS } from "@/constants/lab";

const item = LAB_ITEMS.find((i) => i.value === "tab-ui")!;

export const metadata = { title: `${item.label} | Lab` };

export default function Page() {
  return (
    <section className="flex flex-col items-center gap-8 p-6 md:p-10 border border-white/5 bg-white/[0.02] rounded-[2rem]">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-cinzel text-accent tracking-[0.2em]">{item.title}</h2>
        <p className="text-xs text-text-tertiary uppercase tracking-widest opacity-60">{item.subtitle}</p>
      </div>
      <div className="w-full">
        <TabUIPreview />
      </div>
    </section>
  );
}
