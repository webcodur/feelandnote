/*
  파일명: components/features/game/QuoteGame.tsx
  기능: 인물찾기 게임
  책임: 명언을 보여주고 4지선다로 인물을 맞추는 퀴즈 게임
*/
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Info } from "lucide-react";
import { getCelebs } from "@/actions/home/getCelebs";
import type { CelebProfile } from "@/types/home";
import { isPublicDomainCeleb, PUBLIC_DOMAIN_NOTICE } from "./utils";
import CelebDetailModal from "@/components/features/home/celeb-card-drafts/CelebDetailModal";
import GameHeader from "./GameHeader";
import ArenaCard from "./ArenaCard";
import { cn } from "@/lib/utils";

type GameState = "idle" | "playing" | "thinking" | "revealing";
type Difficulty = "easy" | "hard";

interface QuoteRound {
  answer: CelebProfile;
  options: CelebProfile[];
}

const HIGHSCORE_KEY = "quote-highscore";
const LINE_LIMIT = { mobile: 18, desktop: 32 };

// region: 명언 줄바꿈
function splitQuote(text: string, charLimit: number): string[] {
  if (text.length <= charLimit) return [text];

  const parts = text.split(/(,\s|;\s)/);
  const chunks: string[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    chunks.push(parts[i] + (parts[i + 1] || ""));
  }

  const lines: string[] = [];
  let current = "";
  for (const chunk of chunks) {
    if (current && (current + chunk).length > charLimit) {
      lines.push(current.trim());
      current = chunk;
    } else {
      current += chunk;
    }
  }
  if (current) lines.push(current.trim());
  return lines.length > 0 ? lines : [text];
}
// endregion

