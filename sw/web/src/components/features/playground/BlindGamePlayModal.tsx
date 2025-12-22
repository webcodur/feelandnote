"use client";

import { useState, useEffect, useRef } from "react";
import { X, HelpCircle, Flame, CheckCircle, XCircle, Loader2, Trophy, Save } from "lucide-react";
import { Button, Badge } from "@/components/ui";
import { getRecords } from "@/actions/records";
import { saveBlindGameScore } from "@/actions/blind-game";

interface BlindGamePlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Question {
  id: string;
  quote: string;
  answer: string;
  category: string;
  creator?: string;
  hints: Array<{ id: number; text: string; penalty: number }>;
}

interface RecordWithContent {
  id: string;
  content: string;
  type: string;
  contentData: {
    id: string;
    title: string;
    type: string;
    creator: string | null;
  } | null;
}

function mapRecordToQuestion(record: RecordWithContent): Question | null {
  if (!record.contentData || !record.content) return null;

  const categoryMap: Record<string, string> = {
    BOOK: "도서",
    MOVIE: "영화",
    DRAMA: "드라마",
    GAME: "게임",
  };

  const hints: Question["hints"] = [
    { id: 1, text: `카테고리: ${categoryMap[record.contentData.type] || "기타"}`, penalty: 1 },
  ];

  if (record.contentData.creator) {
    hints.push({ id: 2, text: `창작자: ${record.contentData.creator}`, penalty: 2 });
  }

  const firstChar = record.contentData.title.charAt(0);
  hints.push({ id: 3, text: `첫 글자: ${firstChar}`, penalty: 2 });

  return {
    id: record.id,
    quote: record.content,
    answer: record.contentData.title,
    category: categoryMap[record.contentData.type] || "기타",
    creator: record.contentData.creator || undefined,
    hints,
  };
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

  useEffect(() => {
    if (isOpen) {
      loadQuestions();
      setSavedScore(false);
    }
  }, [isOpen]);

  // maxStreak 업데이트
  useEffect(() => {
    if (streak > maxStreak) {
      setMaxStreak(streak);
    }
  }, [streak, maxStreak]);

  async function loadQuestions() {
    setIsLoading(true);
    try {
      const records = await getRecords({ limit: 50 }) as RecordWithContent[];
      const validRecords = records.filter(
        (r) => (r.type === "REVIEW" || r.type === "QUOTE") && r.content && r.contentData
      );

      const shuffled = validRecords.sort(() => Math.random() - 0.5);
      const mapped = shuffled.map(mapRecordToQuestion).filter((q): q is Question => q !== null);

      setQuestions(mapped);
      setCurrentIndex(0);
      setScore(0);
      setStreak(0);
      setMaxStreak(0);
    } catch (error) {
      console.error("Failed to load questions:", error);
    } finally {
      setIsLoading(false);
    }
  }

  if (!isOpen) return null;

  const handleReset = () => {
    setUserAnswer("");
    setUsedHints([]);
    setGameState("playing");
  };

  const handleClose = () => {
    handleReset();
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setSavedScore(false);
    onClose();
  };

  const handleHint = (hintId: number) => {
    if (!usedHints.includes(hintId)) {
      setUsedHints([...usedHints, hintId]);
    }
  };

  const handleSubmit = () => {
    if (!currentQuestion) return;

    const normalizedAnswer = currentQuestion.answer.toLowerCase().replace(/\s/g, "");
    const normalizedUserAnswer = userAnswer.trim().toLowerCase().replace(/\s/g, "");
    const isCorrect = normalizedAnswer === normalizedUserAnswer ||
                      normalizedAnswer.includes(normalizedUserAnswer) ||
                      normalizedUserAnswer.includes(normalizedAnswer);

    if (isCorrect) {
      const baseScore = 5;
      const hintPenalty = usedHints.reduce((sum, id) => {
        const hint = currentQuestion.hints.find((h) => h.id === id);
        return sum + (hint?.penalty || 0);
      }, 0);
      const earnedScore = Math.max(baseScore - hintPenalty, 0) + streak;

      setScore(score + earnedScore);
      setStreak(streak + 1);
      setGameState("correct");
    } else {
      setStreak(0);
      setGameState("wrong");
    }
  };

  const handleNext = () => {
    handleReset();
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // 모든 문제를 풀었으면 완료 상태로
      setGameState("finished");
    }
  };

  const handleFinish = () => {
    setGameState("finished");
  };

  const handleSaveScore = async () => {
    if (savedScore || score === 0) return;

    setIsSaving(true);
    try {
      await saveBlindGameScore({
        score,
        maxStreak,
      });
      setSavedScore(true);
    } catch (error) {
      console.error("Failed to save score:", error);
      alert("점수 저장에 실패했습니다");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePlayAgain = () => {
    handleReset();
    setSavedScore(false);
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    setQuestions(shuffled);
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-bg-card rounded-2xl border border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-border bg-bg-secondary">
          <div className="flex items-center gap-6">
            <div>
              <div className="text-sm text-text-secondary">총 점수</div>
              <div className="text-2xl font-bold text-accent">{score}점</div>
            </div>
            <div className="w-px h-10 bg-border" />
            <div>
              <div className="text-sm text-text-secondary">연속 정답</div>
              <div className="text-2xl font-bold flex items-center gap-1">
                <Flame className="text-orange-500" size={24} />
                {streak}
              </div>
            </div>
            {maxStreak > 0 && (
              <>
                <div className="w-px h-10 bg-border" />
                <div>
                  <div className="text-sm text-text-secondary">최고 연속</div>
                  <div className="text-lg font-bold text-yellow-500">{maxStreak}</div>
                </div>
              </>
            )}
          </div>
          <button
            onClick={handleClose}
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center transition-all duration-200 hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-accent" />
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-20 text-text-secondary">
              <p className="mb-2">퀴즈를 만들 기록이 없습니다.</p>
              <p className="text-sm">먼저 기록관에서 리뷰나 인용문을 작성해 주세요.</p>
            </div>
          ) : gameState === "finished" ? (
            // 게임 완료 화면
            <div className="text-center py-12">
              <Trophy size={80} className="mx-auto mb-6 text-yellow-500" />
              <h2 className="text-3xl font-bold mb-4">게임 완료!</h2>
              <div className="text-xl mb-2">최종 점수: <span className="text-accent font-bold">{score}점</span></div>
              <div className="text-text-secondary mb-8">
                최고 연속 정답: {maxStreak}회
              </div>
              <div className="flex gap-3 justify-center">
                {!savedScore && score > 0 && (
                  <Button
                    variant="primary"
                    onClick={handleSaveScore}
                    disabled={isSaving}
                  >
                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    점수 저장하기
                  </Button>
                )}
                {savedScore && (
                  <div className="text-green-500 flex items-center gap-2">
                    <CheckCircle size={20} />
                    점수가 저장되었습니다!
                  </div>
                )}
              </div>
              <div className="flex gap-3 justify-center mt-4">
                <Button variant="secondary" onClick={handleClose}>
                  나가기
                </Button>
                <Button variant="primary" onClick={handlePlayAgain}>
                  다시 도전
                </Button>
              </div>
            </div>
          ) : gameState === "playing" && currentQuestion ? (
            <>
              {/* Progress */}
              <div className="text-sm text-text-secondary mb-4 text-center">
                {currentIndex + 1} / {questions.length} 문제
              </div>

              {/* Quote Display */}
              <div className="bg-accent/5 rounded-2xl p-8 mb-8 border-l-4 border-accent">
                <div className="text-lg leading-relaxed text-text-primary italic">
                  &ldquo;{currentQuestion.quote}&rdquo;
                </div>
                <div className="text-sm text-text-secondary mt-4 text-right">- 나의 기록</div>
              </div>

              {/* Hints */}
              <div className="mb-8">
                <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                  <HelpCircle size={18} /> 힌트 (사용 시 점수 감점)
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {currentQuestion.hints.map((hint) => {
                    const isUsed = usedHints.includes(hint.id);
                    return (
                      <button
                        key={hint.id}
                        onClick={() => handleHint(hint.id)}
                        disabled={isUsed}
                        className={`p-4 rounded-xl text-left transition-all duration-200
                          ${
                            isUsed
                              ? "bg-bg-secondary border border-accent text-text-primary"
                              : "bg-bg-main border border-border text-text-secondary hover:border-accent hover:bg-bg-secondary"
                          }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-semibold">힌트 {hint.id}</span>
                          <Badge variant={isUsed ? "default" : "primary"}>-{hint.penalty}점</Badge>
                        </div>
                        <div className="text-sm">
                          {isUsed ? hint.text : "???"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Answer Input */}
              <div>
                <label className="block text-base font-semibold mb-3">작품명을 입력하세요</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSubmit()}
                    placeholder="정답을 입력하세요"
                    className="flex-1 px-5 py-4 bg-bg-main border border-border rounded-xl text-text-primary placeholder:text-text-secondary outline-none transition-colors duration-200 focus:border-accent"
                  />
                  <Button variant="primary" onClick={handleSubmit} className="px-8">
                    제출
                  </Button>
                </div>
              </div>
            </>
          ) : gameState === "correct" && currentQuestion ? (
            <div className="text-center py-12">
              <CheckCircle size={80} className="mx-auto mb-6 text-green-500" />
              <h2 className="text-3xl font-bold mb-4 text-green-500">정답입니다!</h2>
              <div className="text-xl mb-2">{currentQuestion.answer}</div>
              <div className="text-text-secondary mb-8">
                +{5 - usedHints.reduce((sum, id) => sum + (currentQuestion.hints.find((h) => h.id === id)?.penalty || 0), 0)} (기본점수)
                {streak > 1 && ` + ${streak - 1} (스트릭 보너스)`}
              </div>
              <div className="flex gap-3 justify-center">
                <Button variant="secondary" onClick={handleFinish}>
                  그만하기
                </Button>
                <Button variant="primary" onClick={handleNext}>
                  {currentIndex < questions.length - 1 ? "다음 문제 →" : "결과 보기"}
                </Button>
              </div>
            </div>
          ) : gameState === "wrong" && currentQuestion ? (
            <div className="text-center py-12">
              <XCircle size={80} className="mx-auto mb-6 text-red-500" />
              <h2 className="text-3xl font-bold mb-4 text-red-500">틀렸습니다</h2>
              <div className="text-xl mb-2">정답: {currentQuestion.answer}</div>
              <div className="text-text-secondary mb-8">
                스트릭이 초기화되었습니다
              </div>
              <div className="flex gap-3 justify-center">
                <Button variant="secondary" onClick={handleFinish}>
                  그만하기
                </Button>
                <Button variant="primary" onClick={handleNext}>
                  {currentIndex < questions.length - 1 ? "다음 문제 →" : "결과 보기"}
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {gameState === "playing" && questions.length > 0 && (
          <div className="px-8 py-4 border-t border-border bg-bg-secondary text-center text-sm text-text-secondary">
            힌트를 최소한으로 사용하고 연속 정답으로 높은 점수를 획득하세요!
          </div>
        )}
      </div>
    </div>
  );
}
