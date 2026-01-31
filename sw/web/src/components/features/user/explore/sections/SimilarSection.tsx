/*
  파일명: /components/features/user/explore/sections/SimilarSection.tsx
  기능: 취향 유사 유저 섹션
  책임: 취향이 유사한 유저 목록을 보여준다.
*/ // ------------------------------

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Info } from "lucide-react";
import Button from "@/components/ui/Button";
import { SimilarUserCard, EmptyState, MobileUserListItem } from "../ExploreCards";
import AlgorithmInfoModal from "../AlgorithmInfoModal";

interface SimilarUserInfo {
  id: string;
  nickname: string;
  avatar_url: string | null;
  content_count: number;
  overlap_count: number;
  similarity: number;
}

interface Props {
  similarUsers: SimilarUserInfo[];
  algorithm: "content_overlap" | "recent_activity";
}

export default function SimilarSection({ similarUsers, algorithm }: Props) {
  const router = useRouter();
  const [showAlgorithmInfo, setShowAlgorithmInfo] = useState(false);
  const handleSelectUser = (userId: string) => router.push(`/${userId}`);

  return (
    <div className="bg-surface rounded-2xl p-4 md:p-8 min-h-[400px] border border-accent-dim/10 shadow-inner shadow-black/20">
      <div className="flex justify-between items-center mb-4">
        <Button
          unstyled
          onClick={() => setShowAlgorithmInfo(true)}
          className="text-xs text-text-tertiary hover:text-text-secondary flex items-center gap-1"
        >
          <Info size={14} /> 추천 알고리즘
        </Button>
        {algorithm === "content_overlap" && similarUsers.length > 0 && (
          <span className="text-[10px] text-text-tertiary bg-background px-2 py-0.5 rounded-full">
            공통 콘텐츠 기반
          </span>
        )}
      </div>

      {similarUsers.length > 0 ? (
        <>
          {/* PC Grid */}
          <div className="hidden sm:grid grid-cols-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 md:gap-6">
            {similarUsers.map((user) => (
              <SimilarUserCard key={user.id} user={user} onClick={() => handleSelectUser(user.id)} />
            ))}
          </div>
          {/* Mobile Compact List */}
          <div className="sm:hidden flex flex-col gap-2">
            {similarUsers.map((user) => (
              <MobileUserListItem
                key={user.id}
                user={user}
                onClick={() => handleSelectUser(user.id)}
                subtext={`${user.overlap_count} 결속 · ${(user.similarity * 100).toFixed(0)}% 일치`}
              />
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          icon={<Star size={32} />}
          title="아직 유사한 유저가 없어요"
          description="콘텐츠를 기록하면 취향이 비슷한 유저를 추천해드릴게요"
        />
      )}

      <AlgorithmInfoModal isOpen={showAlgorithmInfo} onClose={() => setShowAlgorithmInfo(false)} />
    </div>
  );
}
