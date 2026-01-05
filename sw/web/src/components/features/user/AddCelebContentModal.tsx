"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Book, Film, Gamepad2, Music, Award, Link as LinkIcon, Loader2 } from "lucide-react";
import { Modal, ModalBody, ModalFooter, Button } from "@/components/ui";
import { searchContents, type ContentSearchResult } from "@/actions/search";
import { addCelebContent } from "@/actions/celebs";
import type { CategoryId } from "@/constants/categories";
import type { ContentType, ContentStatus } from "@/types/database";

interface AddCelebContentModalProps {
  isOpen: boolean;
  celebId: string;
  celebName: string;
  onClose: () => void;
}

const CATEGORY_CONFIG: Array<{ id: CategoryId; label: string; icon: typeof Book; type: ContentType }> = [
  { id: "book", label: "도서", icon: Book, type: "BOOK" },
  { id: "video", label: "영상", icon: Film, type: "VIDEO" },
  { id: "game", label: "게임", icon: Gamepad2, type: "GAME" },
  { id: "music", label: "음악", icon: Music, type: "MUSIC" },
  { id: "certificate", label: "자격증", icon: Award, type: "CERTIFICATE" },
];

const STATUS_OPTIONS: Array<{ value: ContentStatus; label: string }> = [
  { value: "FINISHED", label: "완료" },
  { value: "WATCHING", label: "경험중" },
  { value: "WANT", label: "예정" },
];

export default function AddCelebContentModal({ isOpen, celebId, celebName, onClose }: AddCelebContentModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [category, setCategory] = useState<CategoryId>("book");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ContentSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selected, setSelected] = useState<ContentSearchResult | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [status, setStatus] = useState<ContentStatus>("FINISHED");
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setError("");
    try {
      const response = await searchContents({ query, category });
      setResults(response.items);
    } catch {
      setError("검색에 실패했습니다");
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleSelect = (item: ContentSearchResult) => {
    setSelected(item);
    setResults([]);
    setQuery("");
  };

  const handleSubmit = () => {
    if (!selected) return;
    if (!sourceUrl.trim()) {
      setError("출처 링크를 입력해주세요");
      return;
    }

    const categoryConfig = CATEGORY_CONFIG.find((c) => c.id === category);
    if (!categoryConfig) return;

    startTransition(async () => {
      try {
        await addCelebContent({
          celebId,
          contentId: selected.id,
          type: categoryConfig.type,
          title: selected.title,
          creator: selected.creator,
          thumbnailUrl: selected.thumbnail,
          description: selected.description,
          releaseDate: selected.releaseDate,
          status,
          sourceUrl: sourceUrl.trim(),
        });
        router.refresh();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "추가에 실패했습니다");
      }
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${celebName}의 기록 추가`} size="lg">
      <ModalBody className="space-y-4 max-h-[60vh] overflow-y-auto">
        {/* 카테고리 선택 */}
        <div className="flex gap-2 flex-wrap">
          {CATEGORY_CONFIG.map((cat) => {
            const Icon = cat.icon;
            return (
              <Button
                unstyled
                key={cat.id}
                onClick={() => {
                  setCategory(cat.id);
                  setResults([]);
                  setSelected(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 ${
                  category === cat.id
                    ? "bg-accent text-white"
                    : "bg-surface text-text-secondary hover:text-text-primary"
                }`}
              >
                <Icon size={14} />
                {cat.label}
              </Button>
            );
          })}
        </div>

        {/* 검색 */}
        {!selected && (
          <>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="콘텐츠 검색..."
                  className="w-full pl-9 pr-4 py-2.5 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <Button
                unstyled
                onClick={handleSearch}
                disabled={isSearching}
                className="px-4 py-2.5 bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50 font-medium"
              >
                {isSearching ? <Loader2 size={16} className="animate-spin" /> : "검색"}
              </Button>
            </div>

            {/* 검색 결과 */}
            {results.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {results.map((item) => (
                  <Button
                    unstyled
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className="w-full flex items-start gap-3 p-3 bg-surface rounded-lg hover:bg-surface-hover text-start"
                  >
                    {item.thumbnail ? (
                      <img src={item.thumbnail} alt={item.title} className="w-12 h-16 object-cover rounded flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-16 bg-background rounded flex items-center justify-center flex-shrink-0">
                        <Book size={20} className="text-text-tertiary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary truncate">{item.title}</p>
                      <p className="text-xs text-text-secondary truncate">{item.creator}</p>
                      {item.releaseDate && <p className="text-xs text-text-tertiary mt-0.5">{item.releaseDate}</p>}
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </>
        )}

        {/* 선택된 콘텐츠 */}
        {selected && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-surface rounded-lg">
              {selected.thumbnail ? (
                <img src={selected.thumbnail} alt={selected.title} className="w-14 h-20 object-cover rounded flex-shrink-0" />
              ) : (
                <div className="w-14 h-20 bg-background rounded flex items-center justify-center flex-shrink-0">
                  <Book size={24} className="text-text-tertiary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text-primary">{selected.title}</p>
                <p className="text-sm text-text-secondary">{selected.creator}</p>
                <Button unstyled onClick={() => setSelected(null)} className="text-xs text-accent hover:underline mt-1">
                  다른 콘텐츠 선택
                </Button>
              </div>
            </div>

            {/* 상태 선택 */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">상태</label>
              <div className="flex gap-2">
                {STATUS_OPTIONS.map((opt) => (
                  <Button
                    unstyled
                    key={opt.value}
                    onClick={() => setStatus(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                      status === opt.value ? "bg-accent text-white" : "bg-surface text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* 출처 URL */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">출처 링크 *</label>
              <div className="relative">
                <LinkIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full pl-9 pr-4 py-2.5 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <p className="text-xs text-text-tertiary mt-1">{celebName}님이 이 콘텐츠를 언급한 출처를 입력하세요</p>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}
      </ModalBody>

      <ModalFooter>
        <Button unstyled onClick={onClose} className="flex-1 px-4 py-2.5 bg-surface text-text-secondary rounded-lg hover:bg-surface-hover font-medium">
          취소
        </Button>
        <Button
          unstyled
          onClick={handleSubmit}
          disabled={!selected || !sourceUrl.trim() || isPending}
          className="flex-1 px-4 py-2.5 bg-accent text-white rounded-lg hover:bg-accent/90 font-medium disabled:opacity-50"
        >
          {isPending ? "추가 중..." : "추가"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
