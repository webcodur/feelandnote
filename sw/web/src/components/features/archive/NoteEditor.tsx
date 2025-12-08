"use client";

import { useState, useTransition, useEffect } from "react";
import {
  Plus,
  List,
  PenTool,
  ChevronDown,
  ChevronUp,
  Check,
  GripVertical,
  Trash2,
  Loader2,
  Lock,
  Users,
  Globe,
} from "lucide-react";
import { Button, Card } from "@/components/ui";
import {
  getNoteByContentId,
  upsertNote,
  addSection,
  updateSection,
  deleteSection,
} from "@/actions/notes";
import type { Note, NoteSection, Snapshot, Template, VisibilityType } from "@/actions/notes/types";

interface NoteEditorProps {
  contentId: string;
}


const TEMPLATE_ITEMS = [
  { key: "context", title: "감상 계기", placeholder: "예: 시험 끝난 금요일 밤, 집에서 넷플릭스 뒤적이다 우연히 발견함...", description: "언제, 어디서, 어떤 계기로 이 작품을 만났나요? 구체적으로 적을수록 나중에 더 생생하게 떠오릅니다." },
  { key: "summary", title: "3줄 요약", placeholder: "작품을 3줄로 요약해보세요" },
  { key: "questions", title: "작품의 질문 vs 내 질문", placeholder: "작품이 던지는 질문과 내가 갖게 된 질문" },
  { key: "moment", title: "강렬했던 순간", placeholder: "가장 인상 깊었던 장면이나 순간" },
  { key: "quote", title: "인용구", placeholder: "기억하고 싶은 문장이나 대사" },
  { key: "change", title: "작품 전후 나의 변화", placeholder: "작품을 경험하기 전과 후, 달라진 점" },
];

const VISIBILITY_OPTIONS: { value: VisibilityType; label: string; icon: React.ElementType }[] = [
  { value: "private", label: "비공개", icon: Lock },
  { value: "followers", label: "팔로워 공개", icon: Users },
  { value: "public", label: "전체 공개", icon: Globe },
];

