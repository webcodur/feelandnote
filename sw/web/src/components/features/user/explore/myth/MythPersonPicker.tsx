"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import type { MythPerson } from "@/actions/home/mythAtlasTypes";
import { useMouseDragScroll } from "@/hooks/useMouseDragScroll";
import { MYTH_LAYOUT as mythLayout } from "./mythLayout";

interface Props {
  people: MythPerson[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/* 인물 줄 — 사진 타일 + 아래 이름. 지역·신화 줄과 같은 결로 제목·넘김 단추 없이 손·마우스로 민다.
   카드 안 텍스트(직함·소개)는 두지 않는다. 이름은 타일 밖 아래 칸에 박는다 */
export default function MythPersonPicker({ people, selectedId, onSelect }: Props) {
  const t = useTranslations("explore.hub.myth");
  /* 조회 차례를 그대로 쓴다. 다시 줄을 세우면 전승 계보 순서가 뒤집힌다 */
  const { ref, cursorClassName, dragProps } = useMouseDragScroll();

  return (
    <div ref={ref} {...dragProps} role="group" aria-label={t("memberList")} className={`${mythLayout.memberList} ${cursorClassName}`}>
      {people.map((person) => {
        const selected = selectedId === person.id;
        /* 목록은 아바타를 쓴다. 차별은 인물을 눌렀을 때 뜨는 상세에서만 둔다 */
        const thumbUrl = person.avatarUrl ?? person.portraitUrl ?? person.imageUrl;
        return (
          <button
            key={person.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(person.id)}
            className={`group flex shrink-0 snap-start flex-col text-center outline-none ${mythLayout.railCardSize}`}
          >
            {/* 브라우저 기본 포커스 테두리 대신 키보드 포커스일 때만 사진 틀을 강조색으로 바꾼다 */}
            <span className={`relative aspect-square w-full overflow-hidden rounded-[14px] border group-focus-visible:border-accent ${selected ? "border-accent shadow-[inset_0_0_0_1px_rgba(217,181,78,.1)]" : "border-white/[0.07] bg-bg-card hover:border-accent/60"}`}>
              {thumbUrl ? (
                <Image src={thumbUrl} alt="" fill unoptimized draggable={false} sizes="(max-width: 767px) 96px, 108px" className="object-cover transition-transform duration-500 group-hover:scale-105" style={{ filter: "none" }} />
              ) : (
                <span aria-hidden className="flex h-full items-center justify-center text-2xl font-black text-accent">{person.name.slice(0, 1)}</span>
              )}
            </span>
            <span className="mt-2 block px-0.5">
              <span className={`block truncate text-[13px] font-bold leading-5 ${selected ? "text-accent" : "text-text-primary group-hover:text-accent"}`}>{person.name}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
