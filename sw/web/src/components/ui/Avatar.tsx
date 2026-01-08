/*
  파일명: /components/ui/Avatar.tsx
  기능: 아바타 컴포넌트
  책임: 사용자 프로필 이미지를 원형으로 표시한다.
*/ // ------------------------------

import { BadgeCheck } from "lucide-react";

interface AvatarProps {
  url?: string | null;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
  gradient?: string;
  verified?: boolean;
  className?: string;
}

const sizeStyles = {
  sm: { container: "w-8 h-8", text: "text-xs", badge: "w-3 h-3" },
  md: { container: "w-10 h-10", text: "text-sm", badge: "w-3.5 h-3.5" },
  lg: { container: "w-14 h-14", text: "text-xl", badge: "w-4 h-4" },
  xl: { container: "w-16 h-16", text: "text-2xl", badge: "w-5 h-5" },
};

const defaultGradient = "linear-gradient(135deg, #8b5cf6, #ec4899)";

export default function Avatar({ url, name, size = "md", gradient, verified, className = "" }: AvatarProps) {
  const styles = sizeStyles[size];
  const initial = name?.charAt(0).toUpperCase() || "?";
  const bg = gradient || defaultGradient;

  return (
    <div className="relative inline-block">
      {url ? (
        <img
          src={url}
          alt={name || "avatar"}
          className={`${styles.container} rounded-full object-cover ring-2 ring-accent/20 ${className}`}
        />
      ) : (
        <div
          className={`${styles.container} rounded-full flex items-center justify-center font-bold text-white ring-2 ring-accent/20 ${styles.text} ${className}`}
          style={{ background: bg }}
        >
          {initial}
        </div>
      )}
      {verified && (
        <BadgeCheck
          className={`absolute -bottom-0.5 -right-0.5 ${styles.badge} text-blue-500 fill-white`}
        />
      )}
    </div>
  );
}
