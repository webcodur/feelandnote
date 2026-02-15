/*
  파일명: /components/features/user/modals/AddContentModal.tsx
  기능: 콘텐츠 추가 모달
  책임: 카테고리 선택, 제목/작가 입력, 상태 설정 후 콘텐츠를 추가한다.
*/ // ------------------------------
"use client";

import { useState, useTransition } from "react";
import { Loader2, Info, Search, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import Modal, { ModalBody, ModalFooter } from "@/components/ui/Modal";
import { Button } from "@/components/ui";
import { addContent } from "@/actions/contents/addContent";
import type { ContentType, ContentStatus } from "@/types/database";
import { CATEGORIES, type CategoryId } from "@/constants/categories";
import { STATUS_OPTIONS } from "@/constants/statuses";

interface AddContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddContentModal({ isOpen, onClose, onSuccess }: AddContentModalProps) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>("book");
  const [title, setTitle] = useState("");
  const [creator, setCreator] = useState("");
  const [status, setStatus] = useState<ContentStatus>("WANT");
  const [error, setError] = useState<string | null>(null);
  const [isAdding, startAddTransition] = useTransition();

  const handleGoToSearch = () => {
    handleClose();
    router.push("/");
  };

  const currentCategoryConfig = CATEGORIES.find(c => c.id === selectedCategory)!;

  const handleCategorySelect = (categoryId: CategoryId) => {
    setError(null);
    setSelectedCategory(categoryId);
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      setError("제목을 입력하세요.");
      return;
    }

    setError(null);

    startAddTransition(async () => {
      try {
        const response = await addContent({
          id: `manual_${Date.now()}`,
          type: currentCategoryConfig.dbType as ContentType,
          title: title.trim(),
          creator: creator.trim() || undefined,
          status,
        });
        if (!response.success) {
          setError(response.message);
          return;
        }
        onSuccess?.();
        handleClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "콘텐츠 추가 중 오류가 발생했습니다.");
      }
    });
  };

  const resetModal = () => {
    setSelectedCategory("book");
    setTitle("");
    setCreator("");
    setStatus("WANT");
    setError(null);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="커스텀 등록"
      icon={Plus}
      size="lg"
      closeOnOverlayClick
    >
      <ModalBody className="space-y-4">
        {/* 안내 문구 */}
        <div className="p-3 bg-accent/5 border border-accent/10 rounded-xl">
          <div className="flex gap-2.5">
            <Info size={16} className="text-accent shrink-0 mt-0.5" />
            <p className="text-xs text-text-secondary leading-relaxed">
              <Button
                unstyled
                type="button"
                onClick={handleGoToSearch}
                className="text-accent font-medium hover:underline inline-flex items-center gap-0.5"
              >
                <Search size={11} />
                검색
              </Button>
              에서 원하는 콘텐츠를 찾지 못했을 때 활용하세요.
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl text-red-500 text-xs font-medium">
            {error}
          </div>
        )}

        {/* 2열 레이아웃 폼 */}
        <div className="grid grid-cols-[80px_1fr] gap-x-4 gap-y-4 items-center">
          {/* 카테고리 */}
          <label className="text-sm font-semibold text-text-secondary">카테고리</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((category) => {
              const Icon = category.lucideIcon;
              const isSelected = selectedCategory === category.id;
              return (
                <Button
                  unstyled
                  key={category.id}
                  type="button"
                  onClick={() => handleCategorySelect(category.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                    isSelected
                      ? "bg-accent text-white border-accent"
                      : "bg-surface border-border/50 text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                  }`}
                >
                  <Icon size={14} strokeWidth={2.5} />
                  {category.label}
                </Button>
              );
            })}
          </div>

          {/* 제목 */}
          <label className="text-sm font-semibold text-text-secondary">
            제목 <span className="text-accent">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="콘텐츠 제목을 입력하세요"
            className="w-full px-3 py-2 bg-surface/50 border border-border/60 rounded-lg text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent focus:bg-surface focus:ring-1 focus:ring-accent/20"
          />

          {/* 저자/감독/개발사 */}
          <label className="text-sm font-semibold text-text-secondary">
            {currentCategoryConfig.creatorLabel}
          </label>
          <input
            type="text"
            value={creator}
            onChange={(e) => setCreator(e.target.value)}
            placeholder={`${currentCategoryConfig.creatorLabel} (선택)`}
            className="w-full px-3 py-2 bg-surface/50 border border-border/60 rounded-lg text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent focus:bg-surface focus:ring-1 focus:ring-accent/20"
          />

          {/* 상태 */}
          <label className="text-sm font-semibold text-text-secondary">상태</label>
          <div className="flex gap-2">
            {STATUS_OPTIONS.map((option) => (
              <Button
                unstyled
                key={option.value}
                type="button"
                onClick={() => setStatus(option.value)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold text-center border ${
                  status === option.value
                    ? "bg-accent text-white border-accent"
                    : "bg-surface border-border/50 text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                }`}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={handleClose} className="flex-1">
          취소
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={isAdding || !title.trim()}
          className="flex-1"
        >
          {isAdding ? <Loader2 size={18} className="animate-spin" /> : "추가"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
