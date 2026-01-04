"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, RotateCcw } from "lucide-react";
import Button from "@/components/ui/Button";
import { getPlaylist } from "@/actions/playlists/getPlaylist";
import { updatePlaylist } from "@/actions/playlists/updatePlaylist";
import type { PlaylistWithItems, PlaylistItemWithContent, ContentType } from "@/types/database";
import { CATEGORIES } from "@/constants/categories";
import { Z_INDEX } from "@/constants/zIndex";

interface TierEditViewProps {
  playlistId: string;
}

const TIER_LABELS = ["S", "A", "B", "C", "D"] as const;
const TIER_COLORS: Record<string, string> = {
  S: "bg-red-500",
  A: "bg-orange-500",
  B: "bg-yellow-500",
  C: "bg-green-500",
  D: "bg-blue-500",
};

type TierLabel = (typeof TIER_LABELS)[number];

export default function TierEditView({ playlistId }: TierEditViewProps) {
  const router = useRouter();
  const [playlist, setPlaylist] = useState<PlaylistWithItems | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tiers, setTiers] = useState<Record<TierLabel, string[]>>({ S: [], A: [], B: [], C: [], D: [] });
  const [unranked, setUnranked] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<ContentType | "all">("all");
  const [availableTypes, setAvailableTypes] = useState<ContentType[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const loadPlaylist = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPlaylist(playlistId);
      setPlaylist(data);

      const types = new Set<ContentType>();
      data.items.forEach((item) => types.add(item.content.type as ContentType));
      setAvailableTypes(Array.from(types));

      if (data.has_tiers && data.tiers) {
        const loadedTiers: Record<TierLabel, string[]> = { S: [], A: [], B: [], C: [], D: [] };
        TIER_LABELS.forEach((tier) => {
          loadedTiers[tier] = (data.tiers[tier] || []) as string[];
        });
        setTiers(loadedTiers);

        const rankedIds = new Set(Object.values(loadedTiers).flat());
        const unrankedIds = data.items.map((item) => item.content_id).filter((id) => !rankedIds.has(id));
        setUnranked(unrankedIds);
      } else {
        setUnranked(data.items.map((item) => item.content_id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "재생목록을 불러오는데 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  }, [playlistId]);

  useEffect(() => {
    loadPlaylist();
  }, [loadPlaylist]);

  const getFilteredIds = (ids: string[]) => {
    if (selectedType === "all" || !playlist) return ids;
    return ids.filter((id) => {
      const item = playlist.items.find((i) => i.content_id === id);
      return item?.content.type === selectedType;
    });
  };

  const getItemById = (contentId: string): PlaylistItemWithContent | undefined => {
    return playlist?.items.find((item) => item.content_id === contentId);
  };

  const handleDragStart = (contentId: string) => setDraggedId(contentId);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDropOnTier = (tier: TierLabel) => {
    if (!draggedId) return;
    const newTiers = { ...tiers };
    TIER_LABELS.forEach((t) => {
      newTiers[t] = newTiers[t].filter((id) => id !== draggedId);
    });
    setUnranked((prev) => prev.filter((id) => id !== draggedId));
    newTiers[tier] = [...newTiers[tier], draggedId];
    setTiers(newTiers);
    setDraggedId(null);
  };

  const handleDropOnUnranked = () => {
    if (!draggedId) return;
    const newTiers = { ...tiers };
    TIER_LABELS.forEach((t) => {
      newTiers[t] = newTiers[t].filter((id) => id !== draggedId);
    });
    setTiers(newTiers);
    if (!unranked.includes(draggedId)) {
      setUnranked((prev) => [...prev, draggedId]);
    }
    setDraggedId(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updatePlaylist({ playlistId, hasTiers: true, tiers: tiers as Record<string, string[]> });
      router.push(`/archive/playlists/${playlistId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "저장에 실패했습니다");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (!confirm("모든 티어 설정을 초기화하시겠습니까?")) return;
    setTiers({ S: [], A: [], B: [], C: [], D: [] });
    if (playlist) {
      setUnranked(playlist.items.map((item) => item.content_id));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 mb-4">{error}</p>
        <Button unstyled onClick={() => router.back()} className="text-accent hover:underline">돌아가기</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary sticky top-0" style={{ zIndex: Z_INDEX.sticky }}>
        <div className="flex items-center gap-3">
          <Button unstyled onClick={() => router.back()} className="p-2 -ml-2 text-text-secondary hover:text-text-primary">
            <ArrowLeft size={24} />
          </Button>
          <div>
            <h1 className="font-bold">티어 설정</h1>
            <p className="text-xs text-text-secondary">{playlist.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button unstyled onClick={handleReset} className="p-2 text-text-secondary hover:text-text-primary" title="초기화">
            <RotateCcw size={20} />
          </Button>
          <Button unstyled onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover disabled:bg-accent/50 text-white text-sm font-medium rounded-lg">
            <Save size={16} />
            {isSaving ? "저장 중..." : "저장"}
          </Button>
        </div>
      </header>

      {availableTypes.length > 1 && (
        <div className="px-4 py-3 border-b border-border">
          <div className="flex gap-2 overflow-x-auto">
            <Button unstyled onClick={() => setSelectedType("all")} className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${selectedType === "all" ? "bg-accent text-white" : "bg-bg-card text-text-secondary hover:bg-bg-secondary"}`}>전체</Button>
            {availableTypes.map((type) => {
              const cat = CATEGORIES.find((c) => c.dbType === type);
              return (
                <Button unstyled key={type} onClick={() => setSelectedType(type)} className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${selectedType === type ? "bg-accent text-white" : "bg-bg-card text-text-secondary hover:bg-bg-secondary"}`}>{cat?.label || type}</Button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex-1 p-4 space-y-2 overflow-y-auto">
        {TIER_LABELS.map((tier) => (
          <div key={tier} className="flex min-h-[80px] bg-bg-card rounded-xl overflow-hidden" onDragOver={handleDragOver} onDrop={() => handleDropOnTier(tier)}>
            <div className={`w-16 flex-shrink-0 flex items-center justify-center ${TIER_COLORS[tier]} text-white font-bold text-2xl`}>{tier}</div>
            <div className="flex-1 flex flex-wrap gap-2 p-2 items-start content-start">
              {getFilteredIds(tiers[tier]).map((contentId) => {
                const item = getItemById(contentId);
                if (!item) return null;
                return (
                  <div key={contentId} draggable onDragStart={() => handleDragStart(contentId)} className={`w-14 h-14 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing ${draggedId === contentId ? "opacity-50" : ""}`}>
                    {item.content.thumbnail_url ? (
                      <img src={item.content.thumbnail_url} alt={item.content.title} className="w-full h-full object-cover" title={item.content.title} />
                    ) : (
                      <div className="w-full h-full bg-bg-secondary flex items-center justify-center text-xs text-text-secondary">{item.content.title.slice(0, 2)}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="min-h-[100px] bg-bg-secondary rounded-xl p-4" onDragOver={handleDragOver} onDrop={handleDropOnUnranked}>
          <h3 className="text-sm font-medium text-text-secondary mb-3">미분류 ({getFilteredIds(unranked).length})</h3>
          <div className="flex flex-wrap gap-2">
            {getFilteredIds(unranked).map((contentId) => {
              const item = getItemById(contentId);
              if (!item) return null;
              return (
                <div key={contentId} draggable onDragStart={() => handleDragStart(contentId)} className={`w-14 h-14 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing ${draggedId === contentId ? "opacity-50" : ""}`}>
                  {item.content.thumbnail_url ? (
                    <img src={item.content.thumbnail_url} alt={item.content.title} className="w-full h-full object-cover" title={item.content.title} />
                  ) : (
                    <div className="w-full h-full bg-bg-card flex items-center justify-center text-xs text-text-secondary">{item.content.title.slice(0, 2)}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