export default function QuoteGame() {
  const [celebs, setCelebs] = useState<CelebProfile[]>([]);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [round, setRound] = useState<QuoteRound | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [usedIds, setUsedIds] = useState<Set<string>>(new Set());
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [charLimit, setCharLimit] = useState(LINE_LIMIT.desktop);
  const [selectedCeleb, setSelectedCeleb] = useState<CelebProfile | null>(null);

  // region: 데이터 로드
  useEffect(() => {
    const load = async () => {
      const result = await getCelebs({ limit: 200, sortBy: "influence" });
      const filtered = result.celebs.filter(
        (c) => c.quotes && c.quotes.trim().length > 0 && isPublicDomainCeleb(c.death_date ?? null)
      );
      setCelebs(filtered);
      setIsDataLoaded(true);

      const saved = localStorage.getItem(HIGHSCORE_KEY);
      if (saved) setHighScore(parseInt(saved, 10));
    };
    load();
    setCharLimit(window.innerWidth < 768 ? LINE_LIMIT.mobile : LINE_LIMIT.desktop);
  }, []);

  // region: 직군별 그룹핑 (고급 모드용)
  const professionMap = useMemo(() => {
    const map = new Map<string, CelebProfile[]>();
    celebs.forEach((c) => {
      const key = c.profession ?? "other";
      const arr = map.get(key) ?? [];
      arr.push(c);
      map.set(key, arr);
    });
    return map;
  }, [celebs]);

  // region: 라운드 생성
  const buildRound = useCallback(
    (exclude: Set<string>, diff: Difficulty = difficulty): QuoteRound | null => {
      const available = celebs.filter((c) => !exclude.has(c.id));
      if (available.length < 4) return null;

      if (diff === "hard") {
        // 동일 직군 4명 보장: 같은 직군이 4명 이상인 답만 허용
        const candidates = available.filter((c) => {
          const group = professionMap.get(c.profession ?? "other") ?? [];
          return group.filter((g) => g.id !== c.id).length >= 3;
        });
        if (candidates.length === 0) return null;

        const answer = candidates[Math.floor(Math.random() * candidates.length)];
        const sameProfession = (professionMap.get(answer.profession ?? "other") ?? [])
          .filter((c) => c.id !== answer.id)
          .sort(() => Math.random() - 0.5);
        const options = [answer, ...sameProfession.slice(0, 3)].sort(() => Math.random() - 0.5);
        return { answer, options };
      }

      // 초급: 다른 직군 우선
      const answer = available[Math.floor(Math.random() * available.length)];
      const distractors: CelebProfile[] = [];

      const diffProfession = celebs.filter(
        (c) => c.id !== answer.id && c.profession !== answer.profession
      );
      distractors.push(...diffProfession.sort(() => Math.random() - 0.5).slice(0, 3));

      // 3명 미만이면 같은 직군에서 보충
      if (distractors.length < 3) {
        const rest = celebs.filter(
          (c) => c.id !== answer.id && !distractors.some((d) => d.id === c.id)
        );
        distractors.push(...rest.sort(() => Math.random() - 0.5).slice(0, 3 - distractors.length));
      }

      const options = [answer, ...distractors.slice(0, 3)].sort(() => Math.random() - 0.5);
      return { answer, options };
    },
    [celebs, difficulty, professionMap]
  );

  // region: 게임 시작
  const startGame = useCallback(
    (selectedDifficulty: Difficulty) => {
      if (celebs.length < 4) return;
      setDifficulty(selectedDifficulty);
      setStreak(0);
      setUsedIds(new Set());
      setSelectedId(null);

      const newRound = buildRound(new Set(), selectedDifficulty);
      if (!newRound) return;
      setRound(newRound);
      setGameState("playing");
    },
    [celebs, buildRound]
  );

  // region: 선택 처리
  const handleSelect = (celebId: string) => {
    if (gameState !== "playing" || !round) return;
    setSelectedId(celebId);
    setGameState("thinking");

    setTimeout(() => {
      setGameState("revealing");

      const correct = celebId === round.answer.id;
      if (correct) {
        const newStreak = streak + 1;
        setStreak(newStreak);
        if (newStreak > highScore) {
          setHighScore(newStreak);
          localStorage.setItem(HIGHSCORE_KEY, newStreak.toString());
        }
      }
    }, 1500);
  };

  // region: 정답 시 자동 진행
  useEffect(() => {
    if (gameState !== "revealing" || !round || !selectedId) return;
    const correct = selectedId === round.answer.id;
    if (!correct) return;

    const timer = setTimeout(() => {
      const newUsed = new Set(usedIds);
      newUsed.add(round.answer.id);
      setUsedIds(newUsed);

      const nextRound = buildRound(newUsed);
      if (!nextRound) {
        setGameState("idle");
        return;
      }
      setRound(nextRound);
      setSelectedId(null);
      setGameState("playing");
    }, 1200);

    return () => clearTimeout(timer);
  }, [gameState, round, selectedId, usedIds, buildRound]);


  // region: 카드 상태 결정
  const getCardStatus = (celebId: string): "normal" | "win" | "lose" | "selected" => {
    if (!round) return "normal";
    if (gameState === "playing") return "normal";
    if (gameState === "thinking") return celebId === selectedId ? "selected" : "normal";
    if (gameState === "revealing") {
      if (celebId === round.answer.id) return "win";
      if (celebId === selectedId) return "lose";
    }
    return "normal";
  };

  // region: 렌더링 - 로딩
  if (!isDataLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="animate-pulse text-text-secondary font-serif">쉼터 입장 중...</div>
      </div>
    );
  }

  // region: 렌더링 - Idle
  if (gameState === "idle") {
    return (
      <div className="max-w-md mx-auto flex flex-col items-center text-center">
        <div className="w-full max-w-sm bg-bg-card border border-border rounded-xl p-6 shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />

          <div className="space-y-4 relative z-10">
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white font-serif">게임 규칙</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                명언을 읽고 4명의 인물 중<br />
                <strong className="text-accent">누구의 말인지</strong> 맞춰보세요.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                onClick={() => startGame("easy")}
                className="flex flex-col items-center justify-center p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-accent/50 active:scale-95 transition-all"
              >
                <div className="font-bold text-white font-serif text-lg">초급</div>
                <span className="text-[10px] text-text-tertiary uppercase tracking-wider mt-1">직군 표시</span>
              </button>
              <button
                onClick={() => startGame("hard")}
                className="flex flex-col items-center justify-center p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-accent/50 active:scale-95 transition-all"
              >
                <div className="font-bold text-white font-serif text-lg">고급</div>
                <span className="text-[10px] text-text-tertiary uppercase tracking-wider mt-1">직군 통일</span>
              </button>
            </div>

            {highScore > 0 && (
              <div className="pt-4 mt-4 border-t border-white/10">
                <p className="text-xs text-text-tertiary font-cinzel uppercase">최고 기록</p>
                <p className="text-2xl font-black text-accent">{highScore}</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex items-center gap-2 px-4 py-2 rounded-full bg-accent/5 border border-accent/10">
          <Info size={14} className="text-accent" />
          <span className="text-xs text-text-tertiary">{PUBLIC_DOMAIN_NOTICE}</span>
        </div>
      </div>
    );
  }

  if (!round) return null;

  const isHardMode = difficulty === "hard";
  const isPlaying = gameState === "playing";
  const isThinking = gameState === "thinking";
  const isRevealing = gameState === "revealing";
  const isCorrect = selectedId === round.answer.id;

  // region: 렌더링 - 게임 플레이
  return (
    <div className="max-w-2xl md:max-w-4xl mx-auto flex flex-col pb-4 md:pb-8 relative">
      {/* 헤더 */}
      <GameHeader
        difficulty={difficulty}
        difficultyLabel={isHardMode ? "고급" : "초급"}
        streak={streak}
        highScore={highScore}
        onBack={() => setGameState("idle")}
        className="mb-4 md:mb-8"
      />

      {/* 명언 영역 */}
      <div className="flex items-center justify-center px-4 md:px-8 py-6 md:py-8">
        <div className="flex items-center gap-2 md:gap-4 max-w-lg">
          <span className="text-4xl md:text-6xl text-accent/30 font-serif select-none leading-none shrink-0">
            &#8220;
          </span>
          <p className="font-serif text-base md:text-xl text-white/90 leading-relaxed text-center">
            {splitQuote(round.answer.quotes ?? "", charLimit).map((line, i) => (
              <span key={i}>
                {i > 0 && <br />}
                {line}
              </span>
            ))}
          </p>
          <span className="text-4xl md:text-6xl text-accent/30 font-serif select-none leading-none shrink-0">
            &#8221;
          </span>
        </div>
      </div>

      {/* 4지선다 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 px-2 md:px-4 mb-4 md:mb-6">
        {round.options.map((celeb) => (
          <ArenaCard
            key={celeb.id}
            imageUrl={celeb.portrait_url ?? celeb.avatar_url}
            name={celeb.nickname}
            title={celeb.profession}
            status={getCardStatus(celeb.id)}
            onClick={isPlaying ? () => handleSelect(celeb.id) : undefined}
            onInfoClick={() => setSelectedCeleb(celeb)}
            className="aspect-square md:aspect-[2/3]"
          />
        ))}
      </div>

      {/* 하단 상태 영역 */}
      <div className="flex flex-col items-center justify-center min-h-[60px]">
        {/* Thinking */}
        {isThinking && (
          <div className="flex flex-col items-center animate-pulse">
            <div className="flex gap-1.5">
              <div className="w-2 h-2 rounded-full bg-accent animate-bounce delay-0" />
              <div className="w-2 h-2 rounded-full bg-accent animate-bounce delay-150" />
              <div className="w-2 h-2 rounded-full bg-accent animate-bounce delay-300" />
            </div>
          </div>
        )}

        {/* Revealing - 오답 */}
        {isRevealing && !isCorrect && (
          <div className="flex flex-col items-center gap-3 animate-in zoom-in-95 duration-300">
            <div className="text-center">
              <span className="text-2xl md:text-3xl font-black text-red-500 font-serif drop-shadow-glow">
                패배했습니다
              </span>
              {streak > 0 && (
                <p className="text-sm text-text-secondary mt-1">{streak}연승 달성</p>
              )}
            </div>
            <button
              onClick={() => setGameState("idle")}
              className={cn(
                "min-w-[160px] h-12 font-serif text-base font-bold rounded-xl shadow-xl",
                "bg-white/10 text-white hover:bg-white/20 border border-white/20 active:scale-95"
              )}
            >
              다시하기
            </button>
          </div>
        )}
      </div>

      {selectedCeleb && (
        <CelebDetailModal
          celeb={selectedCeleb}
          isOpen={!!selectedCeleb}
          onClose={() => setSelectedCeleb(null)}
          hideQuotes
        />
      )}
    </div>
  );
}
