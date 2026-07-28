/*
  파일명: /app/reading/components/SectionWindow/SectionBody.tsx
  기능: 섹션 본문 분기
  책임: 섹션 타입별 콘텐츠 컴포넌트를 렌더링한다.
*/ // ------------------------------

"use client";

import { useTranslations } from "next-intl";
import CharacterContent from "../CharacterContent";
import TimelineContent from "../TimelineContent";
import ConceptMapContent from "../ConceptMapContent";
import ComparisonContent from "../ComparisonContent";
import GlossaryContent from "../GlossaryContent";
import ImageContent from "./ImageContent";
import type {
  Section,
  CharacterInfo,
  TimelineSectionData,
  ConceptMapSectionData,
  ComparisonSectionData,
  GlossarySectionData,
} from "../../types";

interface Props {
  section: Section;
  onUpdate: (updates: Partial<Section>) => void;
  // 인물 섹션용
  onAddCharacter?: () => void;
  onUpdateCharacter?: (characterId: string, updates: Partial<CharacterInfo>) => void;
  onDeleteCharacter?: (characterId: string) => void;
}

export default function SectionBody({
  section,
  onUpdate,
  onAddCharacter,
  onUpdateCharacter,
  onDeleteCharacter,
}: Props) {
  return (
    <>
      {section.type === "basic" && (
        <BasicContent
          content={(section.data as { content: string }).content}
          onChange={(content) => onUpdate({ data: { type: "basic", content } })}
        />
      )}

      {section.type === "character" && (
        <CharacterContent
          characters={(section.data as { characters: CharacterInfo[] }).characters}
          onAdd={onAddCharacter!}
          onUpdate={onUpdateCharacter!}
          onDelete={onDeleteCharacter!}
        />
      )}

      {section.type === "image" && (
        <ImageContent imageUrl={(section.data as { imageUrl: string | null }).imageUrl} />
      )}

      {section.type === "timeline" && (
        <TimelineContent
          events={(section.data as TimelineSectionData).events}
          onUpdate={(events) => onUpdate({ data: { type: "timeline", events } })}
        />
      )}

      {section.type === "conceptMap" && (
        <ConceptMapContent
          concepts={(section.data as ConceptMapSectionData).concepts}
          onUpdate={(concepts) => onUpdate({ data: { type: "conceptMap", concepts } })}
        />
      )}

      {section.type === "comparison" && (
        <ComparisonContent
          items={(section.data as ComparisonSectionData).items}
          criteriaOrder={(section.data as ComparisonSectionData).criteriaOrder}
          onUpdate={(items, criteriaOrder) =>
            onUpdate({ data: { type: "comparison", items, criteriaOrder } })
          }
        />
      )}

      {section.type === "glossary" && (
        <GlossaryContent
          terms={(section.data as GlossarySectionData).terms}
          onUpdate={(terms) => onUpdate({ data: { type: "glossary", terms } })}
        />
      )}
    </>
  );
}

// #region 기본 섹션 콘텐츠
function BasicContent({
  content,
  onChange,
}: {
  content: string;
  onChange: (content: string) => void;
}) {
  const t = useTranslations("reading.section");
  return (
    <textarea
      value={content}
      onChange={(e) => onChange(e.target.value)}
      placeholder={t("basicPlaceholder")}
      className="h-full w-full resize-none bg-transparent text-sm leading-relaxed placeholder: focus:outline-none"
    />
  );
}
// #endregion
