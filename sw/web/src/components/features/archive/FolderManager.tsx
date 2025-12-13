"use client";

import { useState, useCallback } from "react";
import { FolderPlus, Trash2, X, Loader2 } from "lucide-react";
import { createFolder } from "@/actions/folders/createFolder";
import { deleteFolder } from "@/actions/folders/deleteFolder";
import type { ContentType, FolderWithCount } from "@/types/database";

interface FolderManagerProps {
  contentType: ContentType;
  folders: FolderWithCount[];
  onFoldersChange: () => void;
  onClose: () => void;
}

export default function FolderManager({
  contentType,
  folders,
  onFoldersChange,
  onClose,
}: FolderManagerProps) {
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = useCallback(async () => {
    if (!newFolderName.trim()) return;

    setIsCreating(true);
    setError(null);

    try {
      await createFolder({
        name: newFolderName.trim(),
        contentType,
      });
      setNewFolderName("");
      onFoldersChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "폴더 생성에 실패했습니다");
    } finally {
      setIsCreating(false);
    }
  }, [newFolderName, contentType, onFoldersChange]);

  const handleDelete = useCallback(async (folderId: string) => {
    if (!confirm("이 폴더를 삭제하시겠습니까? 폴더 내 콘텐츠는 미분류로 이동됩니다.")) {
      return;
    }

    setDeletingId(folderId);
    setError(null);

    try {
      await deleteFolder(folderId);
      onFoldersChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "폴더 삭제에 실패했습니다");
    } finally {
      setDeletingId(null);
    }
  }, [onFoldersChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isCreating) {
      handleCreate();
    }
  }, [handleCreate, isCreating]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-bg-card rounded-xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-medium text-sm">폴더 관리</h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-bg-secondary transition-colors"
          >
            <X size={18} className="text-text-secondary" />
          </button>
        </div>

        {/* 새 폴더 추가 */}
        <div className="p-4 border-b border-border">
          <div className="flex gap-2">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="새 폴더 이름"
              className="flex-1 px-3 py-2 text-sm bg-bg-secondary rounded-lg border border-border focus:border-accent focus:outline-none"
              maxLength={50}
            />
            <button
              onClick={handleCreate}
              disabled={!newFolderName.trim() || isCreating}
              className="px-3 py-2 bg-accent hover:bg-accent-hover text-white text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
            >
              {isCreating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <FolderPlus size={16} />
              )}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-xs text-red-400">{error}</p>
          )}
        </div>

        {/* 폴더 목록 */}
        <div className="max-h-64 overflow-y-auto">
          {folders.length === 0 ? (
            <div className="py-8 text-center text-text-secondary text-sm">
              아직 폴더가 없습니다
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {folders.map((folder) => (
                <li
                  key={folder.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium truncate">{folder.name}</span>
                    <span className="text-xs text-text-secondary">
                      ({folder.content_count})
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(folder.id)}
                    disabled={deletingId === folder.id}
                    className="p-1.5 rounded hover:bg-red-500/10 text-text-secondary hover:text-red-400 transition-colors disabled:opacity-50"
                  >
                    {deletingId === folder.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 하단 안내 */}
        <div className="px-4 py-3 bg-bg-secondary/50 text-xs text-text-secondary">
          폴더를 삭제하면 해당 콘텐츠는 미분류로 이동됩니다.
        </div>
      </div>
    </div>
  );
}
