"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Book, Film, Gamepad2, Music, Award, LayoutGrid } from "lucide-react";

const CONTENT_TYPES = [
  { value: "all", label: "전체", icon: LayoutGrid },
  { value: "BOOK", label: "도서", icon: Book },
  { value: "VIDEO", label: "영상", icon: Film },
  { value: "GAME", label: "게임", icon: Gamepad2 },
  { value: "MUSIC", label: "음악", icon: Music },
  { value: "CERTIFICATE", label: "자격증", icon: Award },
] as const;

interface ContentTypeTabsProps {
  onChange?: (type: string) => void;
}

export default function ContentTypeTabs({ onChange }: ContentTypeTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentType = searchParams.get("type") ?? "all";

  const handleTabClick = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("type");
    } else {
      params.set("type", value);
    }
    router.push(`?${params.toString()}`, { scroll: false });
    onChange?.(value);
  };

  return (
    <div className="overflow-x-auto scrollbar-hide px-4">
      <div className="flex gap-2">
        {CONTENT_TYPES.map(({ value, label, icon: Icon }) => {
          const isActive = currentType === value;
          return (
            <button
              key={value}
              onClick={() => handleTabClick(value)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap shrink-0 ${
                isActive
                  ? "bg-accent/10 text-accent"
                  : "bg-white/5 text-text-secondary hover:bg-white/10 hover:text-text-primary"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
