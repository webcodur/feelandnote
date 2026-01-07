/*
  파일명: /components/features/archive/modals/AddContentModal.tsx
  기능: 콘텐츠 추가 모달
  책임: 카테고리 선택, 제목/작가 입력, 진행도/상태 설정 후 콘텐츠를 추가한다.
*/ // ------------------------------
"use client";

import { useState, useTransition } from "react";
import { Book, Film, Gamepad2, Music, Award, Loader2, Info, Search, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import Modal, { ModalBody, ModalFooter } from "@/components/ui/Modal";
import { Button, ProgressSlider } from "@/components/ui";
import { addContent } from "@/actions/contents/addContent";
import type { ContentType, ContentStatus } from "@/actions/contents/addContent";
import type { CategoryId } from "@/constants/categories";
import { useAchievement } from "@/components/features/achievements";

interface AddContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CATEGORIES = [
  { id: "book" as CategoryId, dbType: "BOOK", label: "도서", icon: Book, creatorLabel: "저자" },
  { id: "video" as CategoryId, dbType: "VIDEO", label: "영상", icon: Film, creatorLabel: "감독" },
  { id: "game" as CategoryId, dbType: "GAME", label: "게임", icon: Gamepad2, creatorLabel: "개발사" },
  { id: "music" as CategoryId, dbType: "MUSIC", label: "음악", icon: Music, creatorLabel: "아티스트" },
  { id: "certificate" as CategoryId, dbType: "CERTIFICATE", label: "자격증", icon: Award, creatorLabel: "발급기관" },
];

// 진행도별 상태 옵션
const STATUS_BY_PROGRESS = {
  zero: [{ value: "WANT" as ContentStatus, label: "보고싶음" }],
  partial: [
    { value: "WATCHING" as ContentStatus, label: "진행중" },
    { value: "DROPPED" as ContentStatus, label: "중단" },
  ],
  complete: [
    { value: "FINISHED" as ContentStatus, label: "완료" },
    { value: "RECOMMENDED" as ContentStatus, label: "추천" },
    { value: "NOT_RECOMMENDED" as ContentStatus, label: "비추천" },
  ],
};

export default function AddContentModal({ isOpen, onClose, onSuccess }: AddContentModalProps) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>("book");
  const [title, setTitle] = useState("");
  const [creator, setCreator] = useState("");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<ContentStatus>("WANT");
  const [error, setError] = useState<string | null>(null);
  const [isAdding, startAddTransition] = useTransition();
  const { showUnlock } = useAchievement();

  // 진행도에 따른 상태 옵션 결정
  const getStatusOptions = () => {
    if (progress === 0) return STATUS_BY_PROGRESS.zero;
    if (progress === 100) return STATUS_BY_PROGRESS.complete;
    return STATUS_BY_PROGRESS.partial;
  };

  // 진행도 변경 시 상태 자동 조정
  const handleProgressChange = (newProgress: number) => {
    setProgress(newProgress);
    if (newProgress === 0 && status !== "WANT") {
      setStatus("WANT");
    } else if (newProgress === 100 && !["FINISHED", "RECOMMENDED", "NOT_RECOMMENDED"].includes(status)) {
      setStatus("FINISHED");
    } else if (newProgress > 0 && newProgress < 100 && !["WATCHING", "DROPPED"].includes(status)) {
      setStatus("WATCHING");
    }
  };

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
          progress,
        });
        onSuccess?.();
        handleClose();

        if (response.unlockedTitles && response.unlockedTitles.length > 0) {
          showUnlock(response.unlockedTitles);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "콘텐츠 추가 중 오류가 발생했습니다.");
      }
    });
  };

  const resetModal = () => {
    setSelectedCategory("book");
    setTitle("");
    setCreator("");
    setProgress(0);
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
              const Icon = category.icon;
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

          {/* 진행도 (자격증 제외) */}
          {selectedCategory !== "certificate" && (
            <>
              <label className="text-sm font-semibold text-text-secondary">진행도</label>
              <div className="flex items-center gap-3">
                <ProgressSlider value={progress} onChange={handleProgressChange} className="flex-1" />
                <span className="text-sm text-accent font-bold w-10 text-right tabular-nums">{progress}%</span>
              </div>
            </>
          )}

          {/* 상태 (진행도에 따라 옵션 변경) */}
          <label className="text-sm font-semibold text-text-secondary">상태</label>
          <div className="flex gap-2">
            {getStatusOptions().map((option) => (
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
