import { useState, useEffect, useTransition } from "react";
import { Lock, Users, Globe, Loader2, FileText, LayoutList, CloudCheck, Cloud } from "lucide-react";
import SectionList from "./SectionList";
import AccordionSection from "@/components/features/content/AccordionSection";
import { getNoteByContentId, upsertNote, addSection, updateSection, deleteSection, updateNoteMemo } from "@/actions/notes";
import type { Note, Snapshot, NoteSection } from "@/actions/notes/types";

interface MyNotePanelProps {
  contentId: string;
  activeTab?: "memo" | "sections";
  onDirtyChange?: (isDirty: boolean) => void;
}

export default function MyNotePanel({ 
  contentId, 
  activeTab = "memo",
  onDirtyChange 
}: MyNotePanelProps) {
  const [note, setNote] = useState<Note | null>(null);
  const [memo, setMemo] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, startSaveTransition] = useTransition();
  const [snapshot, setSnapshot] = useState<Snapshot>({});

  // dirty 상태 계산 및 부모에게 알림
  const isMemoDirty = note !== null && memo !== (note.memo || "");
  // sections의 경우 복잡하므로 여기서는 memo 위주로 처리하거나 간단히 체크
  
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

  async function ensureNote(): Promise<string> {
    if (note) return note.id;
    const newNote = await upsertNote({ contentId, snapshot });
    setNote(newNote);
    return newNote.id;
  }

  const handleAddSection = async (title: string, memo?: string) => {
    startSaveTransition(async () => {
      try {
        const noteId = await ensureNote();
        const newSection = await addSection({ noteId, title, memo });
        setNote((prev: Note | null) => prev ? { ...prev, sections: [...(prev.sections || []), newSection] } : prev);
      } catch (err) { console.error("구획 추가 실패:", err); }
    });
  };

  const handleUpdateSection = async (sectionId: string, updates: { title?: string; memo?: string }) => {
    startSaveTransition(async () => {
      try {
        await updateSection({ sectionId, ...updates });
        setNote((prev: Note | null) => prev ? {
          ...prev,
          sections: prev.sections?.map((s: NoteSection) => s.id === sectionId ? { ...s, ...updates } : s),
        } : prev);
      } catch (err) { console.error("구획 수정 실패:", err); }
    });
  };

  const handleDeleteSection = async (sectionId: string) => {
    startSaveTransition(async () => {
      try {
        await deleteSection(sectionId);
        setNote((prev: Note | null) => prev ? { ...prev, sections: prev.sections?.filter((s: NoteSection) => s.id !== sectionId) } : prev);
      } catch (err) { console.error("구획 삭제 실패:", err); }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-transparent p-6">
      <div className="flex-1 min-h-[200px]">
        {activeTab === "memo" && (
          <div className="h-full animate-in fade-in slide-in-from-bottom-2 duration-300 relative flex flex-col">
            {!memo && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8 z-0">
                <span className="text-text-tertiary/10 leading-relaxed text-base font-sans text-center max-w-[80%] opacity-80">
                  작품 별 노트는 비공개로 안전히 보관합니다. 리뷰 작성 전 필요한 자료를 정리하세요.
                </span>
              </div>
            )}
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full flex-1 bg-transparent text-text-primary focus:outline-none transition-colors resize-none leading-relaxed text-base font-sans mt-2 custom-scrollbar z-10 relative"
            />
          </div>
        )}


        {activeTab === "sections" && (
          <div className="h-full animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col">
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              <SectionList
                sections={note?.sections || []}
                isSaving={isSaving}
                onAdd={handleAddSection}
                onUpdate={handleUpdateSection}
                onDelete={handleDeleteSection}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
