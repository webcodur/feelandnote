"use client";

import AffiliateBookAction from "@/components/features/user/contentLibrary/AffiliateBookAction";
import BookPurchaseInfo from "@/components/shared/BookPurchaseInfo";
import { Fragment, useState } from "react";
import Image from "next/image";
import BlurDissolve from "@/components/ui/BlurDissolve";
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useMouseDragScroll } from "@/hooks/useMouseDragScroll";
import Modal, { ModalBody } from "@/components/ui/Modal";
import type { MythWork } from "@/actions/home/mythAtlasTypes";

interface Props { works: MythWork[]; selectedPersonId: string; traditionName: string; traditionSlug: string }

/* 「이 신화의 책」은 제목이 전승 이름으로 시작하는 작품에 전승별 대표 원전을 더한 것이다.
   신들의 계보·변신 이야기 같은 종합 신화서는 제목에 전승 이름이 없고, 인물 그래프만으로는
   일리아스처럼 인물이 겹치는 별개 서사시와 가를 수 없어 원전은 전승마다 명시한다.
   나머지는 이 신화 인물이 등장하는 다른 작품이며, 둘 사이에 세로 구분선을 둔다 */
const MYTH_OWN_WORK_IDS: Record<string, string[]> = {
  "greek-roman-myth": [
    "5c38c188-32a1-4551-9ce7-97c025b2e364", // 신들의 계보
    "f584f015-601d-52ad-b76b-006b231eb54d", // 호메로스 찬가
    "13410b89-7c1f-4461-a1e2-b3f2975148e6", // 변신 이야기
    "24d56c9e-ad64-5c95-b1e3-4bd7f029f92c", // 해밀턴의 그리스로마신화
    "1d625a51-414b-40b3-a3b7-df43aa1e48b9", // 스티븐 프라이의 그리스 신화
    "905e4914-9aa2-59e3-94c6-1bf04e2fe97c", // 아폴로도로스의 도서관과 히기누스의 신화집
    "e4e3f23f-bc12-55a0-92d2-29f9a3188510", // 신화집(아폴로도로스)
  ],
};

