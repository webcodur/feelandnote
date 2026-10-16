"use client";

import { useProfessions } from "@feelandnote/shared/hooks/use-professions";
import { useCallback, useState } from "react";
import { useLocale } from "next-intl";


import CelebProfessionMark from "./CelebProfessionMark";
import Modal, { ModalBody } from "@/components/ui/Modal";

interface ProfessionInfoButtonProps {
  profession: string;
  label: string;
}

export default function ProfessionInfoButton({ profession, label }: ProfessionInfoButtonProps) {
  const { getProfession: getCelebProfession } = useProfessions();
  const locale = useLocale() === "en" ? "en" : "ko";
  const [isOpen, setIsOpen] = useState(false);
  const close = useCallback(() => setIsOpen(false), []);
  const definition = getCelebProfession(profession);
  const description = (locale === "en" ? definition?.description_en : definition?.description) || label;

  return (
    <>
      {/* 모바일은 좁은 메타 줄을 위해 아이콘만 두고, 누르면 설명과 이름을 보여준다. */}
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={label}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        title={label}
        className="inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-md bg-transparent text-inherit hover:bg-white/[0.05] hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        <CelebProfessionMark profession={profession} size={16} />
        <span className="hidden font-normal leading-none md:inline">{label}</span>
      </button>

      <Modal isOpen={isOpen} onClose={close} title={label} size="sm">
        <ModalBody>
          <p className="text-start text-sm leading-relaxed text-text-secondary">{description}</p>
        </ModalBody>
      </Modal>
    </>
  );
}
