/*
  파일명: /app/(policy)/about/InfoPeek.tsx
  기능: 소개 페이지 예시 그림을 눌렀을 때 뜨는 짧은 안내
  책임: 그림을 누른 사람을 다른 화면으로 보내지 않고, 이게 누구/무엇인지만 그 자리에서 알려 준다.
*/ // ------------------------------

"use client";

import { useState, type ReactNode } from "react";
import Modal, { ModalBody } from "@/components/ui/Modal";
import type { AboutInfo } from "@/actions/policy/getAboutShowcase";

interface Props {
  info: AboutInfo;
  className?: string;
  children: ReactNode;
}

export default function InfoPeek({ info, className, children }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={info.heading}
        className={`text-left cursor-pointer ${className ?? ""}`}
      >
        {children}
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={info.heading} size="sm">
        <ModalBody className="py-4 px-4 space-y-3">
          {info.subheading && (
            <p className="text-sm text-accent-primary">{info.subheading}</p>
          )}
          {info.facts.length > 0 && (
            <p className="text-xs text-text-secondary">{info.facts.join(" · ")}</p>
          )}
          {info.body && (
            <p className="text-[13px] leading-relaxed text-text-secondary">{info.body}</p>
          )}
        </ModalBody>
      </Modal>
    </>
  );
}