const normalizeTitle = (value: string) => value.toLowerCase().replace(/[\s\-—–:：·,.'"《》「」『』()（）[\]]/g, "");

export default function MythWorkShelf({ works, selectedPersonId, traditionName, traditionSlug }: Props) {
  const t = useTranslations("explore.hub.myth");
  const tMore = useTranslations("shared.libraryShelf");
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);
  const [dividerInfoOpen, setDividerInfoOpen] = useState(false);
  /* 인물 줄과 같은 공용 훅 — 터치는 기본 스크롤, PC는 마우스로 끌어 넘긴다(ui-rail) */
  const { ref, cursorClassName, dragProps } = useMouseDragScroll();
  const traditionKey = normalizeTitle(traditionName);
  const ownWorkIds = new Set(MYTH_OWN_WORK_IDS[traditionSlug] ?? []);
  const ownWorks = works.filter((work) => ownWorkIds.has(work.id) || (traditionKey && normalizeTitle(work.title).startsWith(traditionKey)));
  const ownIds = new Set(ownWorks.map((work) => work.id));
  const selectedWorks = works.filter((work) => !ownIds.has(work.id) && work.personIds.includes(selectedPersonId));
  const selectedIds = new Set(selectedWorks.map((work) => work.id));

  /* YES24로 이을 한국어 판본이 있는 책을 앞에 세운다. 연결 인물이 가장 많은 원전이 정작 판본이 없어
     선반 맨 앞을 차지하던 자리다(아폴로도로스 『그리스 신화』). 판본 없는 책도 뒤에 그대로
     남아 등장 작품 정보는 잃지 않는다. 판본을 받지 않는 영문 화면은 원래 순서를 지킨다. */
  const hasEdition = (work: MythWork) => work.editionId !== undefined;
  const buyableFirst = (list: MythWork[]) =>
    locale === "ko" ? [...list.filter(hasEdition), ...list.filter((work) => !hasEdition(work))] : list;

  const ordered = [
    ...buyableFirst(ownWorks),
    ...buyableFirst(selectedWorks),
    ...buyableFirst(works.filter((work) => !ownIds.has(work.id) && !selectedIds.has(work.id))),
  ];
  const visible = expanded ? ordered : ordered.slice(0, 10);
  const remaining = ordered.length - visible.length;
  /* 이 신화의 책과 다른 등장 작품 사이의 구분선 — 이 신화의 책이 다 보이고 뒤에 작품이 남을 때만 선다 */
  const dividerIndex = ownWorks.length;
  const showDivider = dividerIndex > 0 && dividerIndex < visible.length;

  if (visible.length === 0) return null;

  return (
    <section aria-labelledby="myth-works-title" className="pt-1">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h3 id="myth-works-title" className="flex items-center gap-2 text-lg font-black text-text-primary">
            <BookOpen size={18} className="text-accent" />
            {t("works")}
            {/* 수수료 안내 — 판매 단추 안에 묻지 않고 선반 제목 옆에 둔다 */}
            {locale === "ko" && visible.some((work) => work.category === "book") && (
              <BookPurchaseInfo className="inline-flex size-6 items-center justify-center self-center rounded-full border border-white/10" />
            )}
          </h3>
          <p className="mt-1 text-sm text-text-secondary">{t("worksLead")}</p>
        </div>
        <span className="text-sm text-text-tertiary">{selectedWorks.length > 0 ? t("selectedWorks", { count: selectedWorks.length }) : t("traditionWorks", { count: works.length })}</span>
      </div>

      <div ref={ref} {...dragProps} className={`scrollbar-hide -mx-1 flex gap-3 overflow-x-auto overscroll-x-contain px-1 pb-2 select-none pointer-coarse:snap-x md:gap-4 ${cursorClassName}`}>
        {visible.map((work, index) => {
          const selected = work.personIds.includes(selectedPersonId);
          const showPurchase = locale === "ko" && work.category === "book";
          const workHref = `/content/${work.id}?category=${work.category}`;
          const cardBody = (
            <>
              <div className="relative aspect-[3/4] shrink-0 overflow-hidden bg-bg-secondary">
                {work.thumbnailUrl ? (
                  <BlurDissolve key={work.thumbnailUrl} className="absolute inset-0"><Image src={work.thumbnailUrl} alt="" fill unoptimized draggable={false} sizes="176px" className="object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none" /></BlurDissolve>
                ) : (
                  <div className="flex h-full items-center justify-center p-4 text-center text-lg font-black text-accent/50">{work.title}</div>
                )}
                {selected && <span className="absolute start-2 top-2 rounded-full bg-accent px-2 py-1 text-xs font-black text-bg-secondary">{t("appearsHere")}</span>}
                <span className="absolute end-2 top-2 grid size-8 place-items-center rounded-full bg-black/85 text-text-tertiary" aria-hidden>
                  <ArrowUpRight size={15} />
                </span>
              </div>
              {/* 제목·저자는 남은 공간 한가운데 한 쌍으로 묶어 둔다 — 쌍이 갈라져 위아래로 퍼지지 않게 justify-center로 붙인다 */}
              <div className="flex flex-1 flex-col p-3 text-center">
                <div className="flex flex-1 flex-col items-center justify-center gap-1">
                  <h4 className="line-clamp-2 text-sm font-bold leading-5 text-text-primary group-hover:text-accent">{work.title}</h4>
                  <p className="w-full truncate text-sm text-text-secondary">{work.creator ?? " "}</p>
                </div>
                <p className="pt-2 text-sm font-semibold text-accent">{t("castCount", { count: work.personIds.length })}</p>
              </div>
            </>
          );

          return (
            <Fragment key={work.id}>
              {index === dividerIndex && showDivider && (
                <button
                  type="button"
                  onClick={() => setDividerInfoOpen(true)}
                  aria-haspopup="dialog"
                  aria-label={t("worksDividerTitle")}
                  title={t("worksDividerTitle")}
                  className="group/divider flex w-8 shrink-0 cursor-pointer flex-col items-center self-stretch py-4 outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
                >
                  <span className="w-px flex-1 bg-gradient-to-b from-transparent via-accent/30 to-accent/60" />
                  <span className="my-3 flex flex-col items-center gap-2">
                    <span className="size-1 rotate-45 rounded-[1px] bg-accent/60" />
                    <span className="size-2.5 rotate-45 rounded-[2px] border border-accent bg-accent/20 shadow-[0_0_10px_rgba(240,201,72,0.35)] transition-transform duration-200 group-hover/divider:scale-125 group-hover/divider:bg-accent/50" />
                    <span className="size-1 rotate-45 rounded-[1px] bg-accent/60" />
                  </span>
                  <span className="w-px flex-1 bg-gradient-to-b from-accent/60 via-accent/30 to-transparent" />
                </button>
              )}
              <div className="flex w-36 shrink-0 snap-start flex-col md:w-44">
              <Link href={workHref} draggable={false} className={`group flex flex-1 flex-col overflow-hidden rounded-2xl border bg-bg-card hover:border-accent/70 hover:bg-accent/5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${selected ? "border-accent/60" : "border-stone-heavy"}`}>
                {cardBody}
              </Link>
              {showPurchase && <AffiliateBookAction contentId={work.id} editionId={work.editionId} coupangUrl={work.coupangUrl} compact className="mt-2" />}
              </div>
            </Fragment>
          );
        })}
      </div>

      <Modal isOpen={dividerInfoOpen} onClose={() => setDividerInfoOpen(false)} title={t("worksDividerTitle")} size="sm">
        <ModalBody className="flex flex-col gap-4 p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full border border-accent/50 bg-accent/10 text-accent"><ArrowLeft size={16} /></span>
            <div>
              <p className="text-sm font-bold text-text-primary">{t("worksDividerLeft")}</p>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">{t("worksDividerLeftDesc")}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full border border-accent/50 bg-accent/10 text-accent"><ArrowRight size={16} /></span>
            <div>
              <p className="text-sm font-bold text-text-primary">{t("worksDividerRight")}</p>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">{t("worksDividerRightDesc")}</p>
            </div>
          </div>
        </ModalBody>
      </Modal>

      {remaining > 0 && (
        <div className="mt-2 flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="flex min-h-10 items-center rounded-full border border-white/15 px-5 text-sm font-semibold text-text-secondary outline-none hover:border-accent/60 hover:text-accent focus-visible:ring-2 focus-visible:ring-accent"
          >
            {tMore("more", { count: remaining })}
          </button>
        </div>
      )}
    </section>
  );
}
