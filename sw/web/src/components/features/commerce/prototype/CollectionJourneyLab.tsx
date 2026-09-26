"use client";

import { useState } from "react";
import Image from "next/image";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Bookmark } from "lucide-react";
import { isDeveloperMode } from "@/lib/developer-mode";
import { JOURNEY_WORKS, type JourneyId } from "./catalog";
import CollectionJourney, { type PrototypeAction } from "./CollectionJourney";
import { usePrototypeSaved } from "./prototypeStore";

export default function CollectionJourneyLab() {
  const locale = useLocale();
  const [id, setId] = useState<JourneyId>("breath-of-the-wild");
  const [counts, setCounts] = useState({ open: 0, choice: 0, outbound: 0 });
  const { saved } = usePrototypeSaved();
  if (!isDeveloperMode() || locale !== "ko") return null;
  const work = JOURNEY_WORKS[id];
  const record = (action: PrototypeAction) => setCounts((old) => ({ ...old, [action]: old[action] + 1 }));
  return <div className="mx-auto max-w-5xl pb-12">
    <header className="mb-8 border-b border-white/10 pb-7">
      <p className="mb-3 text-xs tracking-[0.2em] text-accent">FEEL & NOTE · 소장 흐름 모형</p>
      <h2 className="text-2xl font-semibold sm:text-4xl">마음에 남은 작품을, 내 곁에.</h2>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-text-secondary">이야기를 읽고, 감상할 형태를 고른 뒤, 실제 판매처로 이동합니다. 게임·미술의 서로 다른 선택을 눌러보세요.</p>
      <Link href="/" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded text-sm text-accent outline-none hover:text-accent-hover hover:underline focus-visible:ring-2 focus-visible:ring-accent">홈의 실제 배치 보기<ArrowRight size={14} /></Link>
    </header>
    <div aria-label="모형 작품 선택" className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {Object.values(JOURNEY_WORKS).map((item) => <button key={item.id} type="button" aria-pressed={id === item.id} onClick={() => setId(item.id)}
        className={`flex min-w-0 items-center gap-3 rounded-xl border p-3 text-left outline-none hover:border-accent hover:bg-accent/5 focus-visible:ring-2 focus-visible:ring-accent ${id === item.id ? "border-accent/60 bg-accent/10" : "border-white/15 bg-white/[0.02]"}`}>
        <span className="relative size-14 shrink-0 overflow-hidden rounded bg-black/30"><Image src={item.image} alt="" fill unoptimized sizes="56px" className="object-contain" /></span>
        <span className="min-w-0"><span className="block text-[10px] text-accent">{item.kind === "game" ? "게임 · 기종과 보유 여부" : "미술 · 소재와 크기"}</span><span className="mt-1 block text-sm font-medium leading-snug">{item.title}</span></span>
      </button>)}
    </div>
    <article key={id}>
      <div className="grid items-center gap-6 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] sm:gap-9">
        <div className={`relative mx-auto w-full max-w-sm overflow-hidden rounded-xl border border-white/10 bg-[#191a16] ${work.kind === "art" ? "aspect-[1.267/1]" : "aspect-square"}`}>
          <Image src={work.image} alt={work.title} fill unoptimized loading="eager" sizes="(max-width:640px) 90vw, 384px" className="object-contain p-5" />
        </div>
        <div>
          <p className="text-xs text-accent">{work.eyebrow}</p>
          <h3 className="mt-3 text-2xl font-semibold leading-snug sm:text-3xl">{work.headline}</h3>
          <p className="mt-4 text-sm leading-7 text-text-secondary">{work.story}</p>
          <a href={work.source.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block rounded text-xs text-text-tertiary outline-none hover:text-accent hover:underline focus-visible:ring-2 focus-visible:ring-accent">{work.source.label} ↗</a>
        </div>
      </div>
      <CollectionJourney id={id} placement="lab" onActivity={record} />
    </article>
    <aside className="mt-8 border-t border-white/10 pt-5">
      <h3 className="flex items-center gap-2 text-sm font-medium"><Bookmark size={15} className="text-accent" />모형 보관함</h3>
      <p className="mt-2 text-xs text-text-tertiary">이 탭에서만 유지됩니다. 계정에 저장하거나 알림을 보내지 않습니다.</p>
      {saved.length ? <div className="mt-3 flex flex-wrap gap-2">{saved.map((key) => <button key={key} type="button" onClick={() => setId(key)} className="min-h-11 rounded-lg border border-white/15 px-3 text-sm text-text-secondary outline-none hover:border-accent hover:text-accent focus-visible:ring-2 focus-visible:ring-accent">{JOURNEY_WORKS[key].title}</button>)}</div> : <p className="mt-3 text-sm text-text-secondary">‘나중에 감상하기’를 누르면 여기에 남습니다.</p>}
      <p role="status" className="mt-6 text-xs leading-relaxed text-text-tertiary">이 화면에서 누른 횟수 · 안내 열기 {counts.open} · 선택 변경 {counts.choice} · 판매처/공식 안내 이동 {counts.outbound}<br />모형 확인용이며 GA로 전송하지 않습니다. 외부 이동은 구매 완료가 아닙니다.</p>
    </aside>
  </div>;
}
