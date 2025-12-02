import MainLayout from "@/components/layout/MainLayout";
import { USER_PROFILE } from "@/lib/mock-data";
import { Card, Avatar } from "@/components/ui";

export default function SocialPage() {
  const followers = [
    { id: 1, name: "BookLover99", avatar: "linear-gradient(135deg, #a18cd1, #fbc2eb)" },
    { id: 2, name: "MidnightReader", avatar: "linear-gradient(135deg, #84fab0, #8fd3f4)" },
    { id: 3, name: "GameEnthusiast", avatar: "linear-gradient(135deg, #667eea, #764ba2)" },
  ];

  return (
    <MainLayout>
      <div className="page-container">
        <h1 className="page-title">👥 소셜</h1>
        <p className="page-desc">친구들과 함께 문화생활을 공유하세요</p>

        <Card className="social-profile-card">
          <Avatar size="lg" gradient={USER_PROFILE.avatarColor} className="profile-avatar-large" />
          <h2>{USER_PROFILE.name}</h2>
          <div className="social-stats">
            <div className="social-stat">
              <div className="social-stat-value">152</div>
              <div className="social-stat-label">팔로워</div>
            </div>
            <div className="social-stat">
              <div className="social-stat-value">89</div>
              <div className="social-stat-label">팔로잉</div>
            </div>
          </div>
        </Card>

        <Card style={{ marginTop: "32px" }}>
          <h3>팔로워</h3>
          <div className="follower-list">
            {followers.map((follower) => (
              <div key={follower.id} className="follower-item">
                <Avatar size="md" gradient={follower.avatar} />
                <div className="follower-name">{follower.name}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
