/* ─────────────────────────────────────────────
 * [공용] 인물 조작 행 — 얼굴=확대 / 중앙=대사 / 우측=바로가기
 * - 데이터: PersonNode·FigureBookCharacter 등 최소 인물 모습을 만족하는 행
 * - 함께 보기: hooks/useRelationDialogue.ts
 * ───────────────────────────────────────────── */
/*
  파일명: /components/features/celeb/FigurePersonRows.tsx
  기능: 인물 행 격자 — 세 조작 구역이 분리된 공용 모듈
  책임: 「이 작품의 인물」(작품 상세)·「관련 인물」(인물 상세)이 같은 행을 쓴다.
        얼굴을 누르면 초상화를 크게 보고, 가운데를 누르면 대사를 읊고,
        우측 단추는 인물 상세로 간다 — 서비스에 없는 인물만 외부(위키데이터)로 안내한다.
        격자·쪽 넘김 모양은 FigureLinkGrid와 같은 클래스로 맞춘다.
*/

"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpRight, Expand, LoaderCircle, User } from "lucide-react";

import { Link } from "@/i18n/navigation";
import CelebAvatarImage from "@/components/ui/CelebAvatarImage";
import SwipeControls from "@/components/ui/SwipeControls";
import VoiceBadge from "@/components/ui/VoiceBadge";
import WikiMark from "@/components/ui/icons/WikiMark";
import { getCelebProfileUrl } from "@/lib/url";
import useRelationDialogue from "@/hooks/useRelationDialogue";

const ImageGalleryModal = dynamic(
  () => import("@/components/ui/ImageGalleryModal"),
  { ssr: false },
);

/** FigureLinkGrid와 같은 격자 규칙 — 두 격자가 나란히 서도 모양이 어긋나지 않게 한다 */
const GRID_COLS_WIDE = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
const GRID_COLS_NARROW = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
const CARD_MIN_H = "min-h-[68px]";

const colsFor = (count: number) => (count <= 6 ? GRID_COLS_NARROW : GRID_COLS_WIDE);

/** 행이 요구하는 인물의 최소 모습 — PersonNode가 그대로 만족한다 */
export interface FigurePersonRowPerson {
  id: string;
  slug: string | null;
  /** 서비스에 등록된 인물인가 — 미등록이면 우측 단추가 외부 안내로 바뀐다 */
  listed: boolean;
  name: string;
  avatarUrl: string | null;
  /** 미등록 인물의 외부 안내 주소를 만드는 위키데이터 식별자 */
  qid: string | null;
}

export interface FigurePersonRowItem {
  person: FigurePersonRowPerson;
  /** 관계 근거나 직군 — 이름 아래 한 줄 */
  subtitle: string | null;
}

interface FigurePersonRowsProps {
  rows: FigurePersonRowItem[];
  locale: string;
  mobilePageSize?: number;
  mobileScrollable?: boolean;
  gridClassName?: string;
}

