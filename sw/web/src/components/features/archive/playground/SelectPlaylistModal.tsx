/*
  파일명: /components/features/playground/SelectPlaylistModal.tsx
  기능: 재생목록 선택 모달
  책임: 티어 설정할 재생목록 선택 UI 제공
*/ // ------------------------------
"use client";

import { X, ListMusic, Trophy, ChevronRight, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui";
import Button from "@/components/ui/Button";
import type { PlaylistSummary } from "@/actions/playlists";
import { Z_INDEX } from "@/constants/zIndex";

interface SelectPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (playlistId: string) => void;
  playlists: PlaylistSummary[];
}

export default function SelectPlaylistModal({
  isOpen,
  onClose,
  onSelect,
  playlists,
}: SelectPlaylistModalProps) {
  if (!isOpen) return null;

  // 티어 미설정 재생목록 우선 정렬
  const sortedPlaylists = [...playlists].sort((a, b) => {
    if (a.has_tiers === b.has_tiers) return 0;
    return a.has_tiers ? 1 : -1;
  });

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm" style={{ zIndex: Z_INDEX.modal }}>
      <div className="relative w-full max-w-lg max-h-[80vh] bg-bg-card rounded-2xl border border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-bg-secondary">
          <div>
            <h2 className="text-xl font-bold">재생목록 선택</h2>
            <p className="text-sm text-text-secondary mt-1">
              티어를 설정할 재생목록을 선택하세요
            </p>
          </div>
          <Button
            unstyled
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10"
          >
            <X size={20} />
          </Button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(80vh-120px)]">
          {playlists.length === 0 ? (
            <div className="text-center py-16 text-text-secondary">
              <ListMusic size={48} className="mx-auto mb-4 opacity-50" />
              <p className="mb-2">재생목록이 없습니다</p>
              <p className="text-sm">먼저 기록관에서 재생목록을 만들어주세요</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sortedPlaylists.map((playlist) => (
                <Button
                  unstyled
                  key={playlist.id}
                  onClick={() => onSelect(playlist.id)}
                  className="w-full px-6 py-4 flex items-center gap-4 hover:bg-bg-secondary text-left"
                >
                  {/* 아이콘 */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    playlist.has_tiers ? "bg-accent/20" : "bg-white/5"
                  }`}>
                    {playlist.has_tiers ? (
                      <Trophy size={24} className="text-accent" />
                    ) : (
                      <ListMusic size={24} className="text-text-secondary" />
                    )}
                  </div>

                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{playlist.name}</span>
                      {playlist.has_tiers && (
                        <Badge variant="primary" className="text-[10px]">설정됨</Badge>
                      )}
                    </div>
                    <div className="text-sm text-text-secondary mt-0.5">
                      {playlist.item_count}개 콘텐츠
                      {playlist.description && ` · ${playlist.description}`}
                    </div>
                  </div>

                  {/* 화살표 */}
                  <ChevronRight size={20} className="text-text-secondary" />
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-bg-secondary text-center text-sm text-text-secondary">
          선택하면 티어 설정 페이지로 이동합니다
        </div>
      </div>
    </div>
  );
}
