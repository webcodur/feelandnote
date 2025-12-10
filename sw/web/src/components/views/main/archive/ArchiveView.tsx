"use client";

import { useState } from "react";
import ContentLibrary from "@/components/features/archive/ContentLibrary";
import AddContentModal from "@/components/features/archive/AddContentModal";
import { Plus, Archive } from "lucide-react";
import { SectionHeader } from "@/components/ui";

export default function ArchiveView() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <>
      <div className="mb-8">
        <SectionHeader title="내 기록관" icon={<Archive size={24} />} />
      </div>

      <ContentLibrary
        key={refreshKey}
        showTabs
        showFilters
        showViewToggle
        emptyMessage="아직 기록한 콘텐츠가 없습니다. + 버튼을 눌러 첫 번째 콘텐츠를 추가해보세요!"
      />

      <button
        onClick={() => setIsAddModalOpen(true)}
        className="fixed bottom-10 right-10 w-16 h-16 rounded-full bg-accent flex items-center justify-center shadow-lg cursor-pointer transition-all duration-300 z-20 hover:scale-110 hover:rotate-90 hover:bg-accent-hover"
      >
        <Plus color="white" size={32} />
      </button>

      <AddContentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </>
  );
}
