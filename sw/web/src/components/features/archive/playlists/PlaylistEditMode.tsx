/*
  파일명: /components/features/playlist/PlaylistEditMode.tsx
  기능: 재생목록 편집 모드 컴포넌트
  책임: 재생목록 생성/수정 시 콘텐츠 선택 및 저장 처리
*/ // ------------------------------
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { X, Check, Search } from "lucide-react";
import { getMyContents, type UserContentWithContent } from "@/actions/contents/getMyContents";
import { getPlaylist } from "@/actions/playlists";
import { createPlaylist } from "@/actions/playlists/createPlaylist";
import { updatePlaylistItems } from "@/actions/playlists/updatePlaylistItems";
import { CATEGORIES } from "@/constants/categories";
import type { ContentType } from "@/types/database";
import { ContentGrid, FilterChips, type ChipOption } from "@/components/ui";
import SelectableContentCard from "./SelectableContentCard";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

interface PlaylistEditModeProps {
  mode: "create" | "edit";
  playlistId?: string;  // edit 모드일 때 필수
  onClose: () => void;
  onSuccess?: (playlistId: string) => void;
}

// 탭 목록
const TAB_OPTIONS: (ChipOption & { type?: ContentType })[] = [
  { value: "all", label: "전체" },
  ...CATEGORIES.map((cat) => ({
    value: cat.id,
    label: cat.label,
    icon: cat.icon,
    type: cat.dbType as ContentType,
  })),
];

export default function PlaylistEditMode({
  mode,
  playlistId,
  onClose,
  onSuccess,
}: PlaylistEditModeProps) {
  const router = useRouter();

  // 상태
  const [name, setName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [contents, setContents] = useState<UserContentWithContent[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [originalIds, setOriginalIds] = useState<Set<string>>(new Set());  // 수정 모드: 원래 포함된 ID
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 콘텐츠 로드
  const loadContents = useCallback(async () => {
    setIsLoading(true);
    try {
      const tab = TAB_OPTIONS.find((t) => t.value === activeTab);
      const result = await getMyContents({ type: tab?.type });
      setContents(result.items);
    } catch (error) {
      console.error("콘텐츠 로드 실패:", error);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  // 수정 모드: 기존 재생목록 정보 로드
  const loadPlaylist = useCallback(async () => {
    if (mode !== "edit" || !playlistId) return;

    try {
      const playlist = await getPlaylist(playlistId);
      setName(playlist.name);
      const ids = new Set(playlist.items.map((item) => item.content_id));
      setSelectedIds(ids);
      setOriginalIds(ids);
    } catch (error) {
      console.error("재생목록 로드 실패:", error);
    }
  }, [mode, playlistId]);

  useEffect(() => {
    loadContents();
  }, [loadContents]);

  useEffect(() => {
    loadPlaylist();
  }, [loadPlaylist]);

  // 검색 필터링
  const filteredContents = useMemo(() => {
    if (!searchQuery.trim()) return contents;

    const query = searchQuery.toLowerCase();
    return contents.filter(
      (item) =>
        item.content.title.toLowerCase().includes(query) ||
        item.content.creator?.toLowerCase().includes(query)
    );
  }, [contents, searchQuery]);

  // 선택 토글
  const handleToggleSelect = (contentId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(contentId)) {
        next.delete(contentId);
      } else {
        next.add(contentId);
      }
      return next;
    });
  };

  // 저장
  const handleSave = async () => {
    if (!name.trim()) {
      alert("재생목록 이름을 입력해주세요");
      return;
    }
    if (selectedIds.size === 0) {
      alert("최소 1개 이상의 콘텐츠를 선택해주세요");
      return;
    }

    setIsSaving(true);
    try {
      const contentIds = Array.from(selectedIds);

      if (mode === "create") {
        const result = await createPlaylist({
          name: name.trim(),
          contentIds,
        });
        onSuccess?.(result.playlistId);
        router.push(`/archive/playlists/${result.playlistId}`);
      } else if (playlistId) {
        await updatePlaylistItems({
          playlistId,
          contentIds,
        });
        onSuccess?.(playlistId);
        onClose();
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "저장에 실패했습니다");
    } finally {
      setIsSaving(false);
    }
  };

  // 취소 확인
  const handleClose = () => {
    const hasChanges =
      mode === "create"
        ? selectedIds.size > 0 || name.trim()
        : !setsEqual(selectedIds, originalIds);

    if (hasChanges) {
      if (confirm("변경사항이 저장되지 않습니다. 취소하시겠습니까?")) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      {/* 상단 바 */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <Button
          unstyled
          onClick={handleClose}
          className="p-2 -ml-2 text-text-secondary hover:text-text-primary"
        >
          <X size={20} />
        </Button>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="재생목록 이름 입력..."
          className="flex-1 px-3 py-2 bg-bg-card border border-border rounded-lg text-base font-semibold text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
          autoFocus={mode === "create"}
        />

        <Button
          onClick={handleSave}
          disabled={isSaving || selectedIds.size === 0 || !name.trim()}
          size="sm"
          className="flex items-center gap-1.5"
        >
          <Check size={16} />
          <span className="hidden sm:inline">{mode === "create" ? "만들기" : "저장"}</span>
        </Button>
      </div>

      {/* 선택 상태 표시 */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-text-secondary">
          {selectedIds.size}개 선택됨
        </span>
      </div>

      {/* 검색 & 필터 */}
      <div className="space-y-3 mb-4">
        {/* 검색 */}
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="내 콘텐츠 검색..."
            className="w-full pl-10 pr-4 py-2 bg-bg-card border border-border rounded-lg text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        {/* 카테고리 탭 */}
        <div className="overflow-x-auto -mx-1 px-1">
          <FilterChips
            options={TAB_OPTIONS}
            value={activeTab}
            onChange={setActiveTab}
            variant="filled"
            showIcon
          />
        </div>
      </div>

      {/* 콘텐츠 그리드 */}
      <div className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredContents.length === 0 ? (
          <div className="text-center py-20 text-text-secondary">
            {searchQuery ? "검색 결과가 없습니다" : "콘텐츠가 없습니다"}
          </div>
        ) : (
          <ContentGrid minWidth={140}>
            {filteredContents.map((item) => (
              <SelectableContentCard
                key={item.id}
                item={item}
                isSelected={selectedIds.has(item.content_id)}
                isOriginal={originalIds.has(item.content_id)}
                onToggle={() => handleToggleSelect(item.content_id)}
              />
            ))}
          </ContentGrid>
        )}
      </div>
    </div>
  );
}

// 유틸: Set 비교
function setsEqual<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}
