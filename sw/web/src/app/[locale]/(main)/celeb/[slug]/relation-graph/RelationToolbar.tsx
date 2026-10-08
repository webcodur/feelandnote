import { memo } from "react";

import styles from "./RelationGraphSection.module.css";
import type { PersonNode, RelationFocus } from "./types";

export interface FocusOption {
  key: RelationFocus;
  label: string;
  people: PersonNode[];
}

interface Props {
  focusLabel: string;
  focusOptions: FocusOption[];
  selectedFocus: RelationFocus | null;
  onFocusChange: (focus: RelationFocus) => void;
}

function RelationToolbar(props: Props) {
  return <>
    {/* 고를 갈래가 하나뿐이면 거르는 뜻이 없다 — 탭 이름을 한 번 더 적는 줄이 될 뿐이라 걷는다 */}
    {props.focusOptions.length > 1 && <div className={styles.relationFilters} role="group" aria-label={props.focusLabel}>
      {props.focusOptions.map((option) => <button key={option.key} type="button" disabled={!option.people.length}
        aria-pressed={props.selectedFocus === option.key} onClick={() => props.onFocusChange(option.key)}>
        {option.label}
      </button>)}
    </div>}
  </>;
}

export default memo(RelationToolbar);
