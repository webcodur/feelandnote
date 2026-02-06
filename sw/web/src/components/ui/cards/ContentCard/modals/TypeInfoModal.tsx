/*
  콘텐츠 분류 안내 모달
*/
"use client";

import Modal, { ModalBody } from "@/components/ui/Modal";
import { TYPE_INFO } from "../constants";
import type { ContentType } from "@/types/database";

interface TypeInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentType: ContentType;
}

export default function TypeInfoModal({ isOpen, onClose, currentType }: TypeInfoModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="콘텐츠 분류" size="sm">
      <ModalBody>
        <div className="space-y-1">
          {TYPE_INFO.map(({ type, icon: Icon, label, desc }) => (
            <div
              key={type}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${type === currentType ? "bg-accent/10 border border-accent/30" : ""}`}
            >
              <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${type === currentType ? "bg-accent/20" : "bg-white/5"}`}>
                <Icon size={16} className={type === currentType ? "text-accent" : "text-text-tertiary"} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${type === currentType ? "text-accent" : "text-text-primary"}`}>{label}</p>
                <p className="text-xs text-text-tertiary">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </ModalBody>
    </Modal>
  );
}
