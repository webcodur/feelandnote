/*
  파일명: /components/features/archive/note/NoteEditor.tsx
  기능: 노트 에디터 컴포넌트
  책임: 노트의 섹션, 템플릿, 공개 범위를 관리하고 저장을 처리한다.
*/ // ------------------------------
"use client";

import { useState, useTransition, useEffect } from "react";
import { Lock, Users, Globe, Loader2 } from "lucide-react";
import SectionList from "./SectionList";
import TemplateSection from "./TemplateSection";
import { getNoteByContentId, upsertNote, addSection, updateSection, deleteSection } from "@/actions/notes";
import type { Note, Snapshot, Template, VisibilityType } from "@/actions/notes/types";
import Button from "@/components/ui/Button";

interface NoteEditorProps {
  contentId: string;
}

const VISIBILITY_OPTIONS: { value: VisibilityType; label: string; icon: React.ElementType }[] = [
  { value: "private", label: "비공개", icon: Lock },
  { value: "followers", label: "팔로워 공개", icon: Users },
  { value: "public", label: "전체 공개", icon: Globe },
];

export default function NoteEditor({ contentId }: NoteEditorProps) {
  const [note, setNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, startSaveTransition] = useTransition();
  const [snapshot, setSnapshot] = useState<Snapshot>({});
  const [template, setTemplate] = useState<Template>({});
  const [visibility, setVisibility] = useState<VisibilityType>("private");

  useEffect(() => { loadNote(); }, [contentId]);

  async function loadNote() {
    setIsLoading(true);
    try {
      const data = await getNoteByContentId(contentId);
      if (data) {
        setNote(data);
        setSnapshot(data.snapshot || {});
        setTemplate(data.template || {});
        setVisibility(data.visibility || "private");
      }
    } catch (err) { console.error("노트 로드 실패:", err); }
    finally { setIsLoading(false); }
  }

  async function ensureNote(): Promise<string> {
    if (note) return note.id;
    const newNote = await upsertNote({ contentId, visibility, snapshot, template });
    setNote(newNote);
    return newNote.id;
  }

  const handleAddSection = async (title: string) => {
    startSaveTransition(async () => {
      try {
        const noteId = await ensureNote();
        const newSection = await addSection({ noteId, title });
        setNote((prev) => prev ? { ...prev, sections: [...(prev.sections || []), newSection] } : prev);
      } catch (err) { console.error("구획 추가 실패:", err); }
    });
  };

  const handleUpdateSection = async (sectionId: string, updates: { title?: string; memo?: string }) => {
    startSaveTransition(async () => {
      try {
        await updateSection({ sectionId, ...updates });
        setNote((prev) => prev ? {
          ...prev,
          sections: prev.sections?.map((s) => s.id === sectionId ? { ...s, ...updates } : s),
        } : prev);
      } catch (err) { console.error("구획 수정 실패:", err); }
    });
  };

  const handleDeleteSection = async (sectionId: string) => {
    startSaveTransition(async () => {
      try {
        await deleteSection(sectionId);
        setNote((prev) => prev ? { ...prev, sections: prev.sections?.filter((s) => s.id !== sectionId) } : prev);
      } catch (err) { console.error("구획 삭제 실패:", err); }
    });
  };

  const handleTemplateChange = (key: string, value: string) => {
    setTemplate((prev) => ({ ...prev, [key]: value }));
  };

  const handleTemplateSave = () => {
    startSaveTransition(async () => {
      try { await upsertNote({ contentId, snapshot, template, visibility }); }
      catch (err) { console.error("템플릿 저장 실패:", err); }
    });
  };

  const handleVisibilityChange = (newVisibility: VisibilityType) => {
    setVisibility(newVisibility);
    startSaveTransition(async () => {
      try { await upsertNote({ contentId, snapshot, template, visibility: newVisibility }); }
      catch (err) { console.error("공개 설정 저장 실패:", err); }
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
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        {VISIBILITY_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          return (
            <Button
              unstyled
              key={opt.value}
              onClick={() => handleVisibilityChange(opt.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${
                visibility === opt.value ? "bg-accent/20 text-accent" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <Icon size={14} />
              {opt.label}
            </Button>
          );
        })}
        {isSaving && <Loader2 size={16} className="animate-spin text-accent ml-2" />}
      </div>

      <SectionList
        sections={note?.sections || []}
        isSaving={isSaving}
        onAdd={handleAddSection}
        onUpdate={handleUpdateSection}
        onDelete={handleDeleteSection}
      />

      <TemplateSection
        template={template}
        onTemplateChange={handleTemplateChange}
        onTemplateSave={handleTemplateSave}
      />
    </div>
  );
}
