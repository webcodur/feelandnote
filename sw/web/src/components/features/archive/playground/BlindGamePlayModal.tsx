/*
  파일명: /components/features/playground/BlindGamePlayModal.tsx
  기능: 블라인드 게임 플레이 모달
  책임: 게임 전체 흐름 제어 및 상태 관리
*/ // ------------------------------
"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import GameHeader from "./blind-game/GameHeader";
import GamePlaying from "./blind-game/GamePlaying";
import { GameFinished, GameCorrect, GameWrong } from "./blind-game/GameStates";
import { getRecords } from "@/actions/records";
import { saveBlindGameScore } from "@/actions/blind-game";
import { Z_INDEX } from "@/constants/zIndex";

interface BlindGamePlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Question {
  id: string;
  quote: string;
  answer: string;
  hints: Array<{ id: number; text: string; penalty: number }>;
}

interface RecordWithContent {
  id: string;
  content: string;
  type: string;
  contentData: { id: string; title: string; type: string; creator: string | null } | null;
}

function mapRecordToQuestion(record: RecordWithContent): Question | null {
  if (!record.contentData || !record.content) return null;
  const categoryMap: Record<string, string> = { BOOK: "도서", MOVIE: "영화", DRAMA: "드라마", GAME: "게임" };
  const hints: Question["hints"] = [{ id: 1, text: `카테고리: ${categoryMap[record.contentData.type] || "기타"}`, penalty: 1 }];
  if (record.contentData.creator) hints.push({ id: 2, text: `창작자: ${record.contentData.creator}`, penalty: 2 });
  hints.push({ id: 3, text: `첫 글자: ${record.contentData.title.charAt(0)}`, penalty: 2 });
  return { id: record.id, quote: record.content, answer: record.contentData.title, hints };
}

export default function BlindGamePlayModal({ isOpen, onClose }: BlindGamePlayModalProps) {
  const [userAnswer, setUserAnswer] = useState("");
  const [usedHints, setUsedHints] = useState<number[]>([]);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<"playing" | "correct" | "wrong" | "finished">("playing");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedScore, setSavedScore] = useState(false);

  const currentQuestion = questions[currentIndex];

  useEffect(() => { if (isOpen) { loadQuestions(); setSavedScore(false); } }, [isOpen]);
  useEffect(() => { if (streak > maxStreak) setMaxStreak(streak); }, [streak, maxStreak]);

  async function loadQuestions() {
    setIsLoading(true);
    try {
      const records = await getRecords({ limit: 50 }) as RecordWithContent[];
      // REVIEW는 user_contents로 이동됨, QUOTE만 사용
      const valid = records.filter((r) => r.type === "QUOTE" && r.content && r.contentData);
      const mapped = valid.sort(() => Math.random() - 0.5).map(mapRecordToQuestion).filter((q): q is Question => q !== null);
      setQuestions(mapped);
      setCurrentIndex(0); setScore(0); setStreak(0); setMaxStreak(0);
    } catch (error) { console.error("Failed to load questions:", error); }
    finally { setIsLoading(false); }
  }

  if (!isOpen) return null;

  const handleReset = () => { setUserAnswer(""); setUsedHints([]); setGameState("playing"); };
  const handleClose = () => { handleReset(); setScore(0); setStreak(0); setMaxStreak(0); setSavedScore(false); onClose(); };
  const handleSubmit = () => {
    if (!currentQuestion) return;
    const norm = (s: string) => s.toLowerCase().replace(/\s/g, "");
    const isCorrect = norm(currentQuestion.answer) === norm(userAnswer.trim()) ||
      norm(currentQuestion.answer).includes(norm(userAnswer.trim())) ||
      norm(userAnswer.trim()).includes(norm(currentQuestion.answer));

    if (isCorrect) {
      const penalty = usedHints.reduce((sum, id) => sum + (currentQuestion.hints.find((h) => h.id === id)?.penalty || 0), 0);
      setScore(score + Math.max(5 - penalty, 0) + streak);
      setStreak(streak + 1);
      setGameState("correct");
    } else { setStreak(0); setGameState("wrong"); }
  };

  const handleNext = () => {
    handleReset();
    if (currentIndex < questions.length - 1) setCurrentIndex(currentIndex + 1);
    else setGameState("finished");
  };

  const handleSaveScore = async () => {
    if (savedScore || score === 0) return;
    setIsSaving(true);
    try { await saveBlindGameScore({ score, maxStreak }); setSavedScore(true); }
    catch { alert("점수 저장에 실패했습니다"); }
    finally { setIsSaving(false); }
  };

  const handlePlayAgain = () => {
    handleReset(); setSavedScore(false);
    setQuestions([...questions].sort(() => Math.random() - 0.5));
    setCurrentIndex(0); setScore(0); setStreak(0); setMaxStreak(0);
  };

  const earnedPoints = currentQuestion
    ? 5 - usedHints.reduce((sum, id) => sum + (currentQuestion.hints.find((h) => h.id === id)?.penalty || 0), 0)
    : 0;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm" style={{ zIndex: Z_INDEX.modal }}>
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-bg-card rounded-2xl border border-border shadow-2xl overflow-hidden">
        <GameHeader score={score} streak={streak} maxStreak={maxStreak} onClose={handleClose} />

        <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin text-accent" /></div>
          ) : questions.length === 0 ? (
            <div className="text-center py-20 text-text-secondary">
              <p className="mb-2">퀴즈를 만들 기록이 없습니다.</p>
              <p className="text-sm">먼저 기록관에서 리뷰나 인용문을 작성해 주세요.</p>
            </div>
          ) : gameState === "finished" ? (
            <GameFinished score={score} maxStreak={maxStreak} savedScore={savedScore} isSaving={isSaving}
              onSave={handleSaveScore} onClose={handleClose} onPlayAgain={handlePlayAgain} />
          ) : gameState === "playing" && currentQuestion ? (
            <GamePlaying quote={currentQuestion.quote} hints={currentQuestion.hints} usedHints={usedHints}
              userAnswer={userAnswer} currentIndex={currentIndex} totalQuestions={questions.length}
              onHint={(id) => !usedHints.includes(id) && setUsedHints([...usedHints, id])}
              onAnswerChange={setUserAnswer} onSubmit={handleSubmit} />
          ) : gameState === "correct" && currentQuestion ? (
            <GameCorrect answer={currentQuestion.answer} earnedPoints={earnedPoints} streak={streak}
              isLast={currentIndex >= questions.length - 1} onFinish={() => setGameState("finished")} onNext={handleNext} />
          ) : gameState === "wrong" && currentQuestion ? (
            <GameWrong answer={currentQuestion.answer} isLast={currentIndex >= questions.length - 1}
              onFinish={() => setGameState("finished")} onNext={handleNext} />
          ) : null}
        </div>

        {gameState === "playing" && questions.length > 0 && (
          <div className="px-8 py-4 border-t border-border bg-bg-secondary text-center text-sm text-text-secondary">
            힌트를 최소한으로 사용하고 연속 정답으로 높은 점수를 획득하세요!
          </div>
        )}
      </div>
    </div>
  );
}
