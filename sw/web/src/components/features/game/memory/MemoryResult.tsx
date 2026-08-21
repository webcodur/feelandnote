"use client";

import { useEffect, useMemo, useState } from "react";
import { RotateCcw, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import { Z_INDEX } from "@/constants/zIndex";
import { getCategoryByDbType } from "@/constants/categories";
import {
  getDawnCelebContents,
  type DawnContent,
} from "@/actions/game/getDawnCelebContents";
import CelebContentTimeline, {
  type TimelineContent,
} from "../shared/CelebContentTimeline";
import ContentReviewModal from "../shared/ContentReviewModal";
import type { MemoryDifficulty, MemoryFigure } from "./types";

interface Props {
  difficulty: MemoryDifficulty;
  figures: MemoryFigure[];
  moves: number;
  elapsedSeconds: number;
  hasNextDifficulty: boolean;
  onReplay: () => void;
  onNext: () => void;
  onLobby: () => void;
}

export default function MemoryResult({
  difficulty,
  figures,
  moves,
  elapsedSeconds,
  hasNextDifficulty,
  onReplay,
  onNext,
  onLobby,
}: Props) {
  const t = useTranslations("rest.arena.memory");
  const [contentsMap, setContentsMap] = useState<Record<string, DawnContent[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [reviewContent, setReviewContent] = useState<{
    content: TimelineContent;
    ownerNickname: string;
  } | null>(null);

  // 여명과 같은 세로 연대기로 보여준다 — 태어난 순으로 줄 세운다
  const timelineCelebs = useMemo(
    () =>
      [...figures]
        .sort((a, b) => a.birthYear - b.birthYear)
        .map((figure) => ({
          id: figure.id,
          nickname: figure.name,
          avatar_url: figure.avatarUrl,
          profession: figure.profession,
          birthYear: figure.birthYear,
        })),
    [figures]
  );
  const figureIds = useMemo(() => figures.map((figure) => figure.id), [figures]);

  useEffect(() => {
    let alive = true;
    getDawnCelebContents(figureIds).then((data) => {
      if (!alive) return;
      setContentsMap(data);
      setIsLoading(false);
    });
    return () => { alive = false; };
  }, [figureIds]);

  return (
    <div className="mx-auto w-full max-w-lg space-y-7 py-8">
      {/* 결과 요약 */}
      <div className="flex flex-col items-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-accent/40 bg-accent/10 text-accent shadow-[0_0_45px_-12px_rgba(212,175,55,0.9)]">
          <Trophy className="h-9 w-9" aria-hidden />
        </div>
        <p className="mt-5 font-cinzel text-sm font-bold tracking-[0.2em] text-accent">
          {t(`difficulty.${difficulty}.label`)}
        </p>
        <h2 className="mt-2 font-serif text-3xl font-black text-text-primary sm:text-4xl">
          {t("result.title")}
        </h2>
        <p className="mt-3 text-base text-text-secondary">
          {t("result.summary", { moves, seconds: elapsedSeconds })}
        </p>

        <div className="mt-7 grid w-full grid-cols-2 gap-3 rounded-xl border border-white/10 bg-bg-main/75 p-4">
          <div>
            <span className="block text-sm text-text-secondary">{t("moves")}</span>
            <strong className="mt-1 block font-cinzel text-2xl text-text-primary">{moves}</strong>
          </div>
          <div>
            <span className="block text-sm text-text-secondary">{t("time")}</span>
            <strong className="mt-1 block font-cinzel text-2xl text-text-primary">
              {t("seconds", { seconds: elapsedSeconds })}
            </strong>
          </div>
        </div>

        <div className="mt-7 flex w-full flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onReplay}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-5 py-2.5 font-serif font-bold text-text-primary hover:border-accent/60 hover:bg-white/[0.08] hover:text-accent"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            {t("result.replay")}
          </button>
          {hasNextDifficulty ? (
            <button
              type="button"
              onClick={onNext}
              className="min-h-11 flex-1 rounded-lg border border-accent bg-accent px-5 py-2.5 font-serif font-bold text-bg-main hover:border-accent-hover hover:bg-accent-hover"
            >
              {t("result.next")}
            </button>
          ) : (
            <button
              type="button"
              onClick={onLobby}
              className="min-h-11 flex-1 rounded-lg border border-accent bg-accent px-5 py-2.5 font-serif font-bold text-bg-main hover:border-accent-hover hover:bg-accent-hover"
            >
              {t("result.lobby")}
            </button>
          )}
        </div>
      </div>

      {/* 만난 인물 — 외운 얼굴을 그 사람의 감상 기록으로 이어준다 */}
      <div className="space-y-1">
        <h4 className="mb-5 text-center font-cinzel text-sm uppercase tracking-wider text-text-secondary">
          {t("result.figuresTitle")}
        </h4>

        <CelebContentTimeline
          celebs={timelineCelebs}
          contentsMap={contentsMap}
          isLoading={isLoading}
          emptyLabel={t("result.figuresEmpty")}
          onReviewClick={(content, ownerNickname) =>
            setReviewContent({ content, ownerNickname })
          }
        />
      </div>

      {/* 감상배경 모달 — 게임 전체화면 위에 띄운다 */}
      <ContentReviewModal
        isOpen={!!reviewContent}
        onClose={() => setReviewContent(null)}
        title={reviewContent?.content.title ?? ""}
        creator={reviewContent?.content.creator}
        review={reviewContent?.content.review}
        sourceUrl={reviewContent?.content.sourceUrl}
        ownerNickname={reviewContent?.ownerNickname}
        contentDetailUrl={
          reviewContent
            ? `/content/${reviewContent.content.contentId}?category=${getCategoryByDbType(reviewContent.content.type)?.id || "book"}`
            : undefined
        }
        zIndex={Z_INDEX.gameModal}
      />
    </div>
  );
}
