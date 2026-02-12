/*
  파일명: /components/ui/DeleteConfirmModal.tsx
  기능: 삭제 확인 모달
  책임: 콘텐츠 삭제 시 영향받는 플로우를 표시하고 확인을 받는다.
*/ // ------------------------------

"use client";

import { AlertTriangle, ListMusic, Loader2 } from "lucide-react";
import Modal, { ModalBody, ModalFooter } from "./Modal";
import Button from "./Button";

interface FlowInfo {
  id: string;
  name: string;
}

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  title?: string;
  message?: string;
  affectedPlaylists?: FlowInfo[];
  itemCount?: number;
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  title = "콘텐츠 삭제",
  message,
  affectedPlaylists = [],
  itemCount = 1,
}: DeleteConfirmModalProps) {
  const hasAffectedPlaylists = affectedPlaylists.length > 0;
  const defaultMessage = itemCount > 1
    ? `${itemCount}개 콘텐츠를 삭제하시겠습니까?`
    : "이 콘텐츠를 삭제하시겠습니까?";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} icon={AlertTriangle} size="sm">
      <ModalBody>
        <p className="text-text-secondary mb-4">{message || defaultMessage}</p>

        {hasAffectedPlaylists && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 text-yellow-500 font-medium mb-3">
              <ListMusic size={18} />
              <span>다음 재생목록에서도 삭제됩니다</span>
            </div>
            <ul className="space-y-1.5">
              {affectedPlaylists.map((playlist) => (
                <li
                  key={playlist.id}
                  className="text-sm text-text-secondary flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                  {playlist.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </ModalBody>

      <ModalFooter className="justify-end">
        <Button variant="ghost" onClick={onClose} disabled={isLoading}>
          취소
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={isLoading}>
          {isLoading && <Loader2 size={16} className="animate-spin" />}
          삭제
        </Button>
      </ModalFooter>
    </Modal>
  );
}
