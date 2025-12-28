"use client";

import { HelpCircle } from "lucide-react";
import { Button, Badge } from "@/components/ui";

interface Hint {
  id: number;
  text: string;
  penalty: number;
}

interface GamePlayingProps {
  quote: string;
  hints: Hint[];
  usedHints: number[];
  userAnswer: string;
  currentIndex: number;
  totalQuestions: number;
  onHint: (hintId: number) => void;
  onAnswerChange: (answer: string) => void;
  onSubmit: () => void;
}

export default function GamePlaying({
  quote,
  hints,
  usedHints,
  userAnswer,
  currentIndex,
  totalQuestions,
  onHint,
  onAnswerChange,
  onSubmit,
}: GamePlayingProps) {
  return (
    <>
      <div className="text-sm text-text-secondary mb-4 text-center">
        {currentIndex + 1} / {totalQuestions} 문제
      </div>

      <div className="bg-accent/5 rounded-2xl p-8 mb-8 border-l-4 border-accent">
        <div className="text-lg leading-relaxed text-text-primary italic">&ldquo;{quote}&rdquo;</div>
        <div className="text-sm text-text-secondary mt-4 text-right">- 나의 기록</div>
      </div>

      <div className="mb-8">
        <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
          <HelpCircle size={18} /> 힌트 (사용 시 점수 감점)
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {hints.map((hint) => {
            const isUsed = usedHints.includes(hint.id);
            return (
              <button
                key={hint.id}
                onClick={() => onHint(hint.id)}
                disabled={isUsed}
                className={`p-4 rounded-xl text-left transition-all duration-200
                  ${isUsed
                    ? "bg-bg-secondary border border-accent text-text-primary"
                    : "bg-bg-main border border-border text-text-secondary hover:border-accent hover:bg-bg-secondary"
                  }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-semibold">힌트 {hint.id}</span>
                  <Badge variant={isUsed ? "default" : "primary"}>-{hint.penalty}점</Badge>
                </div>
                <div className="text-sm">{isUsed ? hint.text : "???"}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-base font-semibold mb-3">작품명을 입력하세요</label>
        <div className="flex gap-3">
          <input
            type="text"
            value={userAnswer}
            onChange={(e) => onAnswerChange(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && onSubmit()}
            placeholder="정답을 입력하세요"
            className="flex-1 px-5 py-4 bg-bg-main border border-border rounded-xl text-text-primary placeholder:text-text-secondary outline-none transition-colors duration-200 focus:border-accent"
          />
          <Button variant="primary" onClick={onSubmit} className="px-8">제출</Button>
        </div>
      </div>
    </>
  );
}
