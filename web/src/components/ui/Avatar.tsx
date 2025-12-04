interface AvatarProps {
  size?: "sm" | "md" | "lg";
  gradient?: string;
  className?: string;
}

const sizeStyles = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
};

export default function Avatar({
  size = "md",
  gradient,
  className = "",
}: AvatarProps) {
  return (
    <div
      className={`rounded-full ${sizeStyles[size]} ${className}`}
      style={gradient ? { background: gradient } : { background: "linear-gradient(135deg, #8b5cf6, #ec4899)" }}
    />
  );
}
