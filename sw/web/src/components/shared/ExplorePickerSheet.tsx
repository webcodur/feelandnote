/*
  파일명: /components/shared/ExplorePickerSheet.tsx
  기능: 탐색 도감의 모바일 고르기 — 버튼 하나와 중앙 모달
  책임: 좁은 화면에서 칩 줄을 옆으로 넘기지 않게, 누르면 창 하나에 묶음 제목과 그 아래 항목 칩을 줄바꿈으로 모두 펼친다.
        신화 탐색(지역→신화, 그룹)과 세력도감(섹션→테마, 진영)이 함께 쓴다. 넓은 화면은 각자 칩 줄을 쓴다.
*/ // ------------------------------

"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export interface ExplorePickerItem {
  id: string;
  name: string;
  count?: number;
  /** 있으면 칩이 주소 이동이다. 없으면 onSelect로 넘긴다 */
  href?: string;
  /** 고를 수 없는 항목 — 눌러도 창을 닫지 않고 onDisabledSelect만 부른다 */
  disabled?: boolean;
  /** 칩 끝에 붙는 짧은 표시(작업 예정 등) */
  note?: ReactNode;
}

export interface ExplorePickerGroup {
  id: string;
  /** 묶음 제목 — 비우면 제목 없이 항목만 선다 */
  name?: string;
  items: ExplorePickerItem[];
}

interface ExplorePickerSheetProps {
  /** 버튼에 보일 현재 선택 */
  label: ReactNode;
  /** 창 제목이자 버튼 설명 */
  title: string;
  groups: ExplorePickerGroup[];
  activeItemId: string | null;
  onSelect?: (groupId: string, itemId: string) => void;
  onDisabledSelect?: (itemId: string) => void;
  className?: string;
  wrapLabel?: boolean;
}

const BUTTON =
  "flex w-full min-w-0 items-center justify-between gap-1.5 rounded-lg border border-accent/50 bg-accent/10 px-3.5 py-2 text-sm font-semibold text-accent hover:border-accent";
const CHIP = "flex min-h-10 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-start text-sm font-semibold";
const CHIP_ACTIVE = "border-accent bg-accent/10 text-accent";
const CHIP_IDLE = "border-white/[0.18] bg-white/[0.04] text-text-secondary hover:border-accent/60 hover:text-text-primary";
const CHIP_DISABLED = "cursor-not-allowed border-dashed border-white/[0.1] text-white/35";

export default function ExplorePickerSheet({
  label,
  title,
  groups,
  activeItemId,
  onSelect,
  onDisabledSelect,
  className,
  wrapLabel = false,
}: ExplorePickerSheetProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const listRef = useRef<HTMLDivElement>(null);

  /* 창을 열면 고른 칩이 보이는 자리까지 내려 둔다 — 목록이 길면 고른 칩이 창 아래에 묻힌다 */
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      listRef.current?.querySelector<HTMLElement>("[data-active]")?.scrollIntoView({ block: "center" });
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  return (
    <>
      <button type="button" aria-haspopup="dialog" aria-label={title} onClick={() => setOpen(true)} className={cn(BUTTON, className)}>
        <span className={cn("min-w-0", wrapLabel ? "line-clamp-2 break-keep text-start leading-tight" : "truncate")}>{label}</span>
        <ChevronDown size={15} className="shrink-0" aria-hidden />
      </button>

      <Modal isOpen={open} onClose={close} title={title} animateHeight={false}>
        <div ref={listRef} className="space-y-5 p-4">
          {groups
            .filter((group) => group.items.length > 0)
            .map((group) => (
              <section key={group.id} aria-label={group.name}>
                {group.name && <h3 className="mb-2 text-xs font-bold tracking-wide text-text-secondary">{group.name}</h3>}
                <ul className="flex flex-wrap gap-1.5">
                  {group.items.map((item) => {
                    const active = item.id === activeItemId;
                    const chipClass = cn(CHIP, active ? CHIP_ACTIVE : item.disabled ? CHIP_DISABLED : CHIP_IDLE);
                    const content = (
                      <>
                        <span className="min-w-0">{item.name}</span>
                        {item.count !== undefined && <span className="text-xs font-medium text-text-tertiary">{item.count}</span>}
                        {item.note}
                      </>
                    );
                    return (
                      <li key={item.id}>
                        {item.href && !item.disabled ? (
                          <Link
                            href={item.href}
                            prefetch={false}
                            scroll={false}
                            onClick={close}
                            aria-current={active ? "page" : undefined}
                            data-active={active || undefined}
                            className={chipClass}
                          >
                            {content}
                          </Link>
                        ) : (
                          <button
                            type="button"
                            aria-pressed={active}
                            data-active={active || undefined}
                            onClick={() => {
                              if (item.disabled) {
                                onDisabledSelect?.(item.id);
                                return;
                              }
                              onSelect?.(group.id, item.id);
                              close();
                            }}
                            className={chipClass}
                          >
                            {content}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
        </div>
      </Modal>
    </>
  );
}
