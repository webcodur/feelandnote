/*
  파일명: /components/shared/content/creatorLink/CreatorNames.tsx
  기능: 저자·감독·출연·아티스트 표기를 그대로 보여 주되, 등록 인물이 있는 이름만 누를 수 있게 한다.
  책임: 글자는 한 자도 바꾸지 않는다 — 원문 표기를 유지한 채 이름 조각에만 표시를 얹는다.
        후보가 없는 이름은 평문 그대로다. 눌러 봐야 아는 상태를 만들지 않는다.
*/ // ------------------------------
"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import {
  collectCreatorNames,
  normalizeCreatorName,
  splitCreatorNames,
} from "@/lib/utils/creator-names";

import CelebNameCandidates from "./CelebNameCandidates";
import { useCelebNameMatches } from "./useCelebNameMatches";

interface CreatorNamesProps {
  /** 화면에 낼 창작자 표기 한 줄. 「윤인완 글, 양경일 그림」처럼 여럿이 묶여 있어도 된다 */
  text: string | null | undefined;
  className?: string;
}

export default function CreatorNames({ text, className }: CreatorNamesProps) {
  const locale = useLocale();
  const t = useTranslations("shared.content");
  const [openAt, setOpenAt] = useState<{
    key: string;
    anchor: HTMLElement;
    rect: DOMRect;
  } | null>(null);

  const segments = splitCreatorNames(text);
  const matches = useCelebNameMatches(collectCreatorNames(segments), locale);

  if (segments.length === 0) return null;

  const openList = openAt ? matches[openAt.key] : null;

  return (
    <span className={className}>
      {segments.map((segment, index) => {
        const key = segment.name ? normalizeCreatorName(segment.name) : null;
        const found = key ? matches[key] : undefined;

        if (!key || !found) {
          return <span key={index}>{segment.text}</span>;
        }

        const isOpen = openAt?.key === key;
        return (
          <button
            key={index}
            type="button"
            data-inline
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            aria-label={t("celebNameAria", { name: segment.name ?? "" })}
            onClick={(event) =>
              setOpenAt(
                isOpen
                  ? null
                  : {
                      key,
                      anchor: event.currentTarget,
                      rect: event.currentTarget.getBoundingClientRect(),
                    },
              )
            }
            /* data-inline: 인물 상세는 모든 button에 최소 높이 44px을 씌운다(손가락 조작용).
               문장 속 이름은 글줄의 일부라 그 규칙에서 빼야 한다 — 안 빼면 제목 아래 창작자 줄이 넘친다.
               [font:inherit]: 전역 CSS가 button에 serif·bold를 씌워, 두는 대로면 주변 본문과 글꼴이 어긋난다. */
            className="cursor-pointer [font:inherit] underline decoration-dotted decoration-from-font underline-offset-[3px] hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
          >
            {segment.text}
          </button>
        );
      })}

      {openAt && openList && openList.length > 0 && (
        <CelebNameCandidates
          anchor={openAt.anchor}
          anchorRect={openAt.rect}
          matches={openList}
          onClose={() => setOpenAt(null)}
        />
      )}
    </span>
  );
}
