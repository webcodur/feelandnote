/*
  파일명: /components/features/user/detail/playlistDetail/PlaylistHeader.tsx
  기능: 플레이리스트 상세 헤더 (Hero Section)
  책임: 플레이리스트 정보, 저장/공유 버튼, 메뉴를 표시한다.
*/ // ------------------------------
"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  MoreVertical,
  Pencil,
  Trophy,
  Share2,
  Trash2,
  Lock,
  Globe,
  ListMusic,
  Bookmark,
  BookmarkCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { Z_INDEX } from "@/constants/zIndex";
import { CATEGORIES } from "@/constants/categories";
import type { PlaylistWithItems } from "@/types/database";

interface PlaylistHeaderProps {
  playlist: PlaylistWithItems;
  playlistId: string;
  isOwner: boolean;
  currentUserId: string | null;
  isSaved: boolean;
  isMenuOpen: boolean;
  categoryCounts: Record<string, number>;
  setIsMenuOpen: (open: boolean) => void;
  setIsEditMode: (edit: boolean) => void;
  handleTogglePublic: () => void;
  handleDelete: () => void;
  handleToggleSave: () => void;
}

const TIER_KEYS = ["S", "A", "B", "C", "D"] as const;
const TIER_COLORS: Record<string, string> = {
  S: "bg-red-500",
  A: "bg-orange-500",
  B: "bg-yellow-500",
  C: "bg-green-500",
  D: "bg-blue-500",
};
const TIER_DOT_COLORS: Record<string, string> = {
  S: "bg-red-500",
  A: "bg-orange-500",
  B: "bg-yellow-500",
  C: "bg-green-500",
  D: "bg-blue-500",
};

