interface Props {
  hint: string;
  empty: string;
  reason?: string;
  active: boolean;
}

export default function StatReasonBox({ hint, empty, reason, active }: Props) {
  return (
    <div
      className="flex min-h-16 items-center justify-center rounded-[2px] border border-white/[0.08] bg-black/20 px-3 py-2.5"
      aria-live="polite"
    >
      <p
        className={
          active
            ? "text-center text-sm leading-relaxed text-text-secondary break-keep"
            : "text-center text-sm text-text-secondary/70 break-keep"
        }
      >
        {active ? reason || empty : hint}
      </p>
    </div>
  );
}
