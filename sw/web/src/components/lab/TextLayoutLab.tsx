"use client";

import SourceLink from "@/components/ui/SourceLink";
import { useState } from "react";
import FormattedText from "@/components/ui/FormattedText";
import ContentReadingText from "@/components/ui/ContentReadingText";
import ContentTextModal from "@/components/ui/ContentTextModal";
import { decodeContentIntroEntities } from "@/components/features/user/contentLibrary/expand/contentIntroText";
import { normalizeIntroBreaks, normalizeLegacyIntroBreaks } from "@/lib/utils/prose-line-breaks";

const EXAMPLES = [
  { label: "문단·구획", text: '『작품명』을 소개하는 첫 문단입니다. “인용문”과 인공지능(AI)의 강조도 유지합니다.\n이 줄은 같은 문단 안의 줄바꿈입니다.\n\n두 번째 일반 문단입니다. 빈 줄은 문단 간격으로 표시합니다.\n\n---\n\n새로운 큰 구획입니다. 독립된 구획 표식을 가운데 - - -로 표시합니다.\n\n다음 문단의 ‘강조’도 유지합니다.' },
  { label: "시·목록", text: "첫 번째 시구\n두 번째 시구\n세 번째 시구\n\n다음 연의 첫 번째 시구\n두 번째 시구\n\n- 첫 번째 목록\n- 두 번째 목록\n- 세 번째 목록" },
  { label: "긴 빈 줄", text: "첫 번째 일반 문단입니다.\n\n\n\n두 번째 일반 문단입니다. 빈 줄이 길어도 큰 구획을 만들지 않습니다.\n\n\n\n세 번째 일반 문단입니다." },
] as const;
const BUTTON_CLASS = "min-h-11 rounded-md border border-line px-3 text-sm text-text-primary hover:border-accent hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

export default function TextLayoutLab({ initialText, sourceHref, loadError = false }: {
  initialText?: string | null;
  sourceHref?: string | null;
  loadError?: boolean;
}) {
  const [text, setText] = useState(initialText ?? EXAMPLES[0].text);
  const [modalOpen, setModalOpen] = useState(false);
  const decoded = decodeContentIntroEntities(text);
  const next = normalizeIntroBreaks(decoded);
  return (
    <section className="space-y-6 text-text-primary">
      <h2 className="text-2xl font-semibold">본문 표시 비교</h2>
      <p className="text-sm text-text-secondary">같은 본문을 기존 방식과 교체한 공용 모듈로 비교합니다. 아래 원문을 수정하면 바로 반영됩니다.</p>
      {loadError && <p role="status" className="text-sm text-accent">작품 소개를 불러오지 못했습니다. 현재는 예문을 표시합니다.</p>}
      {initialText && <p className="text-sm text-text-secondary">실제 작품 소개를 불러왔습니다. DB는 수정하지 않습니다.</p>}
      <div className="flex flex-wrap gap-2">
        {initialText && <button type="button" className={BUTTON_CLASS} onClick={() => setText(initialText)}>실제 소개로 돌아가기</button>}
        {EXAMPLES.map(example => <button key={example.label} type="button" className={BUTTON_CLASS}
          onClick={() => setText(example.text)}>{example.label}</button>)}
        <button type="button" className={BUTTON_CLASS} onClick={() => setModalOpen(true)}>새 표시로 전문 열기</button>
        {sourceHref && <SourceLink sourceUrl={sourceHref} className={`${BUTTON_CLASS} inline-flex items-center`}>소개 출처</SourceLink>}
      </div>
      <label className="block space-y-2 text-sm">
        <span>원문</span>
        <textarea value={text} onChange={event => setText(event.target.value)} rows={10}
          className="w-full rounded-panel border border-line bg-bg-main p-4 text-sm leading-relaxed text-text-primary hover:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" />
      </label>
      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-panel border border-line p-4 sm:p-6">
          <h3 className="mb-4 text-base font-semibold">기존 표시</h3>
          <ContentReadingText size="modal">
            <FormattedText text={normalizeLegacyIntroBreaks(decoded)} layout="inline" />
          </ContentReadingText>
        </section>
        <section className="rounded-panel border border-accent/50 p-4 sm:p-6">
          <h3 className="mb-4 text-base font-semibold">새 공용 모듈</h3>
          <ContentReadingText text={next} size="modal" />
        </section>
      </div>
      <ContentTextModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="본문 표시 확인" text={next} />
    </section>
  );
}
