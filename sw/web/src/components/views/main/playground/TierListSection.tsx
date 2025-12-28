"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Badge, Card, FilterChips, type ChipOption } from "@/components/ui";
import { Trophy, ListMusic, Heart, Settings, Loader2 } from "lucide-react";
import type { PlaylistSummary } from "@/actions/playlists";

type TierSubTab = "all" | "with-tiers";

const TIER_TAB_OPTIONS: ChipOption<TierSubTab>[] = [
  { value: "all", label: "전체", icon: ListMusic },
  { value: "with-tiers", label: "티어 설정됨", icon: Trophy },
];

const TIER_COLORS: Record<string, string> = {
  S: "#ffd700", A: "#b57cff", B: "#4d9fff", C: "#50c878", D: "#808080",
};

interface TierListSectionProps {
  playlists: PlaylistSummary[];
  isLoading: boolean;
  onOpenSelectModal: () => void;
}

export default function TierListSection({ playlists, isLoading, onOpenSelectModal }: TierListSectionProps) {
  const router = useRouter();
  const [subTab, setSubTab] = useState<TierSubTab>("all");

  const filteredPlaylists = playlists.filter(p => {
    if (subTab === "with-tiers") return p.has_tiers;
    return true;
  });

  const handlePlaylistClick = (playlist: PlaylistSummary) => {
    router.push(playlist.has_tiers ? `/archive/playlists/${playlist.id}` : `/archive/playlists/${playlist.id}/tiers`);
  };

  return (
    <>
      <div className="mb-6">
        <FilterChips options={TIER_TAB_OPTIONS} value={subTab} onChange={setSubTab} variant="filled" showIcon />
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
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
          {filteredPlaylists.map((playlist) => (
            <Card key={playlist.id} hover className="p-0 overflow-hidden cursor-pointer" onClick={() => handlePlaylistClick(playlist)}>
              <div className="h-40 bg-[#2a2f38] p-3 flex flex-col gap-1">
                {playlist.has_tiers && playlist.tiers ? (
                  Object.entries(playlist.tiers).filter(([, items]) => Array.isArray(items) && items.length > 0).slice(0, 4).map(([tier, items]) => (
                    <div key={tier} className="flex h-7 gap-1">
                      <div className="w-7 rounded flex items-center justify-center text-[11px] font-bold text-black" style={{ background: TIER_COLORS[tier] || "#808080" }}>{tier}</div>
                      <div className="flex-1 bg-white/5 rounded flex gap-0.5 p-0.5 items-center">
                        {(items as string[]).slice(0, 10).map((_, j) => (
                          <div key={j} className="w-5 h-6 rounded-sm bg-gradient-to-br from-accent/60 to-accent/30" />
                        ))}
                        {(items as string[]).length > 10 && <span className="text-[10px] text-text-secondary ml-1">+{(items as string[]).length - 10}</span>}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-text-secondary">
                    <ListMusic size={32} className="mb-2 opacity-50" />
                    <span className="text-sm">{playlist.item_count}개 콘텐츠</span>
                    <span className="text-xs mt-1">클릭하여 티어 설정</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-base font-bold leading-snug flex-1 truncate">{playlist.name}</div>
                  {playlist.has_tiers && <Badge variant="primary">티어</Badge>}
                </div>
                {playlist.description && <p className="text-sm text-text-secondary line-clamp-1 mb-3">{playlist.description}</p>}
                <div className="flex gap-4 text-xs text-text-secondary border-t border-white/5 pt-3">
                  <div className="flex items-center gap-1"><ListMusic size={14} /><span className="font-bold">{playlist.item_count}</span><span>콘텐츠</span></div>
                  {playlist.is_public && <div className="flex items-center gap-1"><Heart size={14} /><span>공개</span></div>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
