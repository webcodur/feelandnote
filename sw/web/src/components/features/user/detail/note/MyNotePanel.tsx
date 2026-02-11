import { useState, useEffect, useTransition, useRef } from "react";
import { Loader2 } from "lucide-react";
import { getNoteByContentId, updateNoteMemo } from "@/actions/notes";
import type { Note, Snapshot } from "@/actions/notes/types";

interface MyNotePanelProps {
  contentId: string;
  onDirtyChange?: (isDirty: boolean) => void;
}

export default function MyNotePanel({
  contentId,
  onDirtyChange
}: MyNotePanelProps) {
  const [note, setNote] = useState<Note | null>(null);
  const [memo, setMemo] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, startSaveTransition] = useTransition();
  const [snapshot, setSnapshot] = useState<Snapshot>({});

  const isMemoDirty = note !== null && memo !== (note.memo || "");

  useEffect(() => {
    onDirtyChange?.(isMemoDirty);
  }, [isMemoDirty, onDirtyChange]);

  useEffect(() => { loadNote(); }, [contentId]);

  async function loadNote() {
    setIsLoading(true);
    try {
      const result = await getNoteByContentId(contentId);
      if (result.success && result.data) {
        setNote(result.data);
        setMemo(result.data.memo || "");
        setSnapshot(result.data.snapshot || {});
      }
    } catch (err) { console.error("노트 로드 실패:", err); }
    finally { setIsLoading(false); }
  }

  useEffect(() => {
    if (!note || memo === note.memo) return;

    const timeoutId = setTimeout(() => {
      startSaveTransition(async () => {
        try {
          await updateNoteMemo(note.id, memo);
          setNote((prev: Note | null) => prev ? { ...prev, memo } : prev);
        } catch (err) {
          console.error("메모 저장 실패:", err);
        }
      });
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [memo, note, startSaveTransition]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto'; // Reset height
      textarea.style.height = `${textarea.scrollHeight}px`; // Set to scrollHeight
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [memo]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full bg-transparent p-6">
      <div className="w-full">
        <div
          className="animate-in fade-in slide-in-from-bottom-2 duration-300 relative flex flex-col min-h-[400px] cursor-text"
          onClick={() => textareaRef.current?.focus()}
        >
          <textarea
            ref={textareaRef}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={3}
            placeholder="작품 별 노트는 비공개로 안전히 보관합니다. 리뷰 작성 전 필요한 자료를 정리하세요."
            className="w-full min-h-[400px] bg-transparent text-text-primary border border-transparent outline-none resize-none leading-relaxed text-base font-sans mt-2 custom-scrollbar overflow-hidden transition-all focus:border-accent/30 focus:shadow-[0_0_20px_rgba(212,175,55,0.15)] focus:bg-accent/5"
          />
        </div>
      </div>
    </div>
  );
}
