import Image from "next/image";
import { useMemo, useRef } from "react";

import SwipeControls from "@/components/ui/SwipeControls";
import { useSnapActiveHeight } from "@/components/ui/useSnapActiveHeight";
import styles from "./MobileRelationList.module.css";
import type { FocusOption } from "./RelationToolbar";
import type { PersonNode, RelationFocus } from "./types";

interface Props {
  label: string;
  focusOptions: FocusOption[];
  selectedFocus: RelationFocus | null;
  activePeople: PersonNode[];
  relationLabel: (person: PersonNode) => string;
  /** 등록된 인물은 눌러 인물 미리보기(인물 페이지 진입)로 잇는다 */
  onOpenPerson: (person: PersonNode) => void;
  openLabel: string;
}

function ProfileFallback() {
  return <span className={styles.fallback} aria-hidden="true">
    <svg viewBox="0 0 100 100" focusable="false">
      <circle cx="50" cy="34" r="20" />
      <path d="M5 105c2-31 19-49 45-49s43 18 45 49H5Z" />
    </svg>
  </span>;
}

/** 좁은 화면에서 한 쪽에 세우는 인물 수. 세로로 다 훑지 않고 옆으로 넘겨 본다 */
const PEOPLE_PER_PAGE = 2;

/**
 * 관계 갈래에 매기는 색 번호. 가족은 부모·형제·배우자·자녀, 사회는 네 방향으로
 * 각각 네 갈래다. 갈래별 제목을 없앤 대신 이 색이 무슨 관계인지 눈에 먼저 알린다.
 */
const TONE_BY_FOCUS: Record<string, number> = {
  parents: 1, up: 1,
  siblings: 2, left: 2,
  spouses: 3, right: 3,
  children: 4, down: 4,
};

function chunk<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, (i + 1) * size),
  );
}

export default function MobileRelationList(props: Props) {
  const sections = useMemo(() => {
    const activeIds = new Set(props.activePeople.map(({ id }) => id));
    const seen = new Set<string>();
    return props.focusOptions
      .filter(({ key }) => !props.selectedFocus || key === props.selectedFocus)
      .map((option) => ({
        ...option,
        people: option.people.filter(({ id }) => {
          if (!activeIds.has(id) || seen.has(id)) return false;
          seen.add(id);
          return true;
        }),
      }))
      .filter(({ people }) => people.length);
  }, [props.activePeople, props.focusOptions, props.selectedFocus]);

  /* 갈래별 상자를 걷고 인물만 한 줄로 잇는다 — 각 항목이 이미 누구와 어떤 사이인지 말한다 */
  const entries = useMemo(
    () => sections.flatMap((section) =>
      section.people.map((person) => ({ person, tone: TONE_BY_FOCUS[section.key] ?? 0 })),
    ),
    [sections],
  );

  const pages = useMemo(() => chunk(entries, PEOPLE_PER_PAGE), [entries]);

  // 가로로 넘기는 줄은 모든 쪽이 한 줄에 나란히 있어, 줄 자체의 높이는 —
  // align-items를 뭘 주든 — 가장 긴 쪽에 묶인다. 지금 보이는 쪽 높이만 쓰려면
  // 직접 재서 입혀야 한다. 그래서 카드 길이가 쪽마다 달라도 출렁이며 맞는다.
  const listRef = useRef<HTMLUListElement>(null);
  const activeHeight = useSnapActiveHeight(listRef, pages);

  if (entries.length === 0) return null;

  return <div className={styles.root} aria-label={props.label}>
      {/* 두 명씩 한 쪽으로 묶어 옆으로 넘긴다 */}
      <ul ref={listRef} className={styles.list} style={activeHeight ? { height: activeHeight } : undefined}>
        {pages.map((page, pageIndex) => <li key={pageIndex} className={styles.page}>
        {page.map(({ person, tone }) => {
          const relation = props.relationLabel(person);
          // 1열은 사진과 그 아래 관계 유형("영감을 준" 등)을 함께 쥔다
          const portrait = <span className={styles.portraitCol}>
            <span className={styles.portrait}>
              {person.avatarUrl
                ? <Image src={person.avatarUrl} alt="" width={200} height={200} unoptimized />
                : <ProfileFallback />}
            </span>
            <span className={styles.relationTag}>{relation}</span>
          </span>;
          const copy = <span className={styles.copy}>
            <strong>{person.name}</strong>
            {person.note ? <small>{person.note}</small> : null}
          </span>;
          // 등록 인물만 진입 버튼을 단다. 데스크톱 인스펙터와 같은 미리보기로 잇는다.
          if (!person.listed || !person.slug) {
            return <div key={person.id} role="listitem" data-tone={tone} className={styles.person}>
              {portrait}
              {copy}
            </div>;
          }
          return <div key={person.id} role="listitem" data-tone={tone} className={styles.personAction}>
            <button type="button" className={styles.personGo}
              onClick={() => props.onOpenPerson(person)}
              aria-label={`${props.openLabel}: ${person.name}`}>
              {portrait}
              {copy}
            </button>
          </div>;
        })}
        </li>)}
      </ul>
      <SwipeControls count={pages.length} className="pb-3" />
  </div>;
}
