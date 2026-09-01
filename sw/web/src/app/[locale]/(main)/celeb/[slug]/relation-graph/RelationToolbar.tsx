import { memo } from "react";

import styles from "./RelationGraphSection.module.css";
import type { PersonNode, RelationFocus, RelationMode } from "./types";

export interface FocusOption {
  key: RelationFocus;
  label: string;
  people: PersonNode[];
}

interface Props {
  title: string;
  mode: RelationMode;
  socialLabel: string;
  familyLabel: string;
  socialCount: number;
  familyCount: number;
  focusLabel: string;
  focusOptions: FocusOption[];
  selectedFocus: RelationFocus | null;
  onModeChange: (mode: RelationMode) => void;
  onFocusChange: (focus: RelationFocus) => void;
}

function RelationToolbar(props: Props) {
  return <>
    <div className={styles.viewTabs} role="tablist" aria-label={props.title}>
      <button type="button" role="tab" aria-selected={props.mode === "social"} disabled={!props.socialCount}
        onClick={() => props.onModeChange("social")}>
        <span>{props.socialLabel}</span><small>{props.socialCount}</small>
      </button>
      <button type="button" role="tab" aria-selected={props.mode === "family"} disabled={!props.familyCount}
        onClick={() => props.onModeChange("family")}>
        <span>{props.familyLabel}</span><small>{props.familyCount}</small>
      </button>
    </div>
    <div className={styles.relationFilters} role="group" aria-label={props.focusLabel}>
      {props.focusOptions.map((option) => <button key={option.key} type="button" disabled={!option.people.length}
        aria-pressed={props.selectedFocus === option.key} onClick={() => props.onFocusChange(option.key)}>
        {option.label}
      </button>)}
    </div>
  </>;
}

export default memo(RelationToolbar);
