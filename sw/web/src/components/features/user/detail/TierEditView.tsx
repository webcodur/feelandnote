/*
  파일명: /components/features/user/detail/TierEditView.tsx
  기능: 플로우 티어 편집 뷰
  책임: S~D 티어 형태로 플로우 아이템을 드래그 앤 드롭으로 배치한다.
*/ // ------------------------------
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Save, RotateCcw, Trophy, GripVertical } from "lucide-react";
import Button from "@/components/ui/Button";
import { getFlow } from "@/actions/flows/getFlow";
import { updateFlow } from "@/actions/flows/updateFlow";
import type { FlowWithStages, FlowNodeWithContent, ContentType } from "@/types/database";
import { CATEGORIES } from "@/constants/categories";
import { Z_INDEX } from "@/constants/zIndex";

interface TierEditViewProps {
  flowId: string;
}

const TIER_LABELS = ["S", "A", "B", "C", "D"] as const;
const TIER_CONFIG: Record<string, { label: string; color: string; border: string; bg: string; icon: string }> = {
  S: { label: "MYTHIC", color: "text-red-500", border: "border-red-500/50", bg: "bg-red-500/10", icon: "👑" },
  A: { label: "LEGENDARY", color: "text-orange-500", border: "border-orange-500/50", bg: "bg-orange-500/10", icon: "💎" },
  B: { label: "EPIC", color: "text-amber-400", border: "border-amber-400/50", bg: "bg-amber-400/10", icon: "⚔️" },
  C: { label: "RARE", color: "text-green-500", border: "border-green-500/50", bg: "bg-green-500/10", icon: "🌿" },
  D: { label: "COMMON", color: "text-blue-500", border: "border-blue-500/50", bg: "bg-blue-500/10", icon: "stone" },
};

type TierLabel = (typeof TIER_LABELS)[number];