export default function NoteEditor({ contentId }: NoteEditorProps) {
  const [note, setNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, startSaveTransition] = useTransition();

  // 구획 추가 폼
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [isAddingSection, setIsAddingSection] = useState(false);

  // 경험 스냅샷
  const [snapshot, setSnapshot] = useState<Snapshot>({});

  // 구조화 템플릿
  const [template, setTemplate] = useState<Template>({});
  const [activeTemplateKey, setActiveTemplateKey] = useState<string | null>(null);

  // 공개 설정
  const [visibility, setVisibility] = useState<VisibilityType>("private");

  useEffect(() => {
    loadNote();
  }, [contentId]);

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
    } catch (err) {
      console.error("노트 로드 실패:", err);
    } finally {
      setIsLoading(false);
    }
  }

  // 노트가 없으면 자동 생성
  async function ensureNote(): Promise<string> {
    if (note) return note.id;

    const newNote = await upsertNote({ contentId, visibility, snapshot, template });
    setNote(newNote);
    return newNote.id;
  }

  // 구획 추가
  const handleAddSection = async () => {
    if (!newSectionTitle.trim()) return;

    startSaveTransition(async () => {
      try {
        const noteId = await ensureNote();
        const newSection = await addSection({
          noteId,
          title: newSectionTitle,
        });
        setNote((prev) =>
          prev
            ? { ...prev, sections: [...(prev.sections || []), newSection] }
            : prev
        );
        setNewSectionTitle("");
        setIsAddingSection(false);
      } catch (err) {
        console.error("구획 추가 실패:", err);
      }
    });
  };

  // 구획 업데이트
  const handleUpdateSection = async (
    sectionId: string,
    updates: { title?: string; memo?: string }
  ) => {
    startSaveTransition(async () => {
      try {
        await updateSection({ sectionId, ...updates });
        setNote((prev) =>
          prev
            ? {
                ...prev,
                sections: prev.sections?.map((s) =>
                  s.id === sectionId
                    ? {
                        ...s,
                        ...(updates.title !== undefined && { title: updates.title }),
                        ...(updates.memo !== undefined && { memo: updates.memo }),
                      }
                    : s
                ),
              }
            : prev
        );
      } catch (err) {
        console.error("구획 수정 실패:", err);
      }
    });
  };

  // 구획 삭제
  const handleDeleteSection = async (sectionId: string) => {
    startSaveTransition(async () => {
      try {
        await deleteSection(sectionId);
        setNote((prev) =>
          prev
            ? { ...prev, sections: prev.sections?.filter((s) => s.id !== sectionId) }
            : prev
        );
      } catch (err) {
        console.error("구획 삭제 실패:", err);
      }
    });
  };

  // 스냅샷 저장
  const handleSnapshotChange = (key: keyof Snapshot, value: string) => {
    const newSnapshot = { ...snapshot, [key]: value };
    setSnapshot(newSnapshot);

    startSaveTransition(async () => {
      try {
        await upsertNote({ contentId, snapshot: newSnapshot, template, visibility });
      } catch (err) {
        console.error("스냅샷 저장 실패:", err);
      }
    });
  };

  // 템플릿 저장
  const handleTemplateChange = (key: string, value: string) => {
    const newTemplate = { ...template, [key]: value };
    setTemplate(newTemplate);
  };

  const handleTemplateSave = () => {
    startSaveTransition(async () => {
      try {
        await upsertNote({ contentId, snapshot, template, visibility });
      } catch (err) {
        console.error("템플릿 저장 실패:", err);
      }
    });
  };

  // 공개 설정 저장
  const handleVisibilityChange = (newVisibility: VisibilityType) => {
    setVisibility(newVisibility);
    startSaveTransition(async () => {
      try {
        await upsertNote({ contentId, snapshot, template, visibility: newVisibility });
      } catch (err) {
        console.error("공개 설정 저장 실패:", err);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-accent" />
      </div>
    );
  }

  const sections = note?.sections || [];

  return (
    <div className="space-y-6">
      {/* 공개 설정 */}
      <div className="flex justify-end gap-2">
        {VISIBILITY_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              onClick={() => handleVisibilityChange(opt.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                visibility === opt.value
                  ? "bg-accent/20 text-accent"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <Icon size={14} />
              {opt.label}
            </button>
          );
        })}
        {isSaving && <Loader2 size={16} className="animate-spin text-accent ml-2" />}
      </div>

      {/* 구획별 기록 */}
      <Card className="p-0">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <List size={18} /> 구획별 기록
          </h3>

          {/* 구획 목록 */}
          <div className="space-y-3">
            {sections.map((section) => (
              <SectionItem
                key={section.id}
                section={section}
                onUpdate={handleUpdateSection}
                onDelete={handleDeleteSection}
              />
            ))}
          </div>

          {/* 구획 추가 */}
          {isAddingSection ? (
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
                placeholder="구획명을 입력하세요 (예: 1장, E01)"
                className="flex-1 bg-black/20 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddSection();
                  if (e.key === "Escape") setIsAddingSection(false);
                }}
              />
              <Button variant="primary" size="sm" onClick={handleAddSection} disabled={isSaving}>
                추가
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setIsAddingSection(false)}>
                취소
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingSection(true)}
              className="mt-4 w-full p-3 bg-transparent border border-dashed border-border rounded-xl text-text-secondary text-sm flex items-center justify-center gap-2 hover:border-accent hover:text-accent transition-all"
            >
              <Plus size={14} /> 구획 추가
            </button>
          )}
        </div>
      </Card>

      {/* 구조화 템플릿 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-6">
          <PenTool size={18} /> 돌아보기
        </h3>

        <div className="space-y-3">
          {TEMPLATE_ITEMS.map((item) => (
            <div
              key={item.key}
              className="border border-border rounded-xl overflow-hidden bg-bg-secondary"
            >
              <button
                className="w-full py-4 px-6 flex justify-between items-center font-semibold text-left hover:bg-white/5 transition-colors"
                onClick={() =>
                  setActiveTemplateKey(activeTemplateKey === item.key ? null : item.key)
                }
              >
                <span className="flex items-center gap-2">
                  {template[item.key as keyof Template] && (
                    <Check size={14} className="text-accent" />
                  )}
                  {item.title}
                </span>
                {activeTemplateKey === item.key ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
              </button>
              {activeTemplateKey === item.key && (
                <div className="px-6 pb-6">
                  {item.description && (
                    <p className="text-sm text-text-secondary mb-3">{item.description}</p>
                  )}
                  <textarea
                    className="w-full bg-bg-card border border-border rounded-lg p-3 text-text-primary text-sm resize-y min-h-[120px] outline-none focus:border-accent"
                    placeholder={item.placeholder}
                    value={template[item.key as keyof Template] || ""}
                    onChange={(e) => handleTemplateChange(item.key, e.target.value)}
                    onBlur={handleTemplateSave}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// 구획 아이템 컴포넌트
function SectionItem({
  section,
  onUpdate,
  onDelete,
}: {
  section: NoteSection;
  onUpdate: (id: string, updates: { title?: string; memo?: string }) => void;
  onDelete: (id: string) => void;
}) {
  const [memo, setMemo] = useState(section.memo || "");

  return (
    <div className="bg-bg-secondary rounded-xl p-4 border border-border">
      <div className="flex items-center gap-3 mb-3">
        <span className="font-semibold flex-1">{section.title}</span>
        <button
          onClick={() => onDelete(section.id)}
          className="text-text-secondary hover:text-red-400 transition-colors"
        >
          <Trash2 size={14} />
        </button>
        <div className="cursor-grab text-gray-500">
          <GripVertical size={14} />
        </div>
      </div>
      <textarea
        className="w-full bg-black/20 border border-border rounded-lg p-3 text-text-primary text-sm resize-y min-h-[80px] outline-none focus:border-accent"
        placeholder="메모를 입력하세요..."
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        onBlur={() => {
          if (memo !== section.memo) {
            onUpdate(section.id, { memo });
          }
        }}
      />
    </div>
  );
}
