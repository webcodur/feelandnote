/*
  파일명: /components/features/archive/contentLibrary/controlBar/components/ControlIconButton.tsx
  기능: 컨트롤 바 아이콘 버튼
  책임: 활성/비활성 스타일을 적용한 아이콘 버튼을 제공한다.
*/ // ------------------------------
import type { LucideIcon } from "lucide-react";
import { IconButton } from "@/components/ui/Button";
import { CONTROL_BUTTON_VARIANTS } from "../constants";

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

interface ControlIconButtonProps {
  active?: boolean;
  onClick: () => void;
  icon: LucideIcon;
  title?: string;
  className?: string;
  size?: number;
}

export default function ControlIconButton({ active, onClick, icon: Icon, title, className, size = 15 }: ControlIconButtonProps) {
  return (
    <IconButton
      icon={Icon}
      size={size}
      active={active}
      onClick={onClick}
      title={title}
      className={cn(active ? CONTROL_BUTTON_VARIANTS.active : CONTROL_BUTTON_VARIANTS.default, className)}
    />
  );
}
