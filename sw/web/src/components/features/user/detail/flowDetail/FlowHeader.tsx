"use client";

import Image from "next/image";
import { Pencil, Share2, Trash2, Lock, Globe, Layers, Bookmark, BookmarkCheck } from "lucide-react";
import Button from "@/components/ui/Button";
import { CATEGORIES } from "@/constants/categories";
import type { FlowWithStages } from "@/types/database";

interface FlowHeaderProps {
  flow: FlowWithStages;
  flowId: string;
  isOwner: boolean;
  isEditMode: boolean;
  currentUserId: string | null;
  isSaved: boolean;
  categoryCounts: Record<string, number>;
  setIsEditMode: (edit: boolean) => void;
  handleTogglePublic: () => void;
  handleDelete: () => void;
  handleToggleSave: () => void;
}

export default function FlowHeader({
  flow,
  flowId,
  isOwner,
  isEditMode,
  currentUserId,
  isSaved,
  categoryCounts,
  setIsEditMode,
  handleTogglePublic,
  handleDelete,
  handleToggleSave,
}: FlowHeaderProps) {
  void flowId;
  void currentUserId;

  const coverImage = flow.cover_url || flow.stages[0]?.nodes[0]?.content?.thumbnail_url;
  const stageNodeCounts = flow.stages.map((stage) => ({
    name: stage.name,
    count: stage.nodes.length,
  }));
  const totalNodes = flow.node_count || 0;

  return (
    <div className="relative w-full mb-8 rounded-none md:rounded-3xl overflow-hidden border-b md:border border-accent/20 bg-[#111] group">
      {coverImage && (
        <div className="absolute inset-0 z-0">
          <Image
            src={coverImage}
            alt="Background"
            fill
            className="object-cover blur-[80px] opacity-40 scale-110"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-[#111]/80 to-transparent" />
          <div className="absolute inset-0 bg-black/40" />
        </div>
      )}

      <div
        className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay z-[1]"
        style={{ backgroundImage: 'url("https://res.cloudinary.com/dchkzn79d/image/upload/v1737077656/noise_w9lq5j.png")' }}
      />

      <div className="relative z-10 p-6 md:p-10">
        <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-start text-center md:text-left">
          <div className="relative w-40 h-40 md:w-56 md:h-56 shrink-0 shadow-2xl rounded-lg overflow-hidden border border-white/10 group-hover:border-accent/50 transition-colors duration-500">
            {coverImage ? (
              <Image src={coverImage} alt={flow.name} fill unoptimized className="object-cover" />
            ) : (
              <div className="w-full h-full bg-[#1a1a1a] flex items-center justify-center">
                <Layers size={64} className="text-white/20" strokeWidth={1} />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-tr from-black/0 via-white/5 to-white/10 pointer-events-none" />
          </div>

          <div className="flex-1 flex flex-col min-w-0 pt-2">
            <div className="flex flex-wrap items-center justify-center md:justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                {isOwner ? (
                  <Button
                    onClick={handleTogglePublic}
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold tracking-wider transition-colors ${
                      flow.is_public
                        ? "bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20"
                        : "bg-white/5 border-white/10 text-text-secondary hover:bg-white/10"
                    }`}
                  >
                    {flow.is_public ? <Globe size={10} /> : <Lock size={10} />}
                    {flow.is_public ? "PUBLIC" : "PRIVATE"}
                  </Button>
                ) : flow.is_public ? (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-[10px] font-bold text-green-400 tracking-wider">
                    <Globe size={10} /> PUBLIC
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-text-secondary tracking-wider">
                    <Lock size={10} /> PRIVATE
                  </span>
                )}

                {flow.difficulty && (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-[10px] font-bold text-accent tracking-wider">
                    난이도 {flow.difficulty}
                  </span>
                )}
              </div>

              {isOwner && (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setIsEditMode(!isEditMode)}
                    aria-label="콘텐츠 관리 토글"
                    title="콘텐츠 관리 토글"
                    className={`p-2.5 border transition-colors flex items-center rounded ${
                      isEditMode
                        ? "bg-accent/15 border-accent/40 text-accent hover:bg-accent/25"
                        : "bg-white border-white text-black hover:bg-white/90"
                    }`}
                  >
                    <Pencil size={16} />
                  </Button>

                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      alert("링크가 복사되었습니다.");
                    }}
                    aria-label="링크 복사"
                    title="링크 복사"
                    className="p-2.5 bg-[#1a1a1a] border border-white/20 text-white hover:bg-white/10 rounded transition-colors flex items-center"
                  >
                    <Share2 size={16} />
                  </Button>

                  <Button
                    onClick={handleDelete}
                    aria-label="삭제"
                    title="삭제"
                    className="p-2.5 bg-[#1a1a1a] border border-red-500/40 text-red-400 hover:bg-red-500/10 rounded transition-colors flex items-center"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif font-black text-white mb-4 leading-tight">{flow.name}</h1>

            {flow.description && <p className="text-sm text-text-secondary/80 mb-2 line-clamp-2">{flow.description}</p>}

            <div className="text-sm text-text-secondary/80 font-serif space-y-1 mb-6">
              <p>
                <span className="text-white font-bold">{flow.stages.length}</span>단계 · 총{" "}
                <span className="text-white font-bold">{totalNodes}</span>개의 콘텐츠
              </p>
              {Object.entries(categoryCounts).length > 0 && (
                <p className="text-xs opacity-60">
                  {Object.entries(categoryCounts)
                    .map(([type, count]) => {
                      const cat = CATEGORIES.find((item) => item.dbType === type);
                      return cat ? `${cat.label} ${count}` : null;
                    })
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </div>

            {!isOwner && (
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-auto">
                {isSaved !== undefined && (
                  <Button
                    onClick={handleToggleSave}
                    className={`px-5 py-2.5 border transition-all flex items-center gap-2 rounded font-bold text-sm ${
                      isSaved
                        ? "bg-accent/10 border-accent text-accent hover:bg-accent/20"
                        : "bg-[#1a1a1a] border-white/20 text-white hover:bg-white/10"
                    }`}
                  >
                    {isSaved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                    {isSaved ? "저장됨" : "플로우 저장"}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {stageNodeCounts.length > 0 && totalNodes > 0 && (
        <div className="relative z-10 bg-black/40 border-t border-white/5 px-6 py-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <div className="flex-1 flex gap-[2px] h-1.5 rounded-full overflow-hidden min-w-[200px] opacity-80">
            {stageNodeCounts.map((stage, index) =>
              stage.count > 0 ? (
                <div
                  key={index}
                  className="bg-accent/70"
                  style={{ width: `${(stage.count / totalNodes) * 100}%` }}
                  title={`${stage.name}: ${stage.count}개`}
                />
              ) : null
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary whitespace-nowrap">
            {stageNodeCounts.map((stage, index) =>
              stage.count > 0 ? (
                <span key={index} className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent/70" /> {stage.name}
                </span>
              ) : null
            )}
          </div>
        </div>
      )}
    </div>
  );
}
