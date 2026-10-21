"use client";

import { useLayoutEffect, useRef, type ComponentProps } from "react";
import AtlasNavigation from "./AtlasNavigation";

type Props = Pick<ComponentProps<typeof AtlasNavigation>, "tree" | "selection" | "onSelect" | "onOpenPicker" | "myth" | "pending"> & {
  pickerOpen: boolean;
};

/** 긴 모바일 명단 끝에서도 같은 그룹 선택기를 쓰고, 전환 후 새 명단의 시작으로 돌아간다. */
export default function AtlasMemberFooter({ pickerOpen, onSelect, onOpenPicker, ...navigation }: Props) {
  const pendingScroll = useRef(false);
  const groupKey = `${navigation.selection.entryId}:${navigation.selection.groupId}`;
  const previousGroup = useRef(groupKey);
  useLayoutEffect(() => {
    const changed = previousGroup.current !== groupKey;
    previousGroup.current = groupKey;
    if (pendingScroll.current && changed) {
      pendingScroll.current = false;
      const section = document.getElementById("atlas-members");
      section?.scrollIntoView({ block: "start", behavior: "instant" });
      section?.focus({ preventScroll: true });
    } else if (!pickerOpen) {
      // 선택 창을 취소했으면 다음 상단 조작에 하단 이동 의도를 남기지 않는다.
      pendingScroll.current = false;
    }
  }, [groupKey, pickerOpen]);

  return (
    <div data-member-group-footer className="mt-6 md:hidden">
      <AtlasNavigation {...navigation} levels={[2]}
        onSelect={selection => { pendingScroll.current = true; onSelect(selection); }}
        onOpenPicker={level => { pendingScroll.current = true; onOpenPicker(level); }} />
    </div>
  );
}
