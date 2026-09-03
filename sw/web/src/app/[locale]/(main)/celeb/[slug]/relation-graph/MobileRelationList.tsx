import Image from "next/image";
import { useMemo } from "react";
import { UserRound } from "lucide-react";

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

  return <div className={styles.root} aria-label={props.label}>
    {sections.map((section) => <section key={section.key} className={styles.section}>
      <h3 className={styles.heading}>{section.label}</h3>
      {/* 두 명씩 한 쪽으로 묶어 옆으로 넘긴다 */}
      <ul className={styles.list}>
        {chunk(section.people, PEOPLE_PER_PAGE).map((page, pageIndex) => <li key={pageIndex} className={styles.page}>
        {page.map((person) => {
          const relation = props.relationLabel(person);
          const portrait = <span className={styles.portrait}>
            {person.avatarUrl
              ? <Image src={person.avatarUrl} alt="" width={112} height={112} unoptimized />
              : <ProfileFallback />}
          </span>;
          const copy = <span className={styles.copy}>
            <strong>{person.name}</strong>
            <span>{relation}</span>
            {person.note ? <small>{person.note}</small> : null}
          </span>;
          // 등록 인물만 진입 버튼을 단다. 데스크톱 인스펙터와 같은 미리보기로 잇는다.
          if (!person.listed || !person.slug) {
            return <div key={person.id} role="listitem" className={styles.person}>
              {portrait}
              {copy}
            </div>;
          }
          return <div key={person.id} role="listitem" className={styles.personAction}>
            <button type="button" className={styles.personGo}
              onClick={() => props.onOpenPerson(person)}
              aria-label={`${props.openLabel}: ${person.name}`}>
              {portrait}
              {copy}
              <UserRound size={20} aria-hidden className={styles.goIcon} />
            </button>
          </div>;
        })}
        </li>)}
      </ul>
    </section>)}
  </div>;
}
