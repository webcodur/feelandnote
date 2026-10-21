"use client";

import { useLayoutEffect, useRef } from "react";
import AtlasMemberControls from "./AtlasMemberControls";

interface Props {
  groupKey: string;
  open: boolean;
  onStep: (direction: number) => void;
  onOpen: () => void;
}

export default function AtlasMemberFooter({ groupKey, open, onStep, onOpen }: Props) {
  const pendingScroll = useRef(false);
  useLayoutEffect(() => {
    if (!pendingScroll.current) return;
    pendingScroll.current = false;
    const section = document.getElementById("atlas-members");
    section?.scrollIntoView({ block: "start", behavior: "instant" });
    section?.focus({ preventScroll: true });
  }, [groupKey]);

  return (
    <div data-member-group-footer className="mt-6 flex justify-center md:mt-7">
      <AtlasMemberControls open={open} onOpen={onOpen} onStep={direction => {
        pendingScroll.current = true;
        onStep(direction);
      }} />
    </div>
  );
}
