"use client";

import { useId, useState } from "react";
import Image from "next/image";
import { ArrowUpRight, Bookmark, Check, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useLocale } from "next-intl";
import { isDeveloperMode } from "@/lib/developer-mode";
import { JOURNEY_WORKS, PROTOTYPE_CHECKED_AT, type JourneyId } from "./catalog";
import { getJourneyOffer, INITIAL_SELECTION, PRINT_SIZES, type JourneySelection } from "./choices";
import JourneyChoices from "./JourneyChoices";
import { usePrototypeSaved } from "./prototypeStore";

const focus = "outline-none focus-visible:ring-2 focus-visible:ring-accent";
export type PrototypeAction = "open" | "choice" | "outbound";

export default function CollectionJourney({ id, placement, context, expanded = false, compact = false, onActivity }: {
  id: JourneyId; placement: string; context?: string; expanded?: boolean; compact?: boolean;
  onActivity?: (action: PrototypeAction) => void;
}) {
  const locale = useLocale();
  const panelId = useId();
  const [open, setOpen] = useState(expanded);
  const [selection, setSelection] = useState<JourneySelection>(INITIAL_SELECTION);
  const [saveMessage, setSaveMessage] = useState("");
  const { saved, toggle } = usePrototypeSaved();
  if (!isDeveloperMode() || locale !== "ko") return null;
  const work = JOURNEY_WORKS[id];
  const offer = getJourneyOffer(id, selection);
  const isSaved = saved.includes(id);
  const size = PRINT_SIZES.find((item) => item.id === selection.size) ?? PRINT_SIZES[0];

  function changeSelection(next: JourneySelection) {
    setSelection(next);
    onActivity?.("choice");
  }

  return <section data-commerce-prototype={id} data-commerce-placement={placement}
    className="@container my-4 min-w-0 overflow-hidden rounded-xl border border-accent/20 bg-[#171814] text-text-primary [overflow-anchor:none]">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5 sm:px-5">
      <p className="text-xs text-text-secondary">{compact ? `${work.title} · ${work.kind === "game" ? "기종·구매 안내" : "프린트 선택"}` : context ?? work.eyebrow}</p>
      <span className="rounded border border-accent/30 px-1.5 py-0.5 text-[10px] font-medium tracking-wider text-accent">개발자 모형</span>
    </div>
    {!compact && <div className="flex items-start gap-4 p-4 sm:gap-5 sm:p-5">
      <div className={`relative shrink-0 overflow-hidden rounded border border-white/10 bg-black/20 ${work.kind === "game" ? "h-28 w-20" : "size-24 sm:size-28"}`}>
        <Image src={work.image} alt={work.title} fill unoptimized sizes="112px" className="object-contain" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-[11px] text-accent">{work.creator}</p>
        <h3 className="break-keep text-base font-semibold leading-snug sm:text-lg">{work.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          {work.kind === "game" ? "내 게임기와 본편 보유 여부에 맞춰 고르세요." : "지금 보는 그림의 소재와 크기를 골라보세요."}
        </p>
        <a href={work.experience.url} target="_blank" rel="noopener noreferrer"
          className={`mt-2 inline-flex min-h-9 items-center gap-1 rounded text-xs text-text-secondary hover:text-accent hover:underline ${focus}`}>
          {work.experience.label}<ArrowUpRight size={13} aria-hidden />
        </a>
      </div>
    </div>}
    <div className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-5">
      <button type="button" aria-expanded={open} aria-controls={panelId}
        onClick={() => { setOpen(!open); if (!open) onActivity?.("open"); }}
        className={`inline-flex min-h-11 flex-1 items-center justify-between gap-3 whitespace-nowrap rounded-lg border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent hover:border-accent hover:bg-accent/20 sm:flex-none ${focus}`}>
        {open ? "선택 안내 접기" : work.action}{open ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
      </button>
      <button type="button" aria-pressed={isSaved} onClick={() => {
        const nowSaved = toggle(id);
        setSaveMessage(nowSaved ? "모형 보관함에 담았습니다. 이 탭에서만 유지됩니다." : "모형 보관함에서 꺼냈습니다.");
      }} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/15 px-3 text-sm hover:border-accent hover:bg-white/5 ${isSaved ? "text-accent" : "text-text-secondary"} ${focus}`}>
        {isSaved ? <Check size={15} aria-hidden /> : <Bookmark size={15} aria-hidden />}{isSaved ? "보관 중" : "나중에 감상하기"}
      </button>
    </div>
    <p role="status" className={saveMessage ? "px-4 pb-3 text-xs text-text-secondary sm:px-5" : "sr-only"}>{saveMessage}</p>
    <div id={panelId} hidden={!open} className="border-t border-white/10">
      {open && <>
        <div className="grid gap-6 p-4 sm:p-5 @min-[600px]:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div className="min-w-0 space-y-5">
            <JourneyChoices id={id} selection={selection} onChange={changeSelection} />
            {work.kind === "art" && <figure>
              <div className="relative flex h-56 items-center justify-center overflow-hidden rounded-lg bg-[#d4cdbf] px-6 pb-5 pt-3">
                <div className="absolute inset-x-0 bottom-0 h-7 border-t border-[#a89e89] bg-[#b8ac97]" />
                <div className={`relative aspect-[1.267/1] shadow-xl ${selection.material === "paper" ? "border-[8px] border-[#f7f3e9]" : "border-2 border-[#8a806e]"}`} style={{ width: `${size.width}%`, maxWidth: `${size.width * 2.23}px` }}>
                  <Image src={work.image} alt={`${size.label} ${selection.material === "paper" ? "페이퍼" : "캔버스"} 배치 예시`} fill unoptimized sizes="400px" className="object-contain" />
                </div>
              </div>
              <figcaption className="mt-2 text-[11px] leading-relaxed text-text-tertiary">배치 예시 · 실제 공간의 축척이나 액자 포함을 뜻하지 않습니다.</figcaption>
            </figure>}
          </div>
          <div className="flex min-w-0 flex-col rounded-lg border border-white/10 bg-black/15 p-4">
            <p className="mb-2 text-[10px] font-semibold tracking-widest text-accent">선택한 형태</p>
            <h4 className="text-base font-semibold leading-snug">{offer.title}</h4>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">{offer.summary}</p>
            <ul className="my-4 space-y-2.5">
              {offer.facts.map((fact) => <li key={fact} className="flex gap-2 text-xs leading-relaxed text-text-secondary"><span className="mt-1.5 size-1 shrink-0 rounded-full bg-accent/60" />{fact}</li>)}
            </ul>
            <p className="mb-4 text-xs leading-relaxed text-text-secondary">{offer.note}</p>
            {offer.link ? <a href={offer.link} target="_blank" rel="noopener noreferrer nofollow"
              onClick={() => onActivity?.("outbound")}
              className={`mt-auto inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#dfc784] bg-[#dfc784] px-3 py-3 text-center text-sm font-semibold text-[#211d14] hover:border-[#f0db9f] hover:bg-[#f0db9f] ${focus}`}>
              {offer.linkLabel}<ExternalLink size={14} className="shrink-0" aria-hidden />
            </a> : <p className="mt-auto rounded-lg border border-white/10 px-3 py-3 text-center text-sm text-text-tertiary">현재 연결 가능한 판매 상품 없음</p>}
            {offer.link && <p className="mt-2 text-center text-[11px] text-text-tertiary">{offer.status === "guide" ? "공식 안내로 이동 · 새 창" : "가격·재고·배송은 판매처에서 확인 · 새 창"}</p>}
          </div>
        </div>
        <details className="border-t border-white/10 px-4 py-3 text-xs text-text-secondary sm:px-5">
          <summary className={`w-fit cursor-pointer rounded py-1 hover:text-accent ${focus}`}>조사 근거와 모형 안내</summary>
          <div className="mt-3 space-y-2 leading-relaxed">
            <p>{PROTOTYPE_CHECKED_AT} 확인: {offer.evidence}.</p>
            <a href={offer.evidenceUrl} target="_blank" rel="noopener noreferrer" className={`inline-block rounded text-accent underline hover:text-accent-hover ${focus}`}>{offer.seller} 확인 페이지</a>
            <p>일반 상품·공식 안내 링크로 연결한 개발자 모형입니다. 제휴 수익 연결 전이며, 보관은 이 탭에만 남고 계정의 감상 기록은 바뀌지 않습니다.</p>
          </div>
        </details>
      </>}
    </div>
  </section>;
}