export default function PlaylistHeader({
  playlist,
  playlistId,
  isOwner,
  currentUserId,
  isSaved,
  isMenuOpen,
  categoryCounts,
  setIsMenuOpen,
  setIsEditMode,
  handleTogglePublic,
  handleDelete,
  handleToggleSave,
}: PlaylistHeaderProps) {
  const tierCounts = TIER_KEYS.map((key) => ({
    key,
    count: playlist.tiers?.[key]?.length || 0,
  }));
  const rankedCount = tierCounts.reduce((s, t) => s + t.count, 0);
  const unrankedCount = (playlist.item_count || 0) - rankedCount;

  // 커버 이미지 결정 (업로드된 커버 -> 첫 번째 아이템 썸네일 -> 기본 아이콘)
  const coverImage = playlist.cover_url || playlist.items[0]?.content.thumbnail_url;

  return (
    <div className="relative w-full mb-8 rounded-none md:rounded-3xl overflow-hidden border-b md:border border-accent/20 bg-[#111] group">
       {/* Background Blur */}
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
       
       {/* Noise Texture */}
       <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay z-[1]" style={{ backgroundImage: `url("https://res.cloudinary.com/dchkzn79d/image/upload/v1737077656/noise_w9lq5j.png")` }} />

       <div className="relative z-10 flex flex-col md:flex-row gap-6 md:gap-10 p-6 md:p-10 items-center md:items-start text-center md:text-left">
          {/* Back Button */}
          <Link 
            href={`/${playlist.user_id}/reading/collections`} 
            className="absolute top-4 left-4 p-2 text-white/50 hover:text-white transition-colors z-20"
          >
             <ArrowLeft size={24} />
          </Link>

          {/* Album Art (Cover) */}
          <div className="relative w-40 h-40 md:w-56 md:h-56 shrink-0 shadow-2xl rounded-lg overflow-hidden border border-white/10 group-hover:border-accent/50 transition-colors duration-500">
             {coverImage ? (
                <Image src={coverImage} alt={playlist.name} fill unoptimized className="object-cover" />
             ) : (
                <div className="w-full h-full bg-[#1a1a1a] flex items-center justify-center">
                   <ListMusic size={64} className="text-white/20" strokeWidth={1} />
                </div>
             )}
             
             {/* Glossy Overlay */}
             <div className="absolute inset-0 bg-gradient-to-tr from-black/0 via-white/5 to-white/10 pointer-events-none" />
          </div>

          {/* Info Section */}
          <div className="flex-1 flex flex-col min-w-0 pt-2">
             <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
                {playlist.is_public ? (
                   <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-[10px] font-bold text-green-400 tracking-wider">
                      <Globe size={10} /> PUBLIC
                   </span>
                ) : (
                   <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-text-secondary tracking-wider">
                      <Lock size={10} /> PRIVATE
                   </span>
                )}
                
                {playlist.has_tiers && (
                   <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400" title="Tier Rated">
                      <Trophy size={12} />
                   </span>
                )}
             </div>

             <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif font-black text-white mb-4 leading-tight">
                {playlist.name}
             </h1>

             <div className="text-sm text-text-secondary/80 font-serif space-y-1 mb-6">
                <p>
                   총 <span className="text-white font-bold">{playlist.item_count}</span>개의 기록이 보관되어 있습니다.
                </p>
                {Object.entries(categoryCounts).length > 0 && (
                  <p className="text-xs opacity-60">
                    {Object.entries(categoryCounts).map(([type, count]) => {
                      const cat = CATEGORIES.find((c) => c.dbType === type);
                      return cat ? `${cat.label} ${count}` : null;
                    }).filter(Boolean).join(" · ")}
                  </p>
                )}
             </div>

             {/* Action Buttons */}
             <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-auto">
                {isOwner ? (
                   <>
                      <Button
                         onClick={() => setIsEditMode(true)}
                         className="px-5 py-2.5 bg-white text-black font-bold text-sm hover:bg-white/90 transition-colors flex items-center gap-2 rounded"
                      >
                         <Pencil size={16} /> 콘텐츠 관리
                      </Button>
                      <Link 
                         href={`/${playlist.user_id}/reading/collections/${playlistId}/tiers`}
                         className="px-5 py-2.5 bg-[#1a1a1a] border border-white/20 text-white font-bold text-sm hover:bg-white/10 transition-colors flex items-center gap-2 rounded"
                      >
                         <Trophy size={16} /> 티어 설정
                      </Link>
                      
                      <div className="relative">
                         <Button unstyled onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2.5 bg-[#1a1a1a] border border-white/20 text-white hover:bg-white/10 rounded transition-colors">
                            <MoreVertical size={20} />
                         </Button>

                         {isMenuOpen && (
                            <>
                               <div className="fixed inset-0 z-[99]" onClick={() => setIsMenuOpen(false)} />
                               <div className="absolute bottom-full left-0 mb-2 w-48 bg-[#1a1a1a] border border-white/10 rounded shadow-xl overflow-hidden z-[100]">
                                  <Button unstyled onClick={handleTogglePublic} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-left text-sm text-text-secondary hover:text-white">
                                     {playlist.is_public ? <Lock size={16} /> : <Globe size={16} />}
                                     {playlist.is_public ? "비공개로 전환" : "공개로 전환"}
                                  </Button>
                                  <Button unstyled onClick={() => { navigator.clipboard.writeText(window.location.href); alert("링크가 복사되었습니다"); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-left text-sm text-text-secondary hover:text-white">
                                     <Share2 size={16} />링크 복사
                                  </Button>
                                  <div className="h-[1px] bg-white/10 my-1" />
                                  <Button unstyled onClick={handleDelete} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-500/10 text-left text-sm text-red-400">
                                     <Trash2 size={16} />컬렉션 삭제
                                  </Button>
                               </div>
                            </>
                         )}
                      </div>
                   </>
                ) : (
                   isSaved !== undefined && (
                      <Button
                         onClick={handleToggleSave}
                         className={`px-5 py-2.5 border transition-all flex items-center gap-2 rounded font-bold text-sm ${
                            isSaved 
                            ? "bg-accent/10 border-accent text-accent hover:bg-accent/20" 
                            : "bg-[#1a1a1a] border-white/20 text-white hover:bg-white/10"
                         }`}
                      >
                         {isSaved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                         {isSaved ? "저장됨" : "컬렉션 저장"}
                      </Button>
                   )
                )}
             </div>
          </div>
       </div>

       {/* Tier Distribution Bar (Integrated to bottom) */}
       {playlist.has_tiers && rankedCount > 0 && (
          <div className="relative z-10 bg-black/40 border-t border-white/5 px-6 py-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
             <div className="flex-1 flex gap-[1px] h-1.5 rounded-full overflow-hidden min-w-[200px] opacity-80">
                {tierCounts.map(({ key, count }) =>
                   count > 0 && (
                      <div
                         key={key}
                         className={TIER_COLORS[key]}
                         style={{ width: `${(count / (rankedCount + unrankedCount)) * 100}%` }}
                      />
                   ),
                )}
                {unrankedCount > 0 && <div className="bg-white/10" style={{ width: `${(unrankedCount / (rankedCount + unrankedCount)) * 100}%` }} />}
             </div>
             <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary whitespace-nowrap">
                {tierCounts.map(({ key, count }) => count > 0 && (
                   <span key={key} className="flex items-center gap-1"><span className={`w-1.5 h-1.5 rounded-full ${TIER_DOT_COLORS[key]}`} /> {key}</span>
                ))}
             </div>
          </div>
       )}
    </div>
  );
}