export default function FigurePersonRows({
  rows,
  locale,
  mobilePageSize,
  mobileScrollable = false,
  gridClassName = "",
}: FigurePersonRowsProps) {
  const t = useTranslations("celebPage");
  const tv = useTranslations("contentDetail");
  const { speak, stateFor } = useRelationDialogue(locale);
  const [preview, setPreview] = useState<FigurePersonRowPerson | null>(null);

  const mobilePages =
    mobilePageSize && rows.length > mobilePageSize
      ? Array.from({ length: Math.ceil(rows.length / mobilePageSize) }, (_, i) =>
          rows.slice(i * mobilePageSize, (i + 1) * mobilePageSize),
        )
      : null;

  return (
    <>
      <ul
        className={`gap-3 ${
          mobilePages
            ? "flex items-start snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth [scrollbar-width:none] md:grid md:overflow-visible"
            : "grid"
        } ${colsFor(rows.length)} ${
          mobileScrollable && !mobilePages
            ? "max-h-[clamp(300px,52dvh,480px)] touch-pan-y overflow-y-auto overscroll-y-auto [overflow-anchor:none] [scrollbar-width:thin] md:max-h-none md:overflow-visible"
            : ""
        } ${gridClassName}`}
      >
        {(mobilePages ?? [rows]).map((page, pageIndex) => (
          <li
            key={pageIndex}
            className={
              mobilePages
                ? "flex w-full shrink-0 snap-start flex-col gap-3 md:contents"
                : "contents"
            }
          >
            {page.map(({ person, subtitle }) => {
              const speaker = stateFor(person);
              const speakLabel = t(speaker.hasVoice ? "playGreetingVoice" : "dialogue_greeting");
              const enlargeLabel = `${t("enlargePhoto")}: ${person.name}`;

              return (
                <div
                  key={person.id}
                  role="listitem"
                  className={`flex ${CARD_MIN_H} items-stretch overflow-hidden rounded-xl border border-white/10 bg-white/[0.05]`}
                >
                  {/* 얼굴 — 초상화를 크게 본다 */}
                  {person.avatarUrl ? (
                    <button
                      type="button"
                      onClick={() => setPreview(person)}
                      aria-label={enlargeLabel}
                      aria-haspopup="dialog"
                      title={t("enlargePhoto")}
                      className="group/face relative w-12 shrink-0 overflow-hidden bg-bg-main focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
                    >
                      <CelebAvatarImage
                        src={person.avatarUrl}
                        alt=""
                        className="object-cover transition-transform duration-200 group-hover/face:scale-110"
                      />
                      {/* 어둑한 베일과 확대 기호는 띄우기·거두기가 즉각이다 */}
                      <span
                        aria-hidden
                        className="absolute inset-0 hidden items-center justify-center bg-black/40 group-hover/face:flex"
                      >
                        <Expand size={15} className="text-accent" />
                      </span>
                    </button>
                  ) : (
                    <span className="relative w-12 shrink-0 overflow-hidden bg-bg-main">
                      <User
                        aria-hidden
                        size={20}
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-text-secondary"
                      />
                    </span>
                  )}

                  {/* 중앙 — 인물 대사를 읊는다. 호버 반응은 이 구역에만 준다 */}
                  <button
                    type="button"
                    onClick={() => void speak(person)}
                    disabled={!speaker.canSpeak || speaker.loading}
                    aria-label={`${speakLabel}: ${person.name}`}
                    aria-busy={speaker.loading || undefined}
                    className="group/speak flex min-w-0 flex-1 flex-col justify-center px-3.5 py-2.5 text-left hover:bg-accent/5 disabled:cursor-default disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
                  >
                    <span className="flex items-center gap-1.5 truncate font-semibold text-text-primary group-hover/speak:text-accent">
                      <span className="truncate">{person.name}</span>
                      {speaker.loading ? (
                        <LoaderCircle size={13} className="shrink-0 animate-spin text-text-tertiary" aria-hidden />
                      ) : speaker.hasVoice ? (
                        <VoiceBadge size="sm" active pulse={speaker.pulse} />
                      ) : null}
                    </span>
                    {subtitle && (
                      <span className="truncate text-xs text-text-secondary">{subtitle}</span>
                    )}
                  </button>

                  {/* 우측 띠 — 행 세로를 통째로 차지하는 바로가기. 등록 인물은 인물 상세,
                      미등록 인물은 외부 안내로 간다 */}
                  {person.listed && person.slug ? (
                    <Link
                      href={getCelebProfileUrl(person)}
                      prefetch={false}
                      aria-label={`${t("relGoPersonPage")}: ${person.name}`}
                      title={t("relGoPersonPage")}
                      className="flex w-10 shrink-0 items-center justify-center border-s border-white/10 text-text-tertiary hover:bg-accent/10 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                    >
                      <ArrowUpRight size={16} aria-hidden />
                    </Link>
                  ) : !person.listed && person.qid ? (
                    <a
                      href={`https://www.wikidata.org/wiki/${person.qid}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${t("relViewWikidata")}: ${person.name}`}
                      title={t("relViewWikidata")}
                      className="flex w-10 shrink-0 items-center justify-center border-s border-white/10 text-text-tertiary hover:bg-accent/10 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <WikiMark size={16} />
                    </a>
                  ) : null}
                </div>
              );
            })}
          </li>
        ))}
      </ul>

      {mobilePages && <SwipeControls count={mobilePages.length} />}

      {preview?.avatarUrl && (
        <ImageGalleryModal
          images={[{ src: preview.avatarUrl, alt: preview.name }]}
          initialIndex={0}
          title={preview.name}
          labels={{
            close: tv("imageViewer.close"),
            previous: tv("imageViewer.previous"),
            next: tv("imageViewer.next"),
          }}
          onClose={() => setPreview(null)}
        />
      )}
    </>
  );
}
