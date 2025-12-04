import { USER_PROFILE } from "@/lib/mock-data";
import { Card, Avatar } from "@/components/ui";
import { Users } from "lucide-react";

export default function SocialPage() {
  const followers = [
    { id: 1, name: "BookLover99", avatar: "linear-gradient(135deg, #a18cd1, #fbc2eb)" },
    { id: 2, name: "MidnightReader", avatar: "linear-gradient(135deg, #84fab0, #8fd3f4)" },
    { id: 3, name: "GameEnthusiast", avatar: "linear-gradient(135deg, #667eea, #764ba2)" },
  ];

  return (
    <>
      <h1 className="text-[28px] font-bold mb-6 flex items-center gap-2">
        <Users size={24} className="text-accent" /> 소셜
      </h1>
      <p className="text-text-secondary mb-6">친구들과 함께 문화생활을 공유하세요</p>

      <Card className="p-12 text-center mt-8">
        <Avatar size="lg" gradient={USER_PROFILE.avatarColor} className="w-[120px] h-[120px] mx-auto mb-6" />
        <h2 className="text-2xl font-bold">{USER_PROFILE.name}</h2>
        <div className="flex justify-center gap-12 mt-6">
          <div className="text-center">
            <div className="text-3xl font-bold mb-1">152</div>
            <div className="text-sm text-text-secondary">팔로워</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold mb-1">89</div>
            <div className="text-sm text-text-secondary">팔로잉</div>
          </div>
        </div>
      </Card>

      <Card className="mt-8">
        <h3 className="font-bold mb-4">팔로워</h3>
        <div className="flex flex-col gap-3">
          {followers.map((follower) => (
            <div
              key={follower.id}
              className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl transition-colors duration-200 hover:bg-white/[0.06]"
            >
              <Avatar size="md" gradient={follower.avatar} />
              <div className="font-semibold">{follower.name}</div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
