/*
  파일명: /app/reading/components/OnboardingModal.tsx
  기능: 사용 안내 모달
  책임: 최초 접속 시 페이지 사용 방법을 안내한다.
*/ // ------------------------------

"use client";

import { X, MousePointer2, BookOpen, Timer, Sparkles, StickyNote, FileText } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const FEATURES = [
  {
    icon: MousePointer2,
    title: "더블클릭으로 메모 추가",
    description: "화면 어디든 더블클릭하면 포스트잇 메모가 생성됩니다. 드래그로 위치를 옮길 수 있습니다.",
  },
  {
    icon: BookOpen,
    title: "책 선택 (선택사항)",
    description: "상단의 책 검색 버튼으로 현재 읽고 있는 책을 선택할 수 있습니다. 선택하지 않아도 됩니다.",
  },
  {
    icon: Timer,
    title: "자동 시간 측정",
    description: "페이지에 들어오면 자동으로 타이머가 시작됩니다. 일시정지, 초기화가 가능합니다.",
  },
  {
    icon: FileText,
    title: "메인 노트",
    description: "포스트잇 외에 긴 글을 작성할 수 있는 메인 노트가 있습니다. 전체 화면으로 확장 가능합니다.",
  },
  {
    icon: Sparkles,
    title: "AI 질문",
    description: "Gemini API 키를 설정하면 AI에게 책 관련 질문을 할 수 있습니다. 메모 내용이 함께 전달됩니다.",
  },
  {
    icon: StickyNote,
    title: "자동 저장",
    description: "모든 메모는 브라우저 로컬 스토리지에 저장됩니다. 브라우저 데이터를 삭제하거나 다른 기기로 접근 시 메모를 볼 수 없습니다.",
  },
];

export default function OnboardingModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-card shadow-2xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h2 className="text-lg font-semibold">📖 독서 모드 안내</h2>
            <p className="text-sm text-text-secondary">집중해서 독서하고 생각을 기록하세요</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-white/5"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* 기능 설명 */}
        <div className="max-h-[400px] overflow-y-auto p-4">
          <ul className="space-y-4">
            {FEATURES.map((feature, i) => (
              <li key={i} className="flex gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                  <feature.icon className="size-5 text-accent" />
                </div>
                <div>
                  <p className="font-medium">{feature.title}</p>
                  <p className="text-sm text-text-secondary">{feature.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* 푸터 */}
        <div className="border-t border-border p-4">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-accent py-2.5 font-medium text-white hover:bg-accent-hover"
          >
            시작하기
          </button>
          <p className="mt-2 text-center text-xs text-text-secondary">
            우측 사이드바 하단의 버튼으로 다시 볼 수 있습니다
          </p>
        </div>
      </div>
    </div>
  );
}
