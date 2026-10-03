"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import type { CelebReality } from "@feelandnote/shared/constants/celeb-tiers";
import Modal from "@/components/ui/Modal";
import { Z_INDEX } from "@/constants/zIndex";

interface Props {
  reality?: CelebReality | null;
  id?: string;
  className?: string;
  /** 인물 선택 버튼 안에서는 설명 버튼을 중첩하지 않는다. */
  interactive?: boolean;
}

export default function CelebRealityLabel({ reality, id, className, interactive = true }: Props) {
  const t = useTranslations("celebPage");
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  if (!reality || reality === "REAL") return null;
  const label = reality === "BOTH" ? t("realityChipComposite") : t("realityChipFiction");
  const styles = className ?? (reality === "BOTH"
    ? "inline-flex min-h-8 shrink-0 items-center whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium leading-none text-text-secondary"
    : "inline-flex shrink-0 items-center whitespace-nowrap rounded-md border border-accent/40 bg-bg-main/95 px-2 py-1 text-xs font-semibold leading-none text-accent");
  const canExplain = reality === "BOTH" && interactive;
  return (
    <>
      {canExplain && (
        <button id={id} type="button" data-celeb-reality={reality} aria-haspopup="dialog" aria-expanded={open}
          aria-label={t("realityCompositeExplain")} title={t("realityCompositeExplain")}
          onClick={event => { event.preventDefault(); event.stopPropagation(); setOpen(true); }}
          className={`${styles} hover:bg-white/10 hover:text-accent outline-none focus-visible:ring-2 focus-visible:ring-accent`}>
          {label}
        </button>
      )}
      {!canExplain && <span id={id} data-celeb-reality={reality} className={styles}>{label}</span>}
      {open && (
        <Modal isOpen onClose={close} title={t("realityCompositeTitle")} titleClassName="text-center" size="sm" zIndex={Z_INDEX.modal + 1} escapeCapture>
          <div className="space-y-4 p-5 text-sm leading-7 text-text-primary">
            {t("realityCompositeDescription").split("\n\n").map(paragraph => <p key={paragraph}>{paragraph}</p>)}
          </div>
        </Modal>
      )}
    </>
  );
}
