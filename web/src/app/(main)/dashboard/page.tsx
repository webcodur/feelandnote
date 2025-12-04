import StatsCard from "@/components/features/dashboard/StatsCard";
import ContinueReading from "@/components/features/dashboard/ContinueReading";
import FeedSection from "@/components/features/dashboard/FeedSection";
import CreationSection from "@/components/features/dashboard/CreationSection";
import { USER_PROFILE } from "@/lib/mock-data";

export default function DashboardPage() {
  return (
    <>
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold mb-1">{USER_PROFILE.name}님, 환영합니다!</h1>
          <p className="text-text-secondary text-[15px]">오늘도 즐거운 문화생활 되세요.</p>
        </div>
        <StatsCard />
      </div>

      <ContinueReading />
      <CreationSection />
      <FeedSection />
    </>
  );
}
