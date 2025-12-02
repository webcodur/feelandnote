import MainLayout from "@/components/layout/MainLayout";
import { USER_STATS } from "@/lib/mock-data";
import { Card } from "@/components/ui";

export default function StatsPage() {
  return (
    <MainLayout>
      <div className="page-container">
        <h1 className="page-title">📈 통계</h1>
        <p className="page-desc">나의 문화생활 통계를 한눈에 확인하세요</p>

        <div className="stats-dashboard">
          {USER_STATS.map((stat, index) => (
            <Card key={index} className="stat-card-large">
              <div className="stat-label-large">{stat.label}</div>
              <div className="stat-value-large">{stat.value}</div>
              <div className="stat-change-large">{stat.change}</div>
            </Card>
          ))}
        </div>

        <Card style={{ marginTop: "32px" }}>
          <h3>월별 활동</h3>
          <p className="text-secondary">차트 및 상세 통계가 여기에 표시됩니다.</p>
        </Card>
      </div>
    </MainLayout>
  );
}
