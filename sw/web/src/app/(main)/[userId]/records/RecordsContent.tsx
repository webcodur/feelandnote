"use client";

import { useState } from "react";
import ContentLibrary from "@/components/features/user/contentLibrary/ContentLibrary";
import AddContentModal from "@/components/features/user/modals/AddContentModal";
import { Plus } from "lucide-react";
import Button from "@/components/ui/Button";
import { Z_INDEX } from "@/constants/zIndex";

interface RecordsContentProps {
  userId: string;
  isOwner: boolean;
  nickname?: string;
}

export default function RecordsContent({ userId, isOwner, nickname }: RecordsContentProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = () => setRefreshKey((prev) => prev + 1);

  return (
    <>
      <ContentLibrary
        key={refreshKey}
        mode={isOwner ? "owner" : "viewer"}
        targetUserId={userId}
        emptyMessage={isOwner ? "아직 기록한 콘텐츠가 없습니다." : "공개된 기록이 없습니다."}
        showPagination={true}
        ownerNickname={nickname}
      />

      {isOwner && (
        <>
          <Button
            unstyled
            onClick={() => setIsAddModalOpen(true)}
            className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-accent text-bg-main flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:scale-110 hover:bg-accent-hover hover:shadow-[0_0_20px_rgba(212,175,55,0.5)] transition-all duration-300 border-2 border-white/10 sm:hidden"
            style={{ zIndex: Z_INDEX.fab }}
          >
            <Plus size={28} strokeWidth={2.5} />
          </Button>
          <AddContentModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSuccess={handleSuccess} />
        </>
      )}
    </>
  );
}
