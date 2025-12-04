import { ReactNode, ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

const variantStyles = {
  primary:
    "inline-flex items-center gap-2 bg-accent text-white shadow-lg hover:-translate-y-0.5 hover:shadow-xl hover:bg-accent-hover",
  secondary:
    "inline-flex items-center gap-2 bg-white/5 text-text-primary border border-border hover:bg-white/10 hover:border-accent",
  ghost: "bg-transparent text-text-secondary hover:text-text-primary hover:bg-white/5",
};

const sizeStyles = {
  sm: "py-1.5 px-3 text-[13px]",
  md: "py-2 px-5 text-sm",
  lg: "py-3 px-8 text-base",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`border-none rounded-lg font-semibold cursor-pointer transition-all duration-200 font-sans
        ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
