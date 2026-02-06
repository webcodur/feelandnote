/*
  파일명: /components/features/playlist/PlaylistEditor.tsx
  기능: 재생목록 에디터 컴포넌트
  책임: 재생목록 이름, 공개 설정, 콘텐츠 구성 편집
*/ // ------------------------------
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  X,
  Check,
  Search,
  Lock,
  Globe,
  ListMusic,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { ContentGrid, FilterChips, type ChipOption } from "@/components/ui";
import { getPlaylist } from "@/actions/playlists/getPlaylist";
import { createPlaylist } from "@/actions/playlists/createPlaylist";
import { updatePlaylist } from "@/actions/playlists/updatePlaylist";
import { updatePlaylistItems } from "@/actions/playlists/updatePlaylistItems";
import { getMyContents, type UserContentWithContent } from "@/actions/contents/getMyContents";
import { ContentCard } from "@/components/ui/cards";
import type { ContentType } from "@/types/database";
import { CATEGORIES } from "@/constants/categories";
import { createClient } from "@/lib/supabase/client";

// #region 상수
const TAB_OPTIONS: (ChipOption & { type?: ContentType })[] = [
  { value: "all", label: "전체" },
  ...CATEGORIES.map((cat) => ({
    value: cat.id,
    label: cat.label,
    icon: cat.icon,
    type: cat.dbType as ContentType,
  })),
];
// #endregion

interface PlaylistEditorProps {
  mode: "create" | "edit";
  playlistId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function PlaylistEditor({
  mode,
  playlistId,
  onClose,
  onSuccess,
}: PlaylistEditorProps) {
  const router = useRouter();

  // 상태
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [allContents, setAllContents] = useState<UserContentWithContent[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [originalState, setOriginalState] = useState<{ name: string; isPublic: boolean; ids: Set<string> } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // 현재 사용자 ID 가져오기
  useEffect(() => {
    const fetchUserId = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    fetchUserId();
  }, []);

  // 선택된 첫 번째 콘텐츠의 썸네일
  const coverThumbnail = useMemo(() => {
    const firstSelectedId = Array.from(selectedIds)[0];
    if (!firstSelectedId) return null;
    const content = allContents.find((c) => c.content_id === firstSelectedId);
    return content?.content.thumbnail_url || null;
  }, [selectedIds, allContents]);

  // #region 데이터 로드
  const loadContents = useCallback(async () => {
    setIsLoading(true);
    try {
      const tab = TAB_OPTIONS.find((t) => t.value === activeTab);
      const result = await getMyContents({ type: tab?.type });
      setAllContents(result.items);
    } catch (error) {
      console.error("콘텐츠 로드 실패:", error);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  const loadPlaylist = useCallback(async () => {
    if (mode !== "edit" || !playlistId) return;

    try {
      const playlist = await getPlaylist(playlistId);
      setName(playlist.name);
      setIsPublic(playlist.is_public);
      const ids = new Set(playlist.items.map((item) => item.content_id));
      setSelectedIds(ids);
      setOriginalState({ name: playlist.name, isPublic: playlist.is_public, ids });
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
  // #endregion

  // #region 핸들러
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

  const handleClose = () => {
    const hasChanges = mode === "create"
      ? name.trim() || selectedIds.size > 0
      : originalState && (
          name !== originalState.name ||
          isPublic !== originalState.isPublic ||
          !setsEqual(selectedIds, originalState.ids)
        );

    if (hasChanges) {
      if (!confirm("변경사항이 저장되지 않습니다. 취소하시겠습니까?")) return;
    }
    onClose();
  };

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
          isPublic,
        });
        if (!result.success) {
          alert(result.message);
          return;
        }
        onSuccess?.();
        if (currentUserId) {
          router.push(`/${currentUserId}/collections/${result.data.playlistId}`);
        }
      } else if (playlistId) {
        // 이름/공개 상태 변경
        if (originalState && (name !== originalState.name || isPublic !== originalState.isPublic)) {
          await updatePlaylist({ playlistId, name: name.trim(), isPublic });
        }
        // 아이템 변경
        if (originalState && !setsEqual(selectedIds, originalState.ids)) {
          await updatePlaylistItems({ playlistId, contentIds });
        }
        onSuccess?.();
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "저장에 실패했습니다");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredContents = useMemo(() => {
    if (!searchQuery.trim()) return allContents;
    const query = searchQuery.toLowerCase();
    return allContents.filter(
      (item) =>
        item.content.title.toLowerCase().includes(query) ||
        item.content.creator?.toLowerCase().includes(query)
    );
  }, [allContents, searchQuery]);
  // #endregion

  return (
    <div>
      {/* 헤더 영역 */}
      <div className="flex items-start gap-4 mb-6">
        <Button unstyled onClick={handleClose} className="p-2 -ml-2 text-text-secondary hover:text-text-primary">
          <X size={24} />
        </Button>

        <div className="flex-1 flex gap-4">
          {/* 커버 이미지 */}
          <div className="relative w-24 h-24 rounded-xl bg-bg-card flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-dashed border-border">
            {coverThumbnail ? (
              <Image src={coverThumbnail} alt="커버" fill unoptimized className="object-cover" />
            ) : (
              <ListMusic size={32} className="text-text-tertiary" />
            )}
          </div>

          {/* 정보 영역 */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="재생목록 이름 입력..."
              className="text-xl font-bold bg-transparent border-b-2 border-accent focus:outline-none text-text-primary placeholder:text-text-tertiary w-full"
              autoFocus
            />
            <p className="text-sm text-text-secondary mt-1">
              {selectedIds.size}개 선택됨
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Button
                unstyled
                type="button"
                onClick={() => setIsPublic(!isPublic)}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md border ${
                  isPublic
                    ? "border-green-500/50 bg-green-500/10 text-green-400"
                    : "border-border bg-bg-secondary text-text-secondary"
                }`}
              >
                {isPublic ? <Globe size={12} /> : <Lock size={12} />}
                {isPublic ? "공개" : "비공개"}
              </Button>
            </div>
          </div>
        </div>

        {/* 저장 버튼 */}
        <Button
          onClick={handleSave}
          disabled={isSaving || selectedIds.size === 0 || !name.trim()}
          size="sm"
          className="flex items-center gap-1.5"
        >
          <Check size={16} />
          {mode === "create" ? "만들기" : "저장"}
        </Button>
      </div>

      {/* 검색 & 필터 */}
      <div className="space-y-3 mb-6">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="내 콘텐츠 검색..."
            className="w-full pl-10 pr-4 py-2 bg-bg-card border border-border rounded-lg text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <div className="overflow-x-auto -mx-1 px-1">
          <FilterChips options={TAB_OPTIONS} value={activeTab} onChange={setActiveTab} variant="filled" showIcon />
        </div>
      </div>

      {/* 콘텐츠 그리드 */}
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
            <ContentCard
              key={item.id}
              contentId={item.content_id}
              thumbnail={item.content.thumbnail_url}
              title={item.content.title}
              creator={item.content.creator}
              contentType={item.content.type}
              selectable
              isSelected={selectedIds.has(item.content_id)}
              onSelect={() => handleToggleSelect(item.content_id)}
              aspectRatio="3/4"
            />
          ))}
        </ContentGrid>
      )}
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
