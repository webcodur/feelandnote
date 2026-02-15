/*
  파일명: components/features/game/tracker/GuessInput.tsx
  기능: 인물추적 주관식 입력 (자동완성 포함)
  책임: 셀럽 이름 자동완성 드롭다운 + 제출 + 패스
*/
"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Search, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CelebNameOption {
  id: string;
  nickname: string;
}

interface GuessInputProps {
  celebNames: CelebNameOption[];
  onSubmit: (guess: string) => boolean;
  onPass: () => void;
  disabled?: boolean;
  placeholder?: string;
  passLabel?: string;
}

export default function GuessInput({
  celebNames,
  onSubmit,
  onPass,
  disabled = false,
  placeholder = "인물 이름을 입력하세요",
  passLabel = "모르겠다",
}: GuessInputProps) {
  const [value, setValue] = useState("");
  const [shake, setShake] = useState(false);
  const [wrongMsg, setWrongMsg] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 2글자 이상 입력 시 필터링
  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (q.length < 2) return [];
    return celebNames
      .filter((c) => c.nickname.toLowerCase().includes(q))
      .slice(0, 8);
  }, [value, celebNames]);

  useEffect(() => {
    setSelectedIndex(-1);
    setShowDropdown(filtered.length > 0);
  }, [filtered]);

  const submitGuess = (guess: string) => {
    const trimmed = guess.trim();
    if (!trimmed || disabled) return;

    const correct = onSubmit(trimmed);
    if (!correct) {
      setShake(true);
      setWrongMsg(true);
      setValue("");
      setShowDropdown(false);
      setTimeout(() => setShake(false), 500);
      setTimeout(() => setWrongMsg(false), 1500);
      inputRef.current?.focus();
    }
  };

  const handleSelect = (nickname: string) => {
    setValue(nickname);
    setShowDropdown(false);
    submitGuess(nickname);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || filtered.length === 0) {
      if (e.key === "Enter") {
        e.preventDefault();
        submitGuess(value);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < filtered.length) {
        handleSelect(filtered[selectedIndex].nickname);
      } else {
        submitGuess(value);
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="w-full max-w-sm mx-auto space-y-2">
      <div className="relative" ref={dropdownRef}>
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg border bg-black/30 px-3 py-2",
            shake ? "animate-shake border-red-500/60" : "border-white/20 focus-within:border-accent/50"
          )}
        >
          <Search size={16} className="shrink-0 text-text-secondary" />
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => filtered.length > 0 && setShowDropdown(true)}
            disabled={disabled}
            placeholder={placeholder}
            autoComplete="off"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-text-tertiary outline-none"
          />
          <button
            onClick={() => submitGuess(value)}
            disabled={disabled || !value.trim()}
            className="shrink-0 rounded-md bg-accent/20 px-3 py-1 text-xs font-bold text-accent hover:bg-accent/30 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            확인
          </button>
        </div>

        {/* 자동완성 드롭다운 */}
        {showDropdown && filtered.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border border-white/20 bg-bg-card shadow-xl overflow-hidden">
            {filtered.map((c, i) => (
              <button
                key={c.id}
                onClick={() => handleSelect(c.nickname)}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm hover:bg-white/10",
                  i === selectedIndex ? "bg-accent/15 text-accent" : "text-text-primary"
                )}
              >
                {c.nickname}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-3">
        {wrongMsg && (
          <p className="text-xs text-red-400 animate-in fade-in">틀렸습니다</p>
        )}
        <button
          onClick={onPass}
          disabled={disabled}
          className="flex items-center gap-1 text-xs text-text-tertiary hover:text-text-secondary disabled:opacity-40"
        >
          <SkipForward size={12} />
          {passLabel}
        </button>
      </div>
    </div>
  );
}
