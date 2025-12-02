interface AvatarProps {
  size?: "sm" | "md" | "lg";
  gradient?: string;
  className?: string;
}

export default function Avatar({ size = "md", gradient, className = "" }: AvatarProps) {
  const sizeClass = size === "sm" ? "avatar-sm" : size === "lg" ? "avatar-lg" : "avatar-md";

  return (
    <div
      className={`avatar ${sizeClass} ${className}`}
      style={gradient ? { background: gradient } : undefined}
    ></div>
  );
}
