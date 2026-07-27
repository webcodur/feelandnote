"use client";

import { useState, lazy, Suspense } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Users, Volume2, Images, Quote, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/types/locale";
import type { FeaturedTag, FeaturedCeleb } from "@/actions/home";
import { toTeamImages } from "@feelandnote/shared/lib/faction-team-image";
import FactionMediaLinks from "@/components/features/faction/FactionMediaLinks";
import type { DialogueSubtitleData } from "@/components/features/game/shared/hooks/useDialogue";
import { useCelebGreeting } from "@/hooks/useCelebGreeting";

const CelebDetailModal = lazy(() => import("@/components/features/celeb/modals/CelebDetailModal"));

/*
  세력도감 쇼케이스.
  단체샷과 개인샷을 한 도화지에서 함께 다룬다.
  - 좌측: 선택된 항목의 사진(단체샷 또는 개인샷) + 제목 + 설명
  - 우측: 단체 + 인물들을 한 리스트로. 맨 위가 단체(기본 선택), 아래가 인물.
  리스트에서 항목을 고르면 좌측 사진과 설명이 그 항목으로 바뀐다.
*/
interface FactionShowcaseProps {
  activeTag: FeaturedTag;
  locale: Locale;
  onSubtitle?: (data: DialogueSubtitleData) => void;
}

type ShowcaseItem =
  | { type: "team"; imageIdx: number }
  | { type: "celeb"; celeb: FeaturedCeleb; celebIdx: number; nested: boolean };

