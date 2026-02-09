/*
  파일명: /components/ui/Avatar.tsx
  기능: 아바타 컴포넌트
  책임: 사용자 프로필 이미지를 원형으로 표시한다.
*/ // ------------------------------

import Image from "next/image";
import { BadgeCheck } from "lucide-react";

interface AvatarProps {
  url?: string | null;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
  gradient?: string;
  verified?: boolean;
  className?: string;
  priority?: boolean;
}

const sizeStyles = {
  sm: { container: "w-8 h-8", pixels: 32, text: "text-xs", badge: "w-3 h-3" },
  md: { container: "w-10 h-10", pixels: 40, text: "text-sm", badge: "w-3.5 h-3.5" },
  lg: { container: "w-14 h-14", pixels: 56, text: "text-xl", badge: "w-4 h-4" },
  xl: { container: "w-16 h-16", pixels: 64, text: "text-2xl", badge: "w-5 h-5" },
  "2xl": { container: "w-[100px] h-[100px]", pixels: 100, text: "text-3xl", badge: "w-5 h-5" },
  "3xl": { container: "w-[100px] h-[100px]", pixels: 100, text: "text-4xl", badge: "w-6 h-6" },
};

const defaultGradient = "linear-gradient(135deg, #8b5cf6, #ec4899)";

export default function Avatar({ url, name, size = "md", gradient, verified, className = "", priority = false }: AvatarProps) {
  const styles = sizeStyles[size];
  const initial = name?.charAt(0).toUpperCase() || "?";
  const bg = gradient || defaultGradient;

  return (
    <div className="relative inline-block">
      {url ? (
        <Image
          src={url}
          alt={name || "avatar"}
          width={styles.pixels}
          height={styles.pixels}
          className={`${styles.container} rounded-full object-cover ring-2 ring-accent/20 transition-all duration-300 ${className}`}
          unoptimized={!url.includes('supabase.co')}
          priority={priority}
        />
      ) : (
        <div
          className={`${styles.container} rounded-full flex items-center justify-center font-bold text-white ring-2 ring-accent/20 transition-all duration-300 ${styles.text} ${className}`}
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
