"use client";

import { useState, useTransition } from "react";
import { X, Book, Film, Tv, Gamepad2, Music, Drama, Search, Plus, Loader2 } from "lucide-react";
import { Button, Card, ProgressSlider } from "@/components/ui";
import { searchBooks } from "@/actions/contents/searchBooks";
import { addContent } from "@/actions/contents/addContent";
import type { ContentType, ContentStatus } from "@/actions/contents/addContent";
import type { BookSearchResult } from "@/lib/api/naver-books";
import { useAchievement } from "@/components/features/achievements";
import { Z_INDEX } from "@/constants/zIndex";

interface AddContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CATEGORIES = [
  { id: "BOOK", label: "도서", icon: Book, color: "from-blue-500 to-cyan-500", enabled: true },
  { id: "MOVIE", label: "영화", icon: Film, color: "from-purple-500 to-pink-500", enabled: false },
];

export default function AddContentModal({ isOpen, onClose, onSuccess }: AddContentModalProps) {
  const [step, setStep] = useState<"category" | "search" | "manual">("category");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BookSearchResult[]>([]);
  const [progressValues, setProgressValues] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSearching, startSearchTransition] = useTransition();
  const [isAdding, startAddTransition] = useTransition();
  const { showUnlock } = useAchievement();

  if (!isOpen) return null;

  const handleCategorySelect = (categoryId: string) => {
    const category = CATEGORIES.find(c => c.id === categoryId);
    if (!category?.enabled) {
      setError("이 카테고리는 아직 지원되지 않습니다. 곧 추가될 예정입니다!");
      return;
    }
    setError(null);
    setSelectedCategory(categoryId);
    setStep("search");
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    setError(null);

    startSearchTransition(async () => {
      try {
        const result = await searchBooks({ query: searchQuery });
        setSearchResults(result.items);
        if (result.items.length === 0) {
          setError("검색 결과가 없습니다. 다른 키워드로 검색해보세요.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "검색 중 오류가 발생했습니다.");
        setSearchResults([]);
      }
    });
  };

  const handleManualAdd = () => {
    setStep("manual");
  };

  const handleProgressChange = (externalId: string, value: number) => {
    setProgressValues(prev => ({ ...prev, [externalId]: value }));
  };

  const handleAddContent = (result: BookSearchResult, status: ContentStatus) => {
    setError(null);
    const progress = status === 'EXPERIENCE' ? (progressValues[result.externalId] ?? 0) : 0;

    startAddTransition(async () => {
      try {
        const response = await addContent({
          id: result.externalId,
          type: selectedCategory as ContentType,
          title: result.title,
          creator: result.creator,
          thumbnailUrl: result.coverImageUrl || undefined,
          publisher: result.metadata.publisher,
          releaseDate: result.metadata.publishDate,
          metadata: result.metadata,
          status,
          progress,
        });
        onSuccess?.();
        handleClose();

        // 칭호 해금 알림 표시
        if (response.unlockedTitles && response.unlockedTitles.length > 0) {
          showUnlock(response.unlockedTitles);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "콘텐츠 추가 중 오류가 발생했습니다.");
      }
    });
  };

  const resetModal = () => {
    setStep("category");
    setSelectedCategory(null);
    setSearchQuery("");
    setSearchResults([]);
    setProgressValues({});
    setError(null);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" style={{ zIndex: Z_INDEX.modal }}>
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-bg-card rounded-xl md:rounded-2xl border border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 md:px-8 md:py-6 border-b border-border bg-bg-secondary">
          <div>
            <h2 className="text-2xl font-bold">콘텐츠 추가</h2>
            {selectedCategory && (
              <p className="text-sm text-text-secondary mt-1">
                {CATEGORIES.find((c) => c.id === selectedCategory)?.label} 검색
              </p>
            )}
          </div>
          <Button
            unstyled
            onClick={handleClose}
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10"
          >
            <X size={20} />
          </Button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)] p-4 md:p-8">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Category Selection */}
          {step === "category" && (
            <div>
              <h3 className="text-lg font-semibold mb-6">카테고리를 선택하세요</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {CATEGORIES.map((category) => {
                  const Icon = category.icon;
                  return (
                    <Button
                      unstyled
                      key={category.id}
                      onClick={() => handleCategorySelect(category.id)}
                      disabled={!category.enabled}
                      className={`p-6 rounded-2xl bg-bg-main border-2 border-border group ${
                        category.enabled
                          ? "hover:border-accent hover:bg-bg-secondary"
                          : ""
                      }`}
                    >
                      <div
                        className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${category.color} flex items-center justify-center transition-transform duration-200 ${category.enabled ? "group-hover:scale-110" : ""}`}
                      >
                        <Icon size={32} color="white" />
                      </div>
                      <div className="text-base font-semibold">{category.label}</div>
                      {!category.enabled && (
                        <div className="text-xs text-text-secondary mt-1">준비 중</div>
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Search */}
          {step === "search" && (
            <div>
              <div className="mb-6">
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="제목, 저자, ISBN 등을 입력하세요"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      disabled={isSearching}
                      className="w-full px-5 py-4 bg-bg-main border border-border rounded-xl text-text-primary placeholder:text-text-secondary outline-none transition-colors duration-200 focus:border-accent disabled:opacity-50"
                    />
                    {isSearching ? (
                      <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-accent animate-spin" size={20} />
                    ) : (
                      <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary" size={20} />
                    )}
                  </div>
                  <Button variant="primary" onClick={handleSearch} disabled={isSearching} className="px-8">
                    {isSearching ? "검색 중..." : "검색"}
                  </Button>
                </div>
                <Button
                  unstyled
                  onClick={handleManualAdd}
                  className="mt-3 text-sm text-accent flex items-center gap-1 hover:underline"
                >
                  <Plus size={14} /> 검색 결과에 없나요? 직접 추가하기
                </Button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div>
                  <h3 className="text-base font-semibold mb-4">검색 결과 ({searchResults.length})</h3>
                  <div className="flex flex-col gap-3">
                    {searchResults.map((result) => {
                      const currentProgress = progressValues[result.externalId] ?? 0;
                      return (
                        <Card key={result.externalId} className="p-0 hover:border-accent">
                          <div className="flex items-center gap-4 p-4">
                            {result.coverImageUrl ? (
                              <img
                                src={result.coverImageUrl}
                                alt={result.title}
                                className="w-16 h-24 rounded-lg shrink-0 object-cover"
                              />
                            ) : (
                              <div className="w-16 h-24 rounded-lg shrink-0 bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
                                <Book size={24} className="text-gray-400" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-base mb-1 truncate">{result.title}</h4>
                              <p className="text-sm text-text-secondary mb-1 truncate">
                                {result.creator} · {result.metadata.publisher} · {result.metadata.publishDate?.slice(0, 4)}
                              </p>
                              {/* 진행도 슬라이더 */}
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-text-secondary whitespace-nowrap">진행도</span>
                                <ProgressSlider
                                  value={currentProgress}
                                  onChange={(v) => handleProgressChange(result.externalId, v)}
                                  className="flex-1"
                                />
                                <span className="text-xs text-accent font-medium w-8 text-right">{currentProgress}%</span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 shrink-0">
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleAddContent(result, currentProgress === 100 ? "COMPLETE" : "EXPERIENCE")}
                                disabled={isAdding}
                              >
                                {isAdding ? <Loader2 size={14} className="animate-spin" /> : currentProgress === 100 ? "완료" : "경험"}
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleAddContent(result, "WISH")}
                                disabled={isAdding}
                              >
                                {isAdding ? <Loader2 size={14} className="animate-spin" /> : "관심 목록"}
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {!isSearching && searchQuery && searchResults.length === 0 && !error && (
                <div className="text-center py-12 text-text-secondary">
                  검색 버튼을 눌러 콘텐츠를 찾아보세요
                </div>
              )}
            </div>
          )}

          {/* Step 3: Manual Add - 준비 중 */}
          {step === "manual" && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔨</div>
              <h3 className="text-lg font-semibold mb-2">직접 추가 기능 준비 중</h3>
              <p className="text-text-secondary text-sm mb-6">
                검색 결과에 없는 콘텐츠를 직접 추가하는 기능은<br />
                곧 제공될 예정입니다.
              </p>
              <Button variant="secondary" onClick={() => setStep("search")}>
                검색으로 돌아가기
              </Button>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        {step !== "category" && (
          <div className="px-4 py-3 md:px-8 md:py-4 border-t border-border bg-bg-secondary">
            <Button
              unstyled
              onClick={() => {
                if (step === "manual") setStep("search");
                else if (step === "search") resetModal();
              }}
              className="text-sm text-text-secondary hover:text-text-primary"
            >
              ← 이전 단계로
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

