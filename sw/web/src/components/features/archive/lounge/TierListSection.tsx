/*
  파일명: /components/features/archive/lounge/TierListSection.tsx
  기능: 티어 리스트 섹션 컴포넌트
  책임: 재생목록 티어 목록 표시 및 필터링
*/ // ------------------------------
"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Badge, Card, FilterChips, type ChipOption } from "@/components/ui";
import { Trophy, ListMusic, Heart, Settings, Loader2 } from "lucide-react";
import type { PlaylistSummary } from "@/actions/playlists";

type TierSubTab = "all" | "with-tiers";

const TIER_TAB_OPTIONS: ChipOption<TierSubTab>[] = [
  { value: "all", label: "전체", icon: ListMusic },
  { value: "with-tiers", label: "티어 설정됨", icon: Trophy },
];

const TIER_COLORS: Record<string, string> = {
  S: "#c5a059", // Gold
  A: "#fb7185", // Rose (was Purple)
  B: "#60a5fa", // Blue
  C: "#34d399", // Emerald
  D: "#737373", // Neutral
};

interface TierListSectionProps {
  playlists: PlaylistSummary[];
  isLoading: boolean;
  onOpenSelectModal: () => void;
}

export default function TierListSection({ playlists, isLoading, onOpenSelectModal }: TierListSectionProps) {
  const [subTab, setSubTab] = useState<TierSubTab>("all");

  const filteredPlaylists = playlists.filter(p => {
    if (subTab === "with-tiers") return p.has_tiers;
    return true;
  });

  const getPlaylistHref = (playlist: PlaylistSummary) =>
    playlist.has_tiers 
      ? `/${playlist.user_id}/collections/${playlist.id}` 
      : `/${playlist.user_id}/collections/${playlist.id}/tiers`;

  return (
    <>
      <div className="mb-6 -mx-4 px-4 overflow-x-auto scrollbar-hide">
        <div className="min-w-max">
          <FilterChips options={TIER_TAB_OPTIONS} value={subTab} onChange={setSubTab} variant="filled" showIcon />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin text-accent" /></div>
      ) : filteredPlaylists.length === 0 ? (
        <div className="text-center py-20 text-text-secondary">
          <Trophy size={48} className="mx-auto mb-4 opacity-50" />
          <p className="mb-2">{subTab === "with-tiers" ? "티어가 설정된 재생목록이 없습니다" : "재생목록이 없습니다"}</p>
          <p className="text-sm mb-4">{subTab === "with-tiers" ? "재생목록에서 티어를 설정해보세요!" : "먼저 기록관에서 재생목록을 만들어주세요"}</p>
          {playlists.length > 0 && (
            <Button variant="primary" onClick={onOpenSelectModal}><Settings size={16} /> 티어 설정하기</Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filteredPlaylists.map((playlist) => (
            <Link key={playlist.id} href={getPlaylistHref(playlist)}>
              <Card hover className="p-0 overflow-hidden cursor-pointer h-full border-white/5 active:bg-white/5 transition-colors flex flex-row sm:flex-col">
              <div className="w-32 sm:w-full h-full sm:h-32 md:h-40 bg-[#1a1c20] p-2 md:p-3 flex flex-col gap-1 shrink-0">
                {playlist.has_tiers && playlist.tiers ? (
                  Object.entries(playlist.tiers).filter(([, items]) => Array.isArray(items) && items.length > 0).slice(0, 4).map(([tier, items]) => (
                    <div key={tier} className="flex h-5 sm:h-6 md:h-7 gap-1">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded flex items-center justify-center text-[8px] md:text-[11px] font-bold text-black" style={{ background: TIER_COLORS[tier] || "#808080" }}>{tier}</div>
                      <div className="flex-1 bg-white/5 rounded flex gap-0.5 p-0.5 items-center overflow-hidden">
                        {(items as string[]).slice(0, 5).map((_, j) => (
                          <div key={j} className="w-3 sm:w-4 md:w-5 h-4 sm:h-5 md:h-6 rounded-sm bg-gradient-to-br from-accent/60 to-accent/30 shadow-sm shrink-0" />
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-text-secondary/40">
                    <ListMusic size={20} className="mb-1" />
                    <span className="text-[10px] sm:text-sm">{playlist.item_count} Records</span>
                  </div>
                )}
              </div>
              <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between min-w-0">
                <div>
                  <div className="flex items-center gap-2 mb-1 md:mb-2">
                    <div className="text-xs sm:text-sm md:text-base font-bold leading-snug flex-1 truncate text-text-primary">{playlist.name}</div>
                    {playlist.has_tiers && <Badge variant="primary" className="text-[9px] sm:text-[10px] py-0 px-1.5 h-3.5 sm:h-4">TIER</Badge>}
                  </div>
                  {playlist.description && <p className="text-[10px] sm:text-xs text-text-secondary line-clamp-1 mb-2 opacity-60">{playlist.description}</p>}
                </div>
                <div className="flex justify-between items-center text-[9px] sm:text-[10px] md:text-xs text-text-tertiary border-t border-white/5 pt-2 mt-auto">
                  <div className="flex items-center gap-1"><ListMusic size={10} /><span className="font-bold text-accent/80">{playlist.item_count}</span></div>
                  {playlist.is_public && <Badge variant="default" className="text-[9px] sm:text-[9px] py-0 h-3.5 bg-white/5 border-white/10">PUBLIC</Badge>}
                </div>
              </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
