import { memo } from "react";

import styles from "./RelationGraphSection.module.css";
import type { PersonNode, RelationFocus, RelationMode } from "./types";

export interface FocusOption {
  key: RelationFocus;
  label: string;
  people: PersonNode[];
}

export interface ModeTab {
  key: RelationMode;
  label: string;
  count: number;
}

interface Props {
  title: string;
  mode: RelationMode;
  /** 가족·사회·기타 순. 인물이 하나도 없는 갈래는 눌리지 않는다 */
  modeTabs: ModeTab[];
  focusLabel: string;
  focusOptions: FocusOption[];
  selectedFocus: RelationFocus | null;
  onModeChange: (mode: RelationMode) => void;
  onFocusChange: (focus: RelationFocus) => void;
}

function RelationToolbar(props: Props) {
  return <>
    <div className={styles.viewTabs} role="tablist" aria-label={props.title}>
      {props.modeTabs.map((tab) => <button key={tab.key} type="button" role="tab"
        aria-selected={props.mode === tab.key} disabled={!tab.count}
        onClick={() => props.onModeChange(tab.key)}>
        <span>{tab.label}</span><small>{tab.count}</small>
      </button>)}
    </div>
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
