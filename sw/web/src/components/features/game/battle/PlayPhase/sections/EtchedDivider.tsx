/*
  에칭 구분선
*/
export default function EtchedDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`w-full flex items-center gap-3 ${className}`}>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      <div className="w-1 h-1 rounded-full bg-white/15" />
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
    </div>
  );
}
