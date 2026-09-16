"use client";

import { X } from "lucide-react";

import type { CelebTimelineEvent } from "@/actions/celebs/getCelebTimelineEvents";
import Modal from "@/components/ui/Modal";
import JourneyEventExpandedList from "./JourneyEventExpandedList";

interface Props {
  open: boolean;
  events: CelebTimelineEvent[];
  title: string;
  closeLabel: string;
  onClose: () => void;
}

export default function JourneyTimelineModal({
  open,
  events,
  title,
  closeLabel,
  onClose,
}: Props) {
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      frame="plain"
      widthClassName="max-w-4xl"
      overlayClassName="bg-black/80"
      boxClassName="rounded-xl border border-accent-dim/30 bg-bg-main shadow-2xl shadow-black/70"
      showCloseButton={false}
      animateHeight={false}
    >
      <div className="flex h-[calc(100dvh-4rem)] flex-col" data-timeline-modal>
        <header className="relative flex h-12 shrink-0 items-center justify-center border-b border-white/10 bg-bg-main/95 px-12 backdrop-blur-md">
          <h2
            id="timeline-modal-title"
            className="truncate text-base font-bold text-text-primary sm:text-lg"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            title={closeLabel}
            className="absolute right-3 flex size-8 cursor-pointer items-center justify-center rounded-full border border-white/15 text-text-secondary hover:border-accent hover:text-accent"
          >
            <X size={18} aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar px-4 py-4 md:px-6 md:py-6">
          <JourneyEventExpandedList events={events} fullPage />
        </div>
      </div>
    </Modal>
  );
}
