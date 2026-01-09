/*
  파일명: /components/ui/Button.tsx
  기능: 기본 버튼 및 셀렉트 컴포넌트
  책임: variant/size에 따른 스타일을 적용한 버튼과 드롭다운을 제공한다.
*/ // ------------------------------

"use client";

import { ReactNode, ButtonHTMLAttributes, SelectHTMLAttributes } from "react";
import { LucideIcon, ChevronDown } from "lucide-react";
import { useSoundOptional } from "@/contexts/SoundContext";

// #region Base Button
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  unstyled?: boolean;
  noSound?: boolean; // 클릭 사운드 비활성화
}

const variantStyles = {
  primary:
    "inline-flex items-center justify-center gap-2 bg-accent text-white shadow-lg hover:-translate-y-0.5 hover:shadow-xl hover:bg-accent-hover border-none rounded-lg font-semibold",
  secondary:
    "inline-flex items-center justify-center gap-2 bg-white/5 text-text-primary border border-border hover:bg-white/10 hover:border-accent rounded-lg font-semibold",
  ghost:
    "inline-flex items-center justify-center bg-transparent text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-lg",
  danger:
    "inline-flex items-center justify-center gap-2 bg-red-500 text-white shadow-lg hover:-translate-y-0.5 hover:shadow-xl hover:bg-red-600 border-none rounded-lg font-semibold",
};

const sizeStyles = {
  sm: "py-1.5 px-3 text-[13px]",
  md: "py-2 px-5 text-sm",
  lg: "py-3 px-8 text-base",
};

export default function Button({
  children,
  variant,
  size,
  className = "",
  disabled,
  unstyled,
  noSound = false,
  onClick,
  ...props
}: ButtonProps) {
  const { playSound } = useSoundOptional();
  const disabledStyles = disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer";

  // unstyled가 true이면 기본 스타일을 적용하지 않음
  const variantStyle = !unstyled && variant ? variantStyles[variant] : "";
  const sizeStyle = !unstyled && size ? sizeStyles[size] : "";

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!noSound) playSound("click");
    onClick?.(e);
  };

  return (
    <button
      className={`${disabledStyles} ${variantStyle} ${sizeStyle} ${className}`}
      disabled={disabled}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}
// #endregion

// #region IconButton
interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  size?: number;
  active?: boolean;
  noSound?: boolean;
}

export function IconButton({
  icon: Icon,
  size = 16,
  active = false,
  className = "",
  disabled,
  noSound = false,
  onClick,
  ...props
}: IconButtonProps) {
  const { playSound } = useSoundOptional();
  const disabledStyles = disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer";

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!noSound) playSound("click");
    onClick?.(e);
  };

  return (
    <button
      className={`flex items-center justify-center rounded-lg ${disabledStyles} ${className}`}
      disabled={disabled}
      onClick={handleClick}
      {...props}
    >
      <Icon size={size} strokeWidth={active ? 2.5 : 2} />
    </button>
  );
}
// #endregion

// #region SelectDropdown
interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface SelectDropdownProps<T extends string> extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "size"> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  icon?: LucideIcon;
  placeholder?: string;
}

export function SelectDropdown<T extends string>({
  value,
  onChange,
  options,
  icon: Icon,
  placeholder,
  className = "",
  disabled,
  ...props
}: SelectDropdownProps<T>) {
  const selectedLabel = options.find((o) => o.value === value)?.label ?? placeholder ?? "";

  return (
    <div className={`relative group ${className}`}>
      <select
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        disabled={disabled}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <div
        className={`
          flex items-center gap-2 px-3 h-8 rounded-lg text-sm font-medium pointer-events-none border border-transparent
          bg-surface text-text-secondary group-hover:bg-surface-hover group-hover:text-text-primary
          ${disabled ? "opacity-50" : ""}
        `}
      >
        {Icon && <Icon size={14} className="flex-shrink-0 opacity-70" />}
        <span className="truncate flex-1">{selectedLabel}</span>
        <ChevronDown size={14} className="flex-shrink-0 opacity-50 group-hover:opacity-80" />
      </div>
    </div>
  );
}
// #endregion
