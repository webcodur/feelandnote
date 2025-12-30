"use client";

import { useState, useTransition } from "react";
import { X, Book, Film, Gamepad2, Music, Award, Loader2, Info, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button, ProgressSlider } from "@/components/ui";
import { addContent } from "@/actions/contents/addContent";
import type { ContentType, ContentStatus } from "@/actions/contents/addContent";
import type { CategoryId } from "@/constants/categories";
import { useAchievement } from "@/components/features/achievements";
import { Z_INDEX } from "@/constants/zIndex";

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

const STATUS_OPTIONS: { value: ContentStatus; label: string }[] = [
  { value: "EXPERIENCE", label: "경험 중" },
  { value: "COMPLETE", label: "완료" },
  { value: "WISH", label: "관심 목록" },
];

export default function AddContentModal({ isOpen, onClose, onSuccess }: AddContentModalProps) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>("book");
  const [title, setTitle] = useState("");
  const [creator, setCreator] = useState("");
  const [status, setStatus] = useState<ContentStatus>("EXPERIENCE");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, startAddTransition] = useTransition();
  const { showUnlock } = useAchievement();

  const handleGoToSearch = () => {
    onClose();
    router.push("/");
  };

  if (!isOpen) return null;

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
    const finalProgress = status === "EXPERIENCE" ? progress : status === "COMPLETE" ? 100 : 0;

    startAddTransition(async () => {
      try {
        const response = await addContent({
          id: `manual_${Date.now()}`,
          type: currentCategoryConfig.dbType as ContentType,
          title: title.trim(),
          creator: creator.trim() || undefined,
          status,
          progress: finalProgress,
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
    setStatus("EXPERIENCE");
    setProgress(0);
    setError(null);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" style={{ zIndex: Z_INDEX.modal }}>
      <div className="relative w-full max-w-lg bg-bg-card rounded-xl md:rounded-2xl border border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 md:px-6 md:py-5 border-b border-border bg-bg-secondary">
          <h2 className="text-xl font-bold">직접 등록</h2>
          <Button
            unstyled
            onClick={handleClose}
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10"
          >
            <X size={20} />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 space-y-5">
          {/* 안내 문구 */}
          <div className="p-3 bg-accent/10 border border-accent/20 rounded-lg">
            <div className="flex gap-2">
              <Info size={16} className="text-accent shrink-0 mt-0.5" />
              <div className="text-sm text-text-secondary">
                <p className="mb-1">
                  직접 등록한 콘텐츠는 <span className="text-text-primary font-medium">나만 볼 수 있는 개인 기록</span>입니다.
                </p>
                <p>
                  다른 사용자와 공유하려면{" "}
                  <Button
                    unstyled
                    type="button"
                    onClick={handleGoToSearch}
                    className="text-accent font-medium hover:underline inline-flex items-center gap-1"
                  >
                    <Search size={12} />
                    검색으로 추가
                  </Button>
                  를 이용해 주세요.
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* 카테고리 선택 */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">카테고리</label>
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
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                      isSelected
                        ? "bg-accent text-white"
                        : "bg-bg-main text-text-secondary hover:bg-bg-secondary"
                    }`}
                  >
                    <Icon size={16} />
                    {category.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* 제목 */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              제목 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="콘텐츠 제목을 입력하세요"
              className="w-full px-4 py-3 bg-bg-main border border-border rounded-lg text-text-primary placeholder:text-text-secondary outline-none focus:border-accent"
            />
          </div>

          {/* 저자/감독/개발사 */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              {currentCategoryConfig.creatorLabel}
            </label>
            <input
              type="text"
              value={creator}
              onChange={(e) => setCreator(e.target.value)}
              placeholder={`${currentCategoryConfig.creatorLabel}를 입력하세요 (선택)`}
              className="w-full px-4 py-3 bg-bg-main border border-border rounded-lg text-text-primary placeholder:text-text-secondary outline-none focus:border-accent"
            />
          </div>

          {/* 상태 선택 */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">상태</label>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map((option) => (
                <Button
                  unstyled
                  key={option.value}
                  type="button"
                  onClick={() => setStatus(option.value)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium text-center ${
                    status === option.value
                      ? "bg-accent text-white"
                      : "bg-bg-main text-text-secondary hover:bg-bg-secondary"
                  }`}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* 진행도 (경험 중일 때만, 자격증 제외) */}
          {status === "EXPERIENCE" && selectedCategory !== "certificate" && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                진행도
              </label>
              <div className="flex items-center gap-3">
                <ProgressSlider value={progress} onChange={setProgress} className="flex-1" />
                <span className="text-sm text-accent font-medium w-10 text-right">{progress}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-4 md:px-6 border-t border-border bg-bg-secondary flex gap-3">
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
        </div>
      </div>
    </div>
  );
}
