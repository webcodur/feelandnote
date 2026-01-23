/*
  파일명: /app/reading/components/BookSearchModal.tsx
  기능: 책 검색 모달
  책임: 책을 검색하고 선택할 수 있는 모달을 제공한다.
*/ // ------------------------------

"use client";

import { useState, useCallback } from "react";
import { Search, X, Book } from "lucide-react";
import { searchBooks } from "@/actions/contents/searchBooks";
import type { SelectedBook } from "../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (book: SelectedBook) => void;
}

interface SearchResult {
  id: string;
  title: string;
  author?: string;
  thumbnail?: string;
  publisher?: string;
  publishDate?: string;
  description?: string;
}

export default function BookSearchModal({ isOpen, onClose, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      const data = await searchBooks({ query });
      setResults(
        data.items?.map((item) => ({
          id: item.externalId,
          title: item.title,
          author: item.creator,
          thumbnail: item.coverImageUrl || undefined,
          publisher: item.metadata.publisher,
          publishDate: item.metadata.publishDate,
          description: item.metadata.description,
        })) || []
      );
    } catch (err) {
      console.error("책 검색 실패:", err);
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleSelect = (result: SearchResult) => {
    onSelect({
      id: result.id,
      title: result.title,
      author: result.author,
      thumbnail: result.thumbnail,
      publisher: result.publisher,
      publishDate: result.publishDate,
      description: result.description,
    });
  };

  const handleClose = () => {
    setQuery("");
    setResults([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-main p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#1a1f27] shadow-2xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-lg font-semibold">책 검색</h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-1 hover:bg-white/5"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* 검색창 */}
        <div className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="책 제목 또는 저자"
                className="w-full rounded-lg bg-white/5 py-2 pe-4 ps-10 text-sm placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
                autoFocus
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            >
              검색
            </button>
          </div>

          {/* 안내 문구 */}
          <p className="mt-2 text-xs text-text-secondary">
            책 선택은 선택사항입니다. 선택하지 않아도 자유롭게 메모할 수 있습니다.
          </p>
        </div>

        {/* 검색 결과 */}
        <div className="max-h-[300px] overflow-y-auto border-t border-border">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="size-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            </div>
          )}

          {!isLoading && results.length === 0 && query && (
            <div className="flex flex-col items-center justify-center py-8 text-text-secondary">
              <Book className="mb-2 size-8" />
              <p className="text-sm">검색 결과가 없습니다</p>
            </div>
          )}

          {!isLoading && results.length > 0 && (
            <ul>
              {results.map((result, index) => (
                <li key={result.id || `result-${index}`}>
                  <button
                    onClick={() => handleSelect(result)}
                    className="flex w-full items-center gap-3 p-3 text-start hover:bg-white/5"
                  >
                    {result.thumbnail ? (
                      <img
                        src={result.thumbnail}
                        alt={result.title}
                        className="h-16 w-12 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-12 items-center justify-center rounded bg-white/10">
                        <Book className="size-5 text-text-secondary" />
                      </div>
                    )}
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate font-medium">{result.title}</p>
                      {result.author && (
                        <p className="truncate text-sm text-text-secondary">
                          {result.author}
                        </p>
                      )}
                      <div className="mt-1 flex items-center gap-2 text-xs text-text-tertiary">
                        {result.publisher && <span>{result.publisher}</span>}
                        {result.publisher && result.publishDate && <span>·</span>}
                        {result.publishDate && <span>{result.publishDate}</span>}
                      </div>
                      {result.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-text-secondary">
                          {result.description}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
