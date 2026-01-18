/*
  파일명: /components/features/playlist/PlaylistDropdown.tsx
  기능: 재생목록 드롭다운 메뉴
  책임: 재생목록 선택 및 새 재생목록 생성 진입점 제공
*/ // ------------------------------
"use client";

import { useState, useEffect, useRef } from "react";
import { ListMusic, Plus, ChevronRight } from "lucide-react";
import { getPlaylists, type PlaylistSummary } from "@/actions/playlists";
import Button from "@/components/ui/Button";
import { Z_INDEX } from "@/constants/zIndex";

interface PlaylistDropdownProps {
  onCreateNew: () => void;
  onSelectPlaylist: (playlistId: string) => void;
}

export default function PlaylistDropdown({
  onCreateNew,
  onSelectPlaylist,
}: PlaylistDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // 드롭다운 열릴 때 목록 로드
  useEffect(() => {
    if (isOpen) {
      loadPlaylists();
    }
  }, [isOpen]);

  const loadPlaylists = async () => {
    setIsLoading(true);
    try {
      const data = await getPlaylists();
      setPlaylists(data);
    } catch (error) {
      console.error("재생목록 로드 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleButtonClick = () => {
    setIsOpen(!isOpen);
  };

  const handleCreateNew = () => {
    setIsOpen(false);
    onCreateNew();
  };

  const handleSelectPlaylist = (playlistId: string) => {
    setIsOpen(false);
    onSelectPlaylist(playlistId);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 트리거 버튼 */}
      <Button
        unstyled
        onClick={handleButtonClick}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-secondary hover:bg-bg-card text-text-primary text-sm font-medium rounded-lg border border-border"
      >
        <ListMusic size={16} />
        <span className="hidden sm:inline">재생목록</span>
      </Button>

      {/* 드롭다운 메뉴 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-bg-card border border-border rounded-xl shadow-lg overflow-hidden" style={{ zIndex: Z_INDEX.dropdown }}>
          {/* 새 재생목록 만들기 */}
          <Button
            unstyled
            onClick={handleCreateNew}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-secondary text-left border-b border-border"
          >
            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
              <Plus size={18} className="text-accent" />
            </div>
            <span className="text-sm font-medium text-text-primary">
              새 재생목록 만들기
            </span>
          </Button>

          {/* 재생목록 목록 */}
          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-6 text-center text-text-secondary text-sm">
                로딩 중...
              </div>
            ) : playlists.length === 0 ? (
              <div className="px-4 py-6 text-center text-text-secondary text-sm">
                아직 재생목록이 없습니다
              </div>
            ) : (
              playlists.map((playlist) => (
                <Button
                  unstyled
                  key={playlist.id}
                  onClick={() => handleSelectPlaylist(playlist.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-secondary text-left group"
                >
                  <div className="w-8 h-8 rounded-lg bg-bg-secondary flex items-center justify-center">
                    <ListMusic size={16} className="text-text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {playlist.name}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {playlist.item_count}개
                    </p>
                  </div>
                  <ChevronRight
                    size={16}
                    className="text-text-secondary opacity-0 group-hover:opacity-100"
                  />
                </Button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
