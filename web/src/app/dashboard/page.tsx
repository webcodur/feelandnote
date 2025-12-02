import MainLayout from "@/components/layout/MainLayout";
import StatsCard from "@/components/features/dashboard/StatsCard";
import ContinueReading from "@/components/features/dashboard/ContinueReading";
import FeedSection from "@/components/features/dashboard/FeedSection";
import CreationSection from "@/components/features/dashboard/CreationSection";
import { USER_PROFILE } from "@/lib/mock-data";

export default function DashboardPage() {
  return (
    <MainLayout>
      <div className="welcome-section">
        <h1 className="welcome-title">{USER_PROFILE.name}님, 환영합니다!</h1>
        <p className="welcome-subtitle">오늘도 즐거운 문화생활 되세요.</p>
      </div>

      <div className="dashboard-grid-new">
        <div className="dashboard-main">
          <ContinueReading />
        </div>
        <div className="dashboard-aside">
          <StatsCard />
        </div>
      </div>

      <CreationSection />
      <FeedSection />
    </MainLayout>
  );
}
