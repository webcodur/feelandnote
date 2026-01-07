/*
  파일명: /components/features/explore/modals/AddCelebModal.tsx
  기능: 셀럽 프로필 추가 모달
  책임: 새로운 셀럽 프로필 생성 폼 제공
*/ // ------------------------------
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { Modal, ModalBody, ModalFooter } from "@/components/ui";
import { createCelebProfile } from "@/actions/celebs";

const CATEGORIES = ["연예인", "작가", "유튜버", "운동선수", "음악가", "감독", "기타"];

interface AddCelebModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddCelebModal({ isOpen, onClose }: AddCelebModalProps) {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [category, setCategory] = useState("");
  const [bio, setBio] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setError("이름을 입력해주세요");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await createCelebProfile({ nickname: nickname.trim(), category: category || undefined, bio: bio || undefined });
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "셀럽 추가에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="셀럽 추가" size="md">
      <form onSubmit={handleSubmit}>
        <ModalBody className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">이름 *</label>
            <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="셀럽 이름" className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent" />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">분야</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent">
              <option value="">선택 안함</option>
              {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">소개</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="셀럽에 대한 간단한 소개" rows={3} className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent resize-none" />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </ModalBody>

        <ModalFooter>
          <Button unstyled type="button" onClick={onClose} className="flex-1 px-4 py-2.5 bg-surface text-text-secondary rounded-lg hover:bg-surface-hover font-medium">취소</Button>
          <Button unstyled type="submit" disabled={isLoading} className="flex-1 px-4 py-2.5 bg-accent text-white rounded-lg hover:bg-accent/90 font-medium disabled:opacity-50">{isLoading ? "추가 중..." : "추가"}</Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
