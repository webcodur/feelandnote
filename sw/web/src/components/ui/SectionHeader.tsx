import Link from "next/link";

interface SectionHeaderProps {
  title: string;
  icon?: React.ReactNode;
  linkText?: string;
  linkHref?: string;
  className?: string;
}

export default function SectionHeader({
  title,
  icon,
  linkText,
  linkHref,
  className = "",
}: SectionHeaderProps) {
  return (
    <div className={`flex justify-between items-center mb-6 ${className}`}>
      <h2 className="text-[28px] font-bold flex items-center gap-2">
        {icon && <span className="text-accent">{icon}</span>}
        {title}
      </h2>
      {linkText && linkHref && (
        <Link
          href={linkHref}
          className="text-accent text-sm font-semibold hover:underline"
        >
          {linkText}
        </Link>
      )}
    </div>
  );
}