export default function TierEditView({ flowId }: TierEditViewProps) {
  const router = useRouter();
  const [flow, setFlow] = useState<FlowWithStages | null>(null);
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
      const data = await getFlow(flowId);
      setFlow(data);

      const types = new Set<ContentType>();
      // flow에서 모든 노드의 콘텐츠 타입 추출
      data.stages.forEach(stage => 
        stage.nodes.forEach(node => types.add(node.content.type as ContentType))
      );
      setAvailableTypes(Array.from(types));

      // 모든 노드의 콘텐츠 ID 목록
      const allContentIds = data.stages.flatMap(s => s.nodes.map(n => n.content_id));

      if (data.has_tiers && data.tiers) {
        const loadedTiers: Record<TierLabel, string[]> = { S: [], A: [], B: [], C: [], D: [] };
        TIER_LABELS.forEach((tier) => {
          loadedTiers[tier] = (data.tiers![tier] || []) as string[];
        });
        setTiers(loadedTiers);

        const rankedIds = new Set(Object.values(loadedTiers).flat());
        const unrankedIds = allContentIds.filter((id) => !rankedIds.has(id));
        setUnranked(unrankedIds);
      } else {
        setUnranked(allContentIds);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "재생목록을 불러오는데 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  }, [flowId]);

  useEffect(() => {
    loadPlaylist();
  }, [loadPlaylist]);

  const getFilteredIds = (ids: string[]) => {
    if (selectedType === "all" || !flow) return ids;
    return ids.filter((id) => {
      // 모든 스테이지에서 노드 찾기
      for (const stage of flow.stages) {
        const node = stage.nodes.find(n => n.content_id === id);
        if (node) return node.content.type === selectedType;
      }
      return false;
    });
  };

  const getItemById = (contentId: string): FlowNodeWithContent | undefined => {
    if (!flow) return undefined;
    for (const stage of flow.stages) {
      const node = stage.nodes.find(n => n.content_id === contentId);
      if (node) return node;
    }
    return undefined;
  };

  const handleDragStart = (contentId: string) => {
    setDraggedId(contentId);
  };
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
    if (!flow) return;
    setIsSaving(true);
    try {
      await updateFlow({ flowId, hasTiers: true, tiers: tiers as Record<string, string[]> });
      router.push(`/${flow.user_id}/reading/collections/${flowId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "저장에 실패했습니다");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (!confirm("모든 티어 설정을 초기화하시겠습니까?")) return;
    setTiers({ S: [], A: [], B: [], C: [], D: [] });
    if (flow) {
      const allIds = flow.stages.flatMap(s => s.nodes.map(n => n.content_id));
      setUnranked(allIds);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 bg-[#0a0a0a] min-h-screen">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !flow) {
    return (
      <div className="text-center py-20 bg-[#0a0a0a] min-h-screen">
        <p className="text-red-400 mb-4">{error}</p>
        <Button unstyled onClick={() => router.back()} className="text-accent hover:underline">돌아가기</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#050505]">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Button unstyled onClick={() => router.back()} className="p-2 -ml-2 text-white/50 hover:text-white transition-colors">
            <ArrowLeft size={24} />
          </Button>
          <div>
            <h1 className="font-serif font-black text-xl text-white tracking-wide">HALL OF JUDGMENT</h1>
            <p className="text-xs text-accent/60 font-serif tracking-widest uppercase">{flow.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button unstyled onClick={handleReset} className="p-2 text-white/40 hover:text-white transition-colors" title="초기화">
            <RotateCcw size={20} />
          </Button>
          <Button 
            unstyled 
            onClick={handleSave} 
            disabled={isSaving} 
            className="flex items-center gap-2 px-6 py-2 bg-accent text-black font-bold text-sm tracking-wider hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            {isSaving ? "SAVING..." : "SAVE DECISIONS"}
          </Button>
        </div>
      </header>

      {/* Filter Tabs */}
      {availableTypes.length > 1 && (
        <div className="px-6 py-2 border-b border-white/5 bg-[#0a0a0a]">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            <Button 
              unstyled 
              onClick={() => setSelectedType("all")} 
              className={`px-4 py-1.5 text-xs font-bold tracking-wider transition-colors ${selectedType === "all" ? "text-accent border-b border-accent" : "text-white/40 hover:text-white"}`}
            >
              ALL
            </Button>
            {availableTypes.map((type) => {
              const cat = CATEGORIES.find((c) => c.dbType === type);
              return (
                <Button 
                  unstyled 
                  key={type} 
                  onClick={() => setSelectedType(type)} 
                  className={`px-4 py-1.5 text-xs font-bold tracking-wider transition-colors uppercase ${selectedType === type ? "text-accent border-b border-accent" : "text-white/40 hover:text-white"}`}
                >
                  {cat?.label || type}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        
        {/* Tier Lists */}
        <div className="space-y-4">
          {TIER_LABELS.map((tier) => (
            <div 
              key={tier} 
              className={`relative flex min-h-[140px] rounded-lg border border-white/5 overflow-hidden transition-all duration-300 ${draggedId ? "bg-white/[0.02]" : "bg-[#0a0a0a]"}`}
              onDragOver={handleDragOver} 
              onDrop={() => handleDropOnTier(tier)}
            >
              {/* Tier Label (Left Pillar) */}
              <div className={`w-24 md:w-32 flex-shrink-0 flex flex-col items-center justify-center gap-2 border-r border-white/5 ${TIER_CONFIG[tier].bg} relative overflow-hidden group`}>
                <span className={`text-4xl md:text-5xl font-black font-serif ${TIER_CONFIG[tier].color} drop-shadow-lg z-10`}>{tier}</span>
                <span className={`text-[10px] font-bold tracking-[0.2em] ${TIER_CONFIG[tier].color} opacity-60 z-10`}>{TIER_CONFIG[tier].label}</span>
                
                {/* Background Glow */}
                <div className={`absolute inset-0 opacity-20 ${tier === 'S' ? 'animate-pulse' : ''} bg-gradient-to-br from-transparent via-${TIER_CONFIG[tier].color.split('-')[1]}-500/20 to-transparent`} />
              </div>

              {/* Items Area */}
              <div className="flex-1 p-4">
                 <div className="flex flex-wrap gap-3">
                  {getFilteredIds(tiers[tier]).length === 0 && (
                    <div className="w-full h-full flex items-center justify-center opacity-10 pointer-events-none min-h-[100px]">
                      <span className="text-4xl grayscale opacity-20">{TIER_CONFIG[tier].icon}</span>
                    </div>
                  )}

                  {getFilteredIds(tiers[tier]).map((contentId) => {
                    const item = getItemById(contentId);
                    if (!item) return null;
                    return (
                      <div 
                        key={contentId} 
                        draggable 
                        onDragStart={() => handleDragStart(contentId)} 
                        className={`relative group w-20 aspect-[2/3] md:w-24 bg-[#151515] rounded border border-white/10 hover:border-accent/50 cursor-grab active:cursor-grabbing shadow-lg transition-all hover:-translate-y-1 ${draggedId === contentId ? "opacity-50" : ""}`}
                      >
                        {item.content.thumbnail_url ? (
                          <Image src={item.content.thumbnail_url} alt={item.content.title} fill unoptimized className="object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-white/20 p-2 text-center break-words">{item.content.title}</div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                           <p className="text-[10px] text-white line-clamp-2 leading-tight">{item.content.title}</p>
                        </div>
                      </div>
                    );
                  })}
                 </div>
              </div>
            </div>
          ))}
        </div>

        {/* Unranked Vault */}
        <div 
           className="mt-8 border border-white/10 rounded-lg bg-[#080808] p-6 relative overflow-hidden" 
           onDragOver={handleDragOver} 
           onDrop={handleDropOnUnranked}
        >
           {/* Vault Pattern */}
           <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
           
           <div className="relative z-10">
              <h3 className="text-sm font-bold text-white/40 tracking-widest uppercase mb-4 flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-white/20" />
                 THE VAULT ({getFilteredIds(unranked).length})
              </h3>
              
              <div className="flex flex-wrap gap-2">
                {getFilteredIds(unranked).length === 0 && (
                   <div className="w-full py-12 text-center text-white/20 text-sm font-serif italic">
                      모든 기록이 심판대에 올랐습니다.
                   </div>
                )}
                {getFilteredIds(unranked).map((contentId) => {
                  const item = getItemById(contentId);
                  if (!item) return null;
                  return (
                    <div 
                      key={contentId} 
                      draggable 
                      onDragStart={() => handleDragStart(contentId)} 
                      className={`relative w-16 aspect-square rounded overflow-hidden cursor-grab active:cursor-grabbing border border-white/5 hover:border-white/20 transition-all ${draggedId === contentId ? "opacity-50 scale-90" : ""}`}
                    >
                      {item.content.thumbnail_url ? (
                        <Image src={item.content.thumbnail_url} alt={item.content.title} fill unoptimized className="object-cover opacity-60 hover:opacity-100 transition-opacity" />
                      ) : (
                        <div className="w-full h-full bg-[#111] flex items-center justify-center text-[10px] text-white/20 p-1 text-center">{item.content.title.slice(0, 4)}</div>
                      )}
                    </div>
                  );
                })}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
