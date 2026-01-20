import { TITLE_GRADE_CONFIG, type TitleGrade } from "@/constants/titles";

export interface TitleInfo {
  name: string;
  grade: string;
}

interface TitleBadgeProps {
  title: TitleInfo | null;
  size?: "sm" | "md";
}

export default function TitleBadge({ title, size = "sm" }: TitleBadgeProps) {
  if (!title) return null;

  const config = TITLE_GRADE_CONFIG[title.grade as TitleGrade];
  const sizeStyles = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-1",
  };

  return (
    <span className={`${sizeStyles[size]} rounded font-medium ${config?.bgColor || "bg-white/10"} ${config?.color || "text-text-secondary"}`}>
      {title.name}
    </span>
  );
}
