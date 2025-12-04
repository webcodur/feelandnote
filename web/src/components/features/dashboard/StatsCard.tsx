import { USER_STATS } from "@/lib/mock-data";

export default function StatsCard() {
  return (
    <div className="flex gap-6">
      {USER_STATS.map((stat, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className="text-xl font-bold">{stat.value}</div>
          <div className="text-xs text-text-secondary">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
