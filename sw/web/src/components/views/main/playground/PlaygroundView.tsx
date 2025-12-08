"use client";

import { useState } from "react";
import { Button, Tabs, Tab, Badge, Avatar, Card } from "@/components/ui";
import CreateTierListModal from "@/components/features/playground/CreateTierListModal";
import { Plus, GitFork, Heart, Flame, Sparkles, Users, User } from "lucide-react";

export default function PlaygroundView() {
  const [activeTab, setActiveTab] = useState("trending");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <>
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-[28px] font-bold mb-2">티어리스트</h1>
          <p className="text-text-secondary text-[15px]">다른 유저들의 티어리스트를 구경하고, 나만의 랭킹을 만들어보세요</p>
        </div>
        <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
          <Plus size={16} /> 새 리스트 만들기
        </Button>
      </div>

      <CreateTierListModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />

      <Tabs className="mb-6">
        <Tab label={<><Flame size={14} /> 트렌딩</>} active={activeTab === "trending"} onClick={() => setActiveTab("trending")} />
        <Tab label={<><Sparkles size={14} /> 최신</>} active={activeTab === "latest"} onClick={() => setActiveTab("latest")} />
        <Tab label={<><Users size={14} /> 팔로잉</>} active={activeTab === "following"} onClick={() => setActiveTab("following")} />
        <Tab label={<><User size={14} /> 내 티어리스트</>} active={activeTab === "my"} onClick={() => setActiveTab("my")} />
      </Tabs>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
        {[
          {
            title: "2023년 최고의 SF 영화 결산",
            user: "SciFiLover",
            avatar: "linear-gradient(135deg, #7c4dff, #ff4d4d)",
            category: "영화",
            forks: "1,203",
            likes: "3.4k",
            tiers: [
              { label: "S", color: "#ffd700", items: ["#ff9a9e", "#a18cd1", "#84fab0"] },
              { label: "A", color: "#b57cff", items: ["#fbc2eb", "#8fd3f4"] },
              { label: "B", color: "#4d9fff", items: ["#a6c0fe"] },
            ],
          },
          {
            title: "내 인생의 판타지 소설 Top 50",
            user: "BookWorm",
            avatar: "linear-gradient(135deg, #84fab0, #8fd3f4)",
            category: "도서",
            forks: "856",
            likes: "2.1k",
            tiers: [
              { label: "S", color: "#ffd700", items: ["#ffecd2", "#fcb69f"] },
              { label: "A", color: "#b57cff", items: ["#ff9a9e", "#fecfef", "#a18cd1"] },
            ],
          },
          {
            title: "지브리 영화 음식 비주얼 티어",
            user: "GhibliFan",
            avatar: "linear-gradient(135deg, #fa709a, #fee140)",
            category: "애니메이션",
            forks: "3,420",
            likes: "8.9k",
            tiers: [
              { label: "S", color: "#ffd700", items: ["#f093fb"] },
              { label: "A", color: "#b57cff", items: ["#f5576c", "#4facfe"] },
              { label: "B", color: "#4d9fff", items: ["#00f2fe"] },
            ],
          },
          {
            title: "2024 1분기 신작 드라마 평가",
            user: "DramaQueen",
            avatar: "linear-gradient(135deg, #30cfd0, #330867)",
            category: "드라마",
            forks: "420",
            likes: "1.2k",
            tiers: [
              { label: "S", color: "#ffd700", items: ["#43e97b", "#38f9d7"] },
              { label: "A", color: "#b57cff", items: ["#fa8bff"] },
            ],
          },
        ].map((card, idx) => (
          <Card key={idx} hover className="p-0 overflow-hidden">
            <div className="h-40 bg-[#2a2f38] p-3 flex flex-col gap-1">
              {card.tiers.map((tier, i) => (
                <div key={i} className="flex h-6 gap-1">
                  <div
                    className="w-6 rounded flex items-center justify-center text-[10px] font-bold text-black"
                    style={{ background: tier.color }}
                  >
                    {tier.label}
                  </div>
                  <div className="flex-1 bg-white/5 rounded flex gap-0.5 p-0.5">
                    {tier.items.map((itemColor, j) => (
                      <div key={j} className="w-4 h-5 rounded-sm" style={{ background: itemColor }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4">
              <div className="text-base font-bold mb-2 leading-snug">{card.title}</div>
              <div className="flex items-center gap-2 mb-3">
                <Avatar size="sm" gradient={card.avatar} />
                <span className="text-sm text-text-secondary">{card.user}</span>
                <Badge variant="default">{card.category}</Badge>
              </div>
              <div className="flex gap-4 text-xs text-text-secondary border-t border-white/5 pt-3">
                <div className="flex items-center gap-1">
                  <GitFork size={14} />
                  <span className="font-bold">{card.forks}</span>
                  <span>Forks</span>
                </div>
                <div className="flex items-center gap-1">
                  <Heart size={14} />
                  <span className="font-bold">{card.likes}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
