import { cn } from "@/lib/utils";
import styles from "./pending.module.css";

interface Props {
  size?: "sm" | "md";
  className?: string;
}

/** 구획마다 쓰는 작은 대기 표시. 크기나 위치를 흔들지 않고 밝기만 바꾼다. */
export default function PendingMark({ size = "md", className }: Props) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "inline-flex items-center justify-center",
        size === "sm" ? "h-4 gap-1 px-0.5" : "h-6 gap-1.5 px-2",
        className,
      )}
    >
      {[0, 1, 2].map(index => (
        <span key={index} className={cn("rounded-full bg-text-secondary", size === "sm" ? "h-0.5 w-0.5" : "h-1 w-1", styles.dot)} style={{ animationDelay: `${index * 160}ms` }} />
      ))}
    </div>
  );
}
