/*
  파일명: components/features/game/tracker/TrackerResult.tsx
  기능: 결과 화면
  책임: 정답 셀럽 공개, 획득 점수, 콘텐츠 목록, 프로필 링크 표시
*/
"use client";

import Image from "next/image";
import Link from "next/link";
import { Trophy, User } from "lucide-react";
import type { TrackerContent } from "@/actions/game/getTrackerRound";
import { getCelebProfessionLabel } from "@/constants/celebProfessions";
import { cn } from "@/lib/utils";
import { getCelebProfileUrl } from "@/lib/url";
import GameContentItem from "../shared/GameContentItem";

const SCORE_LABELS: Record<number, string> = {
  6: "완벽한 추리!",
  5: "콘텐츠로 파악!",
  4: "감상 철학으로 추론!",
  3: "소개글로 간파!",
  2: "명언으로 적중!",
  1: "사지선다 성공!",
  0: "아쉽지만 다음에!",
};

interface TrackerResultProps {
  celebId: string;
  celebSlug: string | null;
  nickname: string;
  profession: string;
  avatarUrl: string | null;
  score: number;
  totalScore: number;
  streak: number;
  isNewRecord: boolean;
  contents: TrackerContent[];
  onNext: () => void;
  onQuit: () => void;
}

export default function TrackerResult({
  celebId,
  celebSlug,
  nickname,
  profession,
  avatarUrl,
  score,
  totalScore,
  streak,
  isNewRecord,
  contents,
  onNext,
  onQuit,
}: TrackerResultProps) {
  return (
    <div className="max-w-lg mx-auto space-y-6 animate-in fade-in">
      {/* 점수 표시 */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 border border-accent/30 px-4 py-1.5">
          <Trophy size={16} className="text-accent" />
          <span className="text-lg font-black font-serif text-accent">+{score}</span>
        </div>
        <p className="text-sm text-text-secondary">{SCORE_LABELS[score] ?? ""}</p>
        {isNewRecord && (
          <p className="text-sm font-bold text-accent animate-in zoom-in-95">
            신기록! 총 {totalScore}점
          </p>
        )}
      </div>

      {/* 정답 셀럽 */}
      <div className="flex flex-col items-center gap-3 rounded-xl border border-accent/30 bg-black/30 p-5">
        <div className="relative h-20 w-20 rounded-full overflow-hidden border-2 border-accent/50 bg-bg-secondary">
          {avatarUrl ? (
            <Image src={avatarUrl} alt={nickname} fill sizes="80px" className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-serif text-text-secondary">
              {nickname.charAt(0)}
            </div>
          )}
        </div>
        <div className="text-center">
          <span className="text-xs text-accent font-bold">
            {getCelebProfessionLabel(profession)}
          </span>
          <h3 className="text-xl font-serif font-bold text-white">{nickname}</h3>
        </div>
        <Link
          href={getCelebProfileUrl({ id: celebId, slug: celebSlug, profile_type: 'CELEB' })}
          target="_blank"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs text-text-secondary hover:bg-white/10 hover:text-white"
        >
          <User size={12} />
          이 인물 프로필 보기
        </Link>
      </div>

      {/* 콘텐츠 목록 */}
      {contents.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs text-text-tertiary font-cinzel uppercase tracking-wider text-center">
            이 인물이 감상한 작품
          </h4>
          <div className="space-y-1.5">
            {contents.map((c) => (
              <GameContentItem
                key={c.id}
                contentId={c.id}
                title={c.title}
                creator={c.creator}
                thumbnailUrl={c.thumbnailUrl}
                type={c.type}
                review={c.review}
                sourceUrl={c.sourceUrl}
                ownerNickname={nickname}
                size="md"
              />
            ))}
          </div>
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="flex gap-3">
        <button
          onClick={onQuit}
          className={cn(
            "flex-1 h-11 rounded-xl text-sm font-bold font-serif",
            "bg-white/10 text-white hover:bg-white/20 border border-white/20 active:scale-95"
          )}
        >
          그만하기
        </button>
        <button
          onClick={onNext}
          className={cn(
            "flex-1 h-11 rounded-xl text-sm font-bold font-serif",
            "bg-accent/20 text-accent hover:bg-accent/30 border border-accent/30 active:scale-95"
          )}
        >
          다음 문제
        </button>
      </div>
    </div>
  );
}
