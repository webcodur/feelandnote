"use client";

interface Mode {
  key: string;
  label: string;
}

interface Props {
  /** 탭 id·패널 id의 어군 — 호출부의 useId 값을 넘긴다 */
  id: string;
  ariaLabel: string;
  modes: Mode[];
  active: string;
  onChange: (key: string) => void;
}

/* 인물 모달 「참고도서」의 모드 고름틀과 같은 모양 — 책장의 책 종류를 갈라 세우는 세그먼트 탭.
   WAI-ARIA 탭 패턴: ←→·Home·End로 탭을 오가고 Enter 없이 곧바로 적용한다. */
export default function ShelfModeTabs({ id, ariaLabel, modes, active, onChange }: Props) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="inline-flex rounded-lg border border-white/15 bg-bg-secondary p-1">
      {modes.map((mode, index) => (
        <button key={mode.key} type="button" role="tab" id={`${id}-${mode.key}`}
          aria-selected={active === mode.key} aria-controls={`${id}-panel`} tabIndex={active === mode.key ? 0 : -1}
          onClick={() => onChange(mode.key)}
          onKeyDown={(event) => {
            const direction = { ArrowLeft: -1, ArrowRight: 1, Home: -index, End: modes.length - 1 - index }[event.key];
            if (direction === undefined) return;
            event.preventDefault();
            const next = modes[(index + direction + modes.length) % modes.length].key;
            onChange(next);
            document.getElementById(`${id}-${next}`)?.focus();
          }}
          className={`min-h-10 rounded-md px-4 py-1.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-accent ${active === mode.key ? "bg-accent/15 text-accent hover:bg-accent/25" : "text-text-secondary hover:bg-accent/10 hover:text-accent"}`}>
          {mode.label}
        </button>
      ))}
    </div>
  );
}
