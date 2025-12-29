"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ContentLibrary from "@/components/features/archive/ContentLibrary";
import AddContentModal from "@/components/features/archive/AddContentModal";
import { PlaylistDropdown, PlaylistEditMode } from "@/components/features/playlist";
import { SectionHeader } from "@/components/ui";
import { Plus, Archive } from "lucide-react";
import Button from "@/components/ui/Button";

type EditMode = { type: "create" } | { type: "edit"; playlistId: string } | null;

export default function ArchiveView() {
  const router = useRouter();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editMode, setEditMode] = useState<EditMode>(null);

  const handleSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleCreatePlaylist = () => {
    setEditMode({ type: "create" });
  };

  const handleSelectPlaylist = (playlistId: string) => {
    router.push(`/archive/playlists/${playlistId}`);
  };

  const handleCloseEditMode = () => {
    setEditMode(null);
  };

  // 편집 모드일 때
  if (editMode) {
    return (
      <PlaylistEditMode
        mode={editMode.type}
        playlistId={editMode.type === "edit" ? editMode.playlistId : undefined}
        onClose={handleCloseEditMode}
        onSuccess={() => {
          handleCloseEditMode();
          handleSuccess();
        }}
      />
    );
  }

  return (
    <>
      <SectionHeader
        title="내 기록관"
        description="나의 문화생활 기록을 관리하세요"
        icon={<Archive size={20} />}
        action={
          <div className="flex items-center gap-1.5">
            <PlaylistDropdown
              onCreateNew={handleCreatePlaylist}
              onSelectPlaylist={handleSelectPlaylist}
            />
            <Button
              unstyled
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 bg-accent hover:bg-accent-hover text-white text-xs font-medium rounded-md"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">추가</span>
            </Button>
          </div>
        }
        className="mb-4"
      />

      <ContentLibrary
        key={refreshKey}
        showTabs
        showFilters
        showViewToggle
        emptyMessage="아직 기록한 콘텐츠가 없습니다. 위 버튼을 눌러 첫 번째 콘텐츠를 추가해보세요!"
      />

      {/* 모바일 FAB */}
      <Button
        unstyled
        onClick={() => setIsAddModalOpen(true)}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-accent flex items-center justify-center shadow-lg hover:scale-110 hover:bg-accent-hover sm:hidden z-20"
      >
        <Plus color="white" size={24} />
      </Button>

      <AddContentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </>
  );
}
