import { ChevronRight } from "lucide-react";
import Image from "next/image";
import { useMemo } from "react";

import styles from "./MobileRelationList.module.css";
import type { FocusOption } from "./RelationToolbar";
import type { PersonNode, RelationFocus } from "./types";

interface Props {
  label: string;
  focusOptions: FocusOption[];
  selectedFocus: RelationFocus | null;
  activePeople: PersonNode[];
  selectedId: string | null;
  relationLabel: (person: PersonNode) => string;
  onSelect: (person: PersonNode) => void;
}

function ProfileFallback() {
  return <span className={styles.fallback} aria-hidden="true">
    <svg viewBox="0 0 100 100" focusable="false">
      <circle cx="50" cy="34" r="20" />
      <path d="M5 105c2-31 19-49 45-49s43 18 45 49H5Z" />
    </svg>
  </span>;
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
      <ul className={styles.list}>
        {section.people.map((person) => {
          const relation = props.relationLabel(person);
          return <li key={person.id}>
            <button type="button" className={styles.person}
              aria-pressed={props.selectedId === person.id}
              aria-label={`${person.name}, ${relation}`}
              onClick={() => props.onSelect(person)}>
              <span className={styles.portrait}>
                {person.avatarUrl
                  ? <Image src={person.avatarUrl} alt="" width={112} height={112} unoptimized />
                  : <ProfileFallback />}
              </span>
              <span className={styles.copy}>
                <strong>{person.name}</strong>
                <span>{relation}</span>
                {person.note ? <small>{person.note}</small> : null}
              </span>
              <ChevronRight className={styles.chevron} aria-hidden="true" />
            </button>
          </li>;
        })}
      </ul>
    </section>)}
  </div>;
}
