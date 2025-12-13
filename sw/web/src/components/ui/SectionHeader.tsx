import Link from "next/link";

interface SectionHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  linkText?: string;
  linkHref?: string;
  className?: string;
}

export default function SectionHeader({
  title,
  description,
  icon,
  action,
  linkText,
  linkHref,
  className = "",
}: SectionHeaderProps) {
  return (
    <div className={`flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center ${className}`}>
      <div>
        <h1 className="text-lg md:text-xl font-bold flex items-center gap-1.5">
          {icon && <span className="text-accent">{icon}</span>}
          {title}
        </h1>
        {description && (
          <p className="text-text-secondary text-xs md:text-sm mt-0.5">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
      {!action && linkText && linkHref && (
        <Link
          href={linkHref}
          className="text-accent text-sm font-semibold hover:underline shrink-0"
        >
          {linkText}
        </Link>
      )}
    </div>
  );
}
