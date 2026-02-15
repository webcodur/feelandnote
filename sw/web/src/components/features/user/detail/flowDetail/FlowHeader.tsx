"use client";

import Image from "next/image";
import { Pencil, Share2, Trash2, Lock, Globe, Bookmark, BookmarkCheck } from "lucide-react";
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

  const categoryEntries = Object.entries(categoryCounts)
    .map(([type, count]) => {
      const cat = CATEGORIES.find((item) => item.dbType === type);
      return cat ? `${cat.label} ${count}` : null;
    })
    .filter(Boolean);

  return (
    <div className="relative w-full mb-8 overflow-hidden">
      {/* Blurred background */}
      {coverImage && (
        <div className="absolute inset-0 z-0">
          <Image
            src={coverImage}
            alt=""
            fill
            className="object-cover blur-[60px] opacity-20 scale-125"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-b from-bg-main/40 to-bg-main" />
        </div>
      )}

      <div
        className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay z-[1]"
        style={{ backgroundImage: 'url("https://res.cloudinary.com/dchkzn79d/image/upload/v1737077656/noise_w9lq5j.png")' }}
      />

      <div className="relative z-10 px-6 md:px-10 py-8 md:py-12">
        {/* Top row: badges + actions */}
        <div className="flex items-center justify-between mb-6 gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {isOwner ? (
              <Button
                onClick={handleTogglePublic}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold tracking-wider transition-colors ${
                  flow.is_public
                    ? "bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20"
                    : "bg-white/5 border-white/10 text-text-secondary hover:bg-white/10"
                }`}
              >
                {flow.is_public ? <Globe size={10} /> : <Lock size={10} />}
                {flow.is_public ? "PUBLIC" : "PRIVATE"}
              </Button>
            ) : flow.is_public ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-[10px] font-bold text-green-400 tracking-wider">
                <Globe size={10} /> PUBLIC
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-text-secondary tracking-wider">
                <Lock size={10} /> PRIVATE
              </span>
            )}

            {flow.difficulty && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-[10px] font-bold text-accent tracking-wider">
                Lv.{flow.difficulty}
              </span>
            )}
          </div>

          {isOwner ? (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsEditMode(!isEditMode)}
                aria-label="콘텐츠 관리 토글"
                className={`p-2 border rounded-lg transition-colors flex items-center ${
                  isEditMode
                    ? "bg-accent/15 border-accent/40 text-accent hover:bg-accent/25"
                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                }`}
              >
                <Pencil size={15} />
              </Button>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert("링크가 복사되었습니다.");
                }}
                aria-label="링크 복사"
                className="p-2 bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 rounded-lg transition-colors flex items-center"
              >
                <Share2 size={15} />
              </Button>
              <Button
                onClick={handleDelete}
                aria-label="삭제"
                className="p-2 bg-white/5 border border-red-500/20 text-red-400/60 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors flex items-center"
              >
                <Trash2 size={15} />
              </Button>
            </div>
          ) : (
            isSaved !== undefined && (
              <Button
                onClick={handleToggleSave}
                className={`px-4 py-2 border rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${
                  isSaved
                    ? "bg-accent/10 border-accent/30 text-accent hover:bg-accent/20"
                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                }`}
              >
                {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                {isSaved ? "저장됨" : "저장"}
              </Button>
            )
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif font-black text-white mb-3 leading-tight">
          {flow.name}
        </h1>

        {/* Description */}
        {flow.description && (
          <p className="text-sm text-text-secondary/60 mb-4 line-clamp-3 max-w-2xl">
            {flow.description}
          </p>
        )}

        {/* Meta info */}
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-sm text-text-secondary/70 font-serif">
          <span>
            <span className="text-white/80 font-bold">{flow.stages.length}</span>단계
          </span>
          <span className="text-white/10">·</span>
          <span>
            <span className="text-white/80 font-bold">{totalNodes}</span>개 콘텐츠
          </span>
          {categoryEntries.length > 0 && (
            <>
              <span className="text-white/10">·</span>
              <span className="text-xs opacity-50">{categoryEntries.join(" · ")}</span>
            </>
          )}
        </div>
      </div>

      {/* Stage distribution bar */}
      {stageNodeCounts.length > 0 && totalNodes > 0 && (
        <div className="relative z-10 px-6 md:px-10 pb-6">
          <div className="flex gap-px h-1 rounded-full overflow-hidden">
            {stageNodeCounts.map((stage, index) =>
              stage.count > 0 ? (
                <div
                  key={index}
                  className="bg-accent/40 first:rounded-l-full last:rounded-r-full"
                  style={{ width: `${(stage.count / totalNodes) * 100}%` }}
                  title={`${stage.name}: ${stage.count}개`}
                />
              ) : null
            )}
          </div>
        </div>
      )}
    </div>
  );
}
