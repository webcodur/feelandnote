import { Card } from "@/components/ui";

interface StatsCardProps {
  label: string;
  value: string;
  change: string;
}

export default function StatsCard({ label, value, change }: StatsCardProps) {
  return (
    <Card className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-change">{change}</div>
    </Card>
  );
}
