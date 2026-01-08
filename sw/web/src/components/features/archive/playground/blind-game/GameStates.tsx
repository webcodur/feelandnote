/*
  파일명: /components/features/playground/blind-game/GameStates.tsx
  기능: 블라인드 게임 상태별 화면 컴포넌트
  책임: 게임 완료, 정답, 오답 상태 UI 렌더링
*/ // ------------------------------
"use client";

import { CheckCircle, XCircle, Trophy, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";

interface GameFinishedProps {
  score: number;
  maxStreak: number;
  savedScore: boolean;
  isSaving: boolean;
  onSave: () => void;
  onClose: () => void;
  onPlayAgain: () => void;
}

export function GameFinished({ score, maxStreak, savedScore, isSaving, onSave, onClose, onPlayAgain }: GameFinishedProps) {
  return (
    <div className="text-center py-12">
      <Trophy size={80} className="mx-auto mb-6 text-yellow-500" />
      <h2 className="text-3xl font-bold mb-4">게임 완료!</h2>
      <div className="text-xl mb-2">최종 점수: <span className="text-accent font-bold">{score}점</span></div>
      <div className="text-text-secondary mb-8">최고 연속 정답: {maxStreak}회</div>
      <div className="flex gap-3 justify-center">
        {!savedScore && score > 0 && (
          <Button variant="primary" onClick={onSave} disabled={isSaving}>
            {isSaving && <Loader2 size={14} className="animate-spin" />}
            {!isSaving && <Save size={14} />}
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
        <Button variant="secondary" onClick={onClose}>나가기</Button>
        <Button variant="primary" onClick={onPlayAgain}>다시 도전</Button>
      </div>
    </div>
  );
}

interface GameCorrectProps {
  answer: string;
  earnedPoints: number;
  streak: number;
  isLast: boolean;
  onFinish: () => void;
  onNext: () => void;
}

export function GameCorrect({ answer, earnedPoints, streak, isLast, onFinish, onNext }: GameCorrectProps) {
  return (
    <div className="text-center py-12">
      <CheckCircle size={80} className="mx-auto mb-6 text-green-500" />
      <h2 className="text-3xl font-bold mb-4 text-green-500">정답입니다!</h2>
      <div className="text-xl mb-2">{answer}</div>
      <div className="text-text-secondary mb-8">
        +{earnedPoints} (기본점수){streak > 1 && ` + ${streak - 1} (스트릭 보너스)`}
      </div>
      <div className="flex gap-3 justify-center">
        <Button variant="secondary" onClick={onFinish}>그만하기</Button>
        <Button variant="primary" onClick={onNext}>{isLast ? "결과 보기" : "다음 문제 →"}</Button>
      </div>
    </div>
  );
}

interface GameWrongProps {
  answer: string;
  isLast: boolean;
  onFinish: () => void;
  onNext: () => void;
}

export function GameWrong({ answer, isLast, onFinish, onNext }: GameWrongProps) {
  return (
    <div className="text-center py-12">
      <XCircle size={80} className="mx-auto mb-6 text-red-500" />
      <h2 className="text-3xl font-bold mb-4 text-red-500">틀렸습니다</h2>
      <div className="text-xl mb-2">정답: {answer}</div>
      <div className="text-text-secondary mb-8">스트릭이 초기화되었습니다</div>
      <div className="flex gap-3 justify-center">
        <Button variant="secondary" onClick={onFinish}>그만하기</Button>
        <Button variant="primary" onClick={onNext}>{isLast ? "결과 보기" : "다음 문제 →"}</Button>
      </div>
    </div>
  );
}