export default function FactionShowcase({ activeTag, locale, onSubtitle }: FactionShowcaseProps) {
  const t = useTranslations("landing");
  const { fireGreeting } = useCelebGreeting({ onSubtitle, locale });

  const celebs = activeTag.celebs;
  /*
    한 번 더 정규화한다 — 화면 저장분(캐시)에는 「주소만 있는」 옛 형태가 남아 있을 수 있고,
    그걸 새 형태로 읽으면 사진이 통째로 사라진다. 두 형태를 다 받는 자리를 여기 둔다.
  */
  const teamImages = toTeamImages(activeTag.team_images);
  const hasTeam = teamImages.length > 0;
  const teamName = locale === "en" ? activeTag.name_en ?? activeTag.name : activeTag.name;
  const teamDesc = locale === "en" ? activeTag.description_en ?? activeTag.description : activeTag.description;

  /*
    목록은 「단체 사진 한 장 + 그 사진에 나오는 사람들」을 한 덩어리로 세운다.

    사진은 테마 전체가 아니라 그 안의 한 무리를 찍은 것이다(앤트로픽 12명 중 "안전을 설계한
    사람들" 3명). 그래서 사진을 위에 따로 얹고 명단을 그 아래 통으로 늘어놓으면, 사진과 사람이
    서로 남남으로 보인다. 사진 아래에 그 사진의 사람만 매달아 소속이 눈에 보이게 한다.

    어느 사진에도 안 걸린 사람은 맨 아래 따로 모은다 — 옛 사진(누가 나오는지 없는 것)만 있는
    테마는 자연히 예전 모습(사진 하나 + 전체 명단) 그대로가 된다.
  */
  const items: ShowcaseItem[] = [];
  const placed = new Set<string>();

  teamImages.forEach((img, imageIdx) => {
    items.push({ type: "team", imageIdx });
    for (const id of img.celebIds ?? []) {
      if (placed.has(id)) continue;
      const celebIdx = celebs.findIndex(c => c.id === id);
      if (celebIdx < 0) continue;
      placed.add(id);
      items.push({ type: "celeb", celeb: celebs[celebIdx], celebIdx, nested: true });
    }
  });

  celebs.forEach((celeb, celebIdx) => {
    if (placed.has(celeb.id)) return;
    items.push({ type: "celeb", celeb, celebIdx, nested: false });
  });

  /** 사진 항목의 자리 번호 — 좌우 화살표가 사진에서 사진으로 건너뛰는 데 쓴다 */
  const teamItemIdxs = items.flatMap((it, i) => (it.type === "team" ? [i] : []));

  const [selectedIdx, setSelectedIdx] = useState(0);
  // 개인 화보를 누르면 그 인물이 세력도 영상에서 하는 말을 사진 위에 띄운다
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [modalCeleb, setModalCeleb] = useState<FeaturedCeleb | null>(null);
  const [modalCelebIdx, setModalCelebIdx] = useState(-1);

  // 테마 전환 시 상태 초기화는 부모가 key={activeTag.id}로 재마운트해 처리한다.
  const current = items[selectedIdx] ?? items[0];

  if (!current) return null;

  // 리스트 클릭: 좌측을 그 항목으로 전환만 한다 (대사는 사진의 스피커 버튼에서)
  const selectItem = (idx: number) => {
    setSelectedIdx(idx);
    setQuoteOpen(false);
  };

  const openModal = () => {
    if (current.type !== "celeb") return;
    setModalCeleb(current.celeb);
    setModalCelebIdx(current.celebIdx);
  };

  // ── 좌측 사진 ──
  // 고른 항목이 사진이면 그 사진을, 사람이면 그 사람의 화보를 크게 건다
  const teamSlide = current.type === "team" ? current.imageIdx : 0;
  const teamImage = hasTeam ? teamImages[teamSlide] ?? teamImages[0] : null;
  const teamSrc = teamImage?.url ?? null;
  const teamImageLabel =
    (locale === "en" ? teamImage?.labelEn ?? teamImage?.label : teamImage?.label)?.trim() || null;
  // 사진에 나오는 인물을 자리 번호로 바꾼다 — 이름을 눌러 그 사람으로 넘어가기 위해서다
  const teamImageMembers = (teamImage?.celebIds ?? [])
    .map(id => items.findIndex(it => it.type === "celeb" && it.celeb.id === id))
    .filter(i => i >= 0)
    .map(itemIdx => ({ celeb: (items[itemIdx] as { celeb: FeaturedCeleb }).celeb, itemIdx }));
  const celebSrc = current.type === "celeb" ? current.celeb.spotlight_image_url ?? current.celeb.avatar_url : null;
  const photoSrc = current.type === "team" ? teamSrc : celebSrc;
  const fallbackInitial = current.type === "team" ? teamName[0] : current.celeb.nickname[0];
  const photoAlt = current.type === "team" ? teamName : current.celeb.nickname;

  // 이 인물이 세력도 영상에서 하는 말. 없으면 아무 표시도 하지 않는다(빈 말풍선을 띄우지 않는다)
  const factionQuote =
    current.type === "celeb"
      ? (locale === "en" ? current.celeb.faction_quote_en ?? current.celeb.faction_quote : current.celeb.faction_quote)?.trim() || null
      : null;
  const showQuoteOverlay = quoteOpen && !!factionQuote;

  const photo = (
    <div className="group/photo relative w-full aspect-square overflow-hidden rounded-xl bg-[#0a0a0a] ring-1 ring-white/10">
      {photoSrc ? (
        <>
          {/* 흐린 배경으로 여백을 메우고, 전경은 잘림 없이 노출 */}
          <Image src={photoSrc} alt="" fill unoptimized aria-hidden className="object-cover scale-110 blur-2xl opacity-40" />
          <div className="absolute inset-0 bg-black/20" />
          <Image
            key={`${current.type === "team" ? "team-" + teamSlide : current.celeb.id}`}
            src={photoSrc}
            alt={photoAlt}
            fill
            unoptimized
            priority
            sizes="(max-width: 768px) 100vw, 600px"
            className="object-contain animate-fade-in"
          />
        </>
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: `radial-gradient(circle at 30% 25%, ${activeTag.color}40, #0a0a0a 70%)` }}
        >
          <span className="font-serif font-black text-white/25 text-8xl">{fallbackInitial}</span>
        </div>
      )}

      {/* 단체샷 캐러셀 컨트롤 (여러 장일 때) */}
      {current.type === "team" && teamImages.length > 1 && (
        <>
          {/* 장수 카운터 */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-white/90 tabular-nums">
            <Images size={12} />
            {teamSlide + 1} / {teamImages.length}
          </div>
          {/* 사진끼리 건너뛴다 — 목록에서도 그 사진이 함께 선택된다 */}
          <button
            type="button"
            aria-label={t("previousPhoto")}
            onClick={() => selectItem(teamItemIdxs[(teamSlide - 1 + teamImages.length) % teamImages.length])}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md flex items-center justify-center text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            aria-label={t("nextPhoto")}
            onClick={() => selectItem(teamItemIdxs[(teamSlide + 1) % teamImages.length])}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md flex items-center justify-center text-white transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
            {teamImages.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`${i + 1}번째 사진`}
                onClick={() => selectItem(teamItemIdxs[i])}
                className={cn(
                  "h-2 rounded-full transition-all duration-200",
                  i === teamSlide ? "bg-accent w-4" : "bg-white/50 w-2 hover:bg-white/70"
                )}
              />
            ))}
          </div>
        </>
      )}

      {/* 인물 대사 듣기 (스피커) — 한마디를 펼친 동안은 감춘다 */}
      {current.type === "celeb" && !showQuoteOverlay && (
        <button
          type="button"
          aria-label={t("playLine")}
          title={t("playLine")}
          onClick={() => fireGreeting(current.celeb)}
          className="absolute bottom-3 right-3 z-10 w-11 h-11 rounded-full bg-black/55 hover:bg-black/75 border border-white/15 backdrop-blur-md flex items-center justify-center text-white/90 hover:text-accent active:scale-90 transition-[transform,color,background-color] duration-150"
        >
          <Volume2 className="w-5 h-5" />
        </button>
      )}

      {/*
        한마디 — 화보 전체가 여닫는 단추다(재클릭으로 닫힌다).
        말풍선과 닫기 표시는 클릭을 가로채지 않도록(pointer-events-none) 두어
        어디를 눌러도 같은 단추가 받는다. 그래서 X 자리를 눌러도 닫힌다.
      */}
      {factionQuote && current.type === "celeb" && (
        <>
          <button
            type="button"
            aria-label={showQuoteOverlay ? t("hideQuote") : t("showQuote")}
            title={showQuoteOverlay ? t("hideQuote") : t("showQuote")}
            aria-expanded={showQuoteOverlay}
            onClick={() => setQuoteOpen(o => !o)}
            className="absolute inset-0 z-0 cursor-pointer"
          />
          {!showQuoteOverlay && (
            <span className="pointer-events-none absolute top-3 left-3 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-white/80 group-hover/photo:text-accent group-hover/photo:border-accent/50">
              <Quote size={12} />
              {t("showQuote")}
            </span>
          )}
          {showQuoteOverlay && (
            <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 p-6 md:p-8 bg-black/80 backdrop-blur-sm animate-fade-in">
              <Quote size={20} style={{ color: activeTag.color }} />
              <p className="max-w-[34ch] text-center text-[15px] md:text-lg font-serif font-medium text-white leading-relaxed break-keep">
                {factionQuote}
              </p>
              <span className="text-xs md:text-sm font-sans text-white/60">— {current.celeb.nickname}</span>
              <span className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 border border-white/15 flex items-center justify-center text-white/80 group-hover/photo:text-accent">
                <X className="w-4 h-4" />
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );

  // ── 좌측 설명 ──
  const shortDesc = current.type === "celeb" ? (locale === "en" ? current.celeb.short_desc_en ?? current.celeb.short_desc : current.celeb.short_desc) : null;
  const longDesc = current.type === "celeb" ? (locale === "en" ? current.celeb.long_desc_en ?? current.celeb.long_desc : current.celeb.long_desc) : null;

  const detail = (
    <div className="flex flex-col gap-2.5">
      {current.type === "team" ? (
        <>
          <span className="inline-flex items-center gap-1.5 text-xs font-serif font-bold tracking-wider" style={{ color: activeTag.color }}>
            <Users size={13} />
            {teamImageLabel ? teamName : t("groupShot")}
          </span>
          <h3 className="text-2xl md:text-3xl font-serif font-black text-white leading-tight">
            {teamImageLabel ?? teamName}
          </h3>
          {teamDesc && !teamImageLabel && (
            <p className="text-sm md:text-[15px] text-text-secondary font-sans leading-relaxed break-keep">{teamDesc}</p>
          )}
          {/* 이 사진에 나오는 사람은 오른쪽 목록에서 이 사진 아래에 매달려 있다 — 여기선 수만 알린다 */}
          {teamImageMembers.length > 0 && (
            <p className="text-sm text-text-tertiary font-sans">
              {t("figureCount", { count: teamImageMembers.length })}
            </p>
          )}
        </>
      ) : (
        <>
          {current.celeb.title && (
            <span className="text-xs md:text-sm font-serif font-bold tracking-wider" style={{ color: activeTag.color }}>
              {current.celeb.title}
            </span>
          )}
          <h3 className="text-2xl md:text-3xl font-serif font-black text-white leading-tight">{current.celeb.nickname}</h3>
          {shortDesc && <p className="text-base text-white/90 font-sans leading-relaxed text-balance">{shortDesc}</p>}
          {longDesc && <p className="text-sm md:text-[15px] text-text-secondary font-sans leading-relaxed break-keep">{longDesc}</p>}
          <button
            type="button"
            onClick={openModal}
            className="group/btn inline-flex items-center gap-1 mt-1 self-start text-sm font-semibold transition-colors hover:brightness-125"
            style={{ color: activeTag.color }}
          >
            {t("viewDetail")}
            <ChevronRight size={15} className="transition-transform group-hover/btn:translate-x-0.5" />
          </button>
        </>
      )}
    </div>
  );

  // ── 우측 리스트 ──
  const list = (
    <div className="flex flex-col gap-2 md:max-h-[600px] md:overflow-y-auto md:pr-1 scrollbar-hidden">
      {items.map((item, idx) => {
        const isSel = idx === selectedIdx;
        const isTeam = item.type === "team";
        const img = isTeam ? teamImages[item.imageIdx] : null;
        // 사진에 무리 이름이 있으면 그것이 제목이다. 없는 옛 사진은 테마 이름으로 대신한다
        const imgLabel = (locale === "en" ? img?.labelEn ?? img?.label : img?.label)?.trim() || null;
        const memberCount = isTeam
          ? (img?.celebIds ?? []).filter(id => celebs.some(c => c.id === id)).length
          : 0;
        const label = isTeam ? imgLabel ?? teamName : item.celeb.nickname;
        const sub = isTeam
          ? t("figureCount", { count: memberCount || celebs.length })
          : item.celeb.title;
        const thumb = isTeam ? img?.url ?? null : item.celeb.avatar_url;
        // 사진에 매달린 사람은 한 칸 들여쓰고 세로줄로 소속을 보인다
        const nested = item.type === "celeb" && item.nested;
        return (
          <div key={isTeam ? `team-${item.imageIdx}` : item.celeb.id} className={cn("flex", nested && "pl-4")}>
            {nested && <span className="mr-2 w-px shrink-0 self-stretch bg-white/10" />}
            <button
              onClick={() => selectItem(idx)}
              className={cn(
                "relative w-full flex items-center gap-3 rounded-xl text-left border overflow-hidden cursor-pointer",
                nested ? "p-2" : "p-2.5",
                isSel ? "bg-accent/10 border-accent/40 shadow-sm" : "bg-white/[0.02] border-white/5 hover:bg-white/[0.06] hover:border-white/10"
              )}
            >
              <div
                className={cn(
                  "relative rounded-lg overflow-hidden flex-shrink-0 border-2 transition-colors",
                  nested ? "w-10 h-10" : "w-12 h-12",
                  isSel ? "border-accent/50" : "border-white/10"
                )}
              >
                {thumb ? (
                  <Image src={thumb} alt={label} fill sizes="48px" className="object-cover" />
                ) : (
                  <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                    {isTeam ? <Users size={18} className="text-white/30" /> : <span className="text-sm text-white/25 font-serif font-black">{label[0]}</span>}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                {isTeam ? (
                  <span className="text-[9px] font-cinzel font-bold tracking-widest uppercase" style={{ color: activeTag.color }}>
                    {t("groupShot")}
                  </span>
                ) : (
                  item.celeb.title && (
                    <span className={cn("text-[9px] font-cinzel font-bold tracking-wider uppercase truncate", isSel ? "text-amber-500" : "text-amber-500/50")}>
                      {item.celeb.title}
                    </span>
                  )
                )}
                <span className={cn("font-sans font-bold truncate transition-colors", nested ? "text-[13px]" : "text-sm", isSel ? "text-white" : "text-text-secondary")}>
                  {label}
                </span>
                {sub && isTeam && <span className="text-[11px] text-text-tertiary font-sans">{sub}</span>}
              </div>

              {!isTeam ? (
                <span className={cn("text-xs font-cinzel font-bold flex-shrink-0 w-6 text-right", isSel ? "text-accent" : "text-white/15")}>
                  {(item.celebIdx + 1).toString().padStart(2, "0")}
                </span>
              ) : (
                teamImages.length > 1 && (
                  <span className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-semibold text-white/70 tabular-nums">
                    <Images size={11} />
                    {item.imageIdx + 1}/{teamImages.length}
                  </span>
                )
              )}
            </button>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="w-full max-w-5xl mx-auto px-4">
      <div className="flex flex-col md:flex-row md:items-stretch gap-6">
        {/* 좌측: 사진 + 설명 */}
        <div className="md:w-[56%] flex flex-col gap-5">
          {photo}
          {detail}
          {/*
            이 테마를 다룬 세력도 영상과 그 구간에 흐르는 배경음악. 고른 항목이 사람이든 단체든
            테마 자체의 것이라 선택과 무관하게 같은 자리에 둔다. 없으면 아무것도 뜨지 않는다.
          */}
          <FactionMediaLinks videos={activeTag.videos} music={activeTag.music} title={teamName} />
        </div>
        {/* 우측: 단체 + 인물 리스트 */}
        <div className="md:w-[44%]">{list}</div>
      </div>

      {/* 인물 상세 모달 */}
      {modalCeleb && (
        <Suspense fallback={null}>
          <CelebDetailModal
            celeb={modalCeleb}
            isOpen={!!modalCeleb}
            onClose={() => {
              setModalCeleb(null);
              setModalCelebIdx(-1);
            }}
            onNavigate={(dir) => {
              const next = dir === "prev" ? modalCelebIdx - 1 : modalCelebIdx + 1;
              if (next >= 0 && next < celebs.length) {
                setModalCelebIdx(next);
                setModalCeleb(celebs[next]);
              }
            }}
            hasPrev={modalCelebIdx > 0}
            hasNext={modalCelebIdx < celebs.length - 1}
          />
        </Suspense>
      )}
    </div>
  );
}
