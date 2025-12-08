"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import ContentCard from "@/components/features/archive/ContentCard";
import ContentListItem from "@/components/features/archive/ContentListItem";
import AddContentModal from "@/components/features/archive/AddContentModal";
import { getMyContents, type UserContentWithContent } from "@/actions/contents/getMyContents";
import { updateProgress } from "@/actions/contents/updateProgress";
import type { ContentType } from "@/actions/contents/addContent";
import { Plus, Book, Film, Tv, Gamepad2, Archive, Music, Loader2, LayoutGrid, List } from "lucide-react";
import { SectionHeader, ContentGrid } from "@/components/ui";

type ViewMode = "grid" | "list";

const TABS: { id: string; label: string; type?: ContentType }[] = [
  { id: "all", label: "전체" },
  { id: "book", label: "도서", type: "BOOK" },
  { id: "movie", label: "영화", type: "MOVIE" },
];

function getIconForTab(tabId: string) {
  switch (tabId) {
    case "book":
      return <Book size={16} />;
    case "movie":
      return <Film size={16} />;
    case "drama":
      return <Tv size={16} />;
    case "animation":
      return <Music size={16} />;
    case "game":
      return <Gamepad2 size={16} />;
    default:
      return null;
  }
}

export default function ArchivePage() {
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [contents, setContents] = useState<UserContentWithContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadContents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const tab = TABS.find((t) => t.id === activeTab);
      const data = await getMyContents({ type: tab?.type });
      setContents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "콘텐츠를 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadContents();
  }, [loadContents]);

  const handleProgressChange = useCallback(async (userContentId: string, progress: number) => {
    // 낙관적 업데이트: UI 먼저 반영
    setContents((prev) =>
      prev.map((item) =>
        item.id === userContentId ? { ...item, progress } : item
      )
    );

    try {
      await updateProgress({ userContentId, progress });
    } catch (err) {
      // 실패 시 원복을 위해 다시 로드
      loadContents();
      console.error("진행도 업데이트 실패:", err);
    }
  }, [loadContents]);

  return (
    <>
      <div className="mb-8">
        <SectionHeader title="내 기록관" icon={<Archive size={24} />} />

        <div className="flex gap-4 border-b border-border pb-4 mb-6">
          {TABS.map((tab) => (
            <div
              key={tab.id}
              className={`font-semibold cursor-pointer py-2 px-4 rounded-lg transition-all duration-200 flex items-center gap-1.5
                ${activeTab === tab.id ? "text-text-primary bg-bg-secondary" : "text-text-secondary hover:text-text-primary hover:bg-white/5"}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {getIconForTab(tab.id)} {tab.label}
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-3">
            <button className="bg-bg-secondary border border-border text-text-secondary py-1.5 px-3 rounded-md text-[13px] cursor-pointer transition-all duration-200 hover:border-text-secondary hover:text-text-primary">
              상태: 전체 ▼
            </button>
            <button className="bg-bg-secondary border border-border text-text-secondary py-1.5 px-3 rounded-md text-[13px] cursor-pointer transition-all duration-200 hover:border-text-secondary hover:text-text-primary">
              정렬: 최근 추가순 ▼
            </button>
          </div>
          <div className="flex bg-bg-secondary rounded-md p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={`py-1.5 px-2.5 rounded cursor-pointer transition-all ${
                viewMode === "grid" ? "bg-bg-card text-text-primary" : "text-text-secondary hover:text-text-primary"
              }`}
              aria-label="그리드 뷰"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`py-1.5 px-2.5 rounded cursor-pointer transition-all ${
                viewMode === "list" ? "bg-bg-card text-text-primary" : "text-text-secondary hover:text-text-primary"
              }`}
              aria-label="리스트 뷰"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={loadContents}
            className="text-accent hover:underline"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-accent" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && contents.length === 0 && (
        <div className="text-center py-20">
          <Archive size={64} className="mx-auto mb-4 text-text-secondary opacity-50" />
          <p className="text-text-secondary mb-2">아직 기록한 콘텐츠가 없습니다</p>
          <p className="text-sm text-text-secondary">
            + 버튼을 눌러 첫 번째 콘텐츠를 추가해보세요!
          </p>
        </div>
      )}

      {/* Content Grid View */}
      {!isLoading && !error && contents.length > 0 && viewMode === "grid" && (
        <ContentGrid>
          {contents.map((item) => (
            <Link href={`/archive/${item.content_id}`} key={item.id}>
              <ContentCard item={item} onProgressChange={handleProgressChange} />
            </Link>
          ))}
        </ContentGrid>
      )}

      {/* Content List View */}
      {!isLoading && !error && contents.length > 0 && viewMode === "list" && (
        <div className="flex flex-col gap-3">
          {contents.map((item) => (
            <Link href={`/archive/${item.content_id}`} key={item.id}>
              <ContentListItem item={item} onProgressChange={handleProgressChange} />
            </Link>
          ))}
        </div>
      )}

      <button
        onClick={() => setIsAddModalOpen(true)}
        className="fixed bottom-10 right-10 w-16 h-16 rounded-full bg-accent flex items-center justify-center shadow-lg cursor-pointer transition-all duration-300 z-20 hover:scale-110 hover:rotate-90 hover:bg-accent-hover"
      >
        <Plus color="white" size={32} />
      </button>

      <AddContentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={loadContents}
      />
    </>
  );
}
