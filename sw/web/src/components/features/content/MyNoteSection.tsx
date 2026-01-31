/*
  파일명: /components/features/content/MyNoteSection.tsx
  기능: 내 노트 섹션
  책임: NoteEditor를 래핑하여 비공개 노트 편집 기능을 제공한다.
*/ // ------------------------------
"use client";

import NoteEditor from "@/components/features/user/detail/note/NoteEditor";

interface MyNoteSectionProps {
  contentId: string;
}

export default function MyNoteSection({ contentId }: MyNoteSectionProps) {
  return (
    <div className="pt-4">
      <NoteEditor contentId={contentId} />
    </div>
  );
}
