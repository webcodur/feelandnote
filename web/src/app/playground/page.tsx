"use client";

import { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Button, Tabs, Tab, Badge, Avatar, Card } from "@/components/ui";
import { Plus, GitFork, Heart } from "lucide-react";

export default function PlaygroundPage() {
  const [activeTab, setActiveTab] = useState("trending");

  return (
    <MainLayout>
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">티어리스트</h1>
            <p className="page-subtitle">다른 유저들의 티어리스트를 구경하고, 나만의 랭킹을 만들어보세요</p>
          </div>
          <Button variant="primary">
            <Plus size={16} style={{ marginRight: "8px" }} /> 새 리스트 만들기
          </Button>
        </div>

        <Tabs className="view-tabs">
          <Tab label="🔥 트렌딩" active={activeTab === "trending"} onClick={() => setActiveTab("trending")} />
          <Tab label="✨ 최신" active={activeTab === "latest"} onClick={() => setActiveTab("latest")} />
          <Tab label="👥 팔로잉" active={activeTab === "following"} onClick={() => setActiveTab("following")} />
          <Tab label="👤 내 티어리스트" active={activeTab === "my"} onClick={() => setActiveTab("my")} />
        </Tabs>

        <div className="tier-grid">
          {/* Card 1 */}
          <Card hover className="tier-card">
            <div className="tier-preview">
              <div className="mini-tier-row">
                <div className="mini-tier-label" style={{ background: "#ffd700" }}>S</div>
                <div className="mini-tier-items">
                  <div className="mini-item" style={{ background: "#ff9a9e" }}></div>
                  <div className="mini-item" style={{ background: "#a18cd1" }}></div>
                  <div className="mini-item" style={{ background: "#84fab0" }}></div>
                </div>
              </div>
              <div className="mini-tier-row">
                <div className="mini-tier-label" style={{ background: "#b57cff", color: "white" }}>A</div>
                <div className="mini-tier-items">
                  <div className="mini-item" style={{ background: "#fbc2eb" }}></div>
                  <div className="mini-item" style={{ background: "#8fd3f4" }}></div>
                </div>
              </div>
              <div className="mini-tier-row">
                <div className="mini-tier-label" style={{ background: "#4d9fff", color: "white" }}>B</div>
                <div className="mini-tier-items">
                  <div className="mini-item" style={{ background: "#a6c0fe" }}></div>
                </div>
              </div>
            </div>
            <div className="tier-info">
              <div className="tier-title">2023년 최고의 SF 영화 결산</div>
              <div className="tier-meta">
                <Avatar size="sm" gradient="linear-gradient(135deg, #7c4dff, #ff4d4d)" />
                <span className="user-name-small">SciFiLover</span>
                <Badge variant="default">영화</Badge>
              </div>
              <div className="tier-stats">
                <div className="stat-item">
                  <GitFork size={14} />
                  <span className="stat-value">1,203</span>
                  <span>Forks</span>
                </div>
                <div className="stat-item">
                  <Heart size={14} />
                  <span className="stat-value">3.4k</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Card 2 */}
          <Card hover className="tier-card">
            <div className="tier-preview">
              <div className="mini-tier-row">
                <div className="mini-tier-label" style={{ background: "#ffd700" }}>S</div>
                <div className="mini-tier-items">
                  <div className="mini-item" style={{ background: "#ffecd2" }}></div>
                  <div className="mini-item" style={{ background: "#fcb69f" }}></div>
                </div>
              </div>
              <div className="mini-tier-row">
                <div className="mini-tier-label" style={{ background: "#b57cff", color: "white" }}>A</div>
                <div className="mini-tier-items">
                  <div className="mini-item" style={{ background: "#ff9a9e" }}></div>
                  <div className="mini-item" style={{ background: "#fecfef" }}></div>
                  <div className="mini-item" style={{ background: "#a18cd1" }}></div>
                </div>
              </div>
            </div>
            <div className="tier-info">
              <div className="tier-title">내 인생의 판타지 소설 Top 50</div>
              <div className="tier-meta">
                <Avatar size="sm" gradient="linear-gradient(135deg, #84fab0, #8fd3f4)" />
                <span className="user-name-small">BookWorm</span>
                <Badge variant="default">도서</Badge>
              </div>
              <div className="tier-stats">
                <div className="stat-item">
                  <GitFork size={14} />
                  <span className="stat-value">856</span>
                  <span>Forks</span>
                </div>
                <div className="stat-item">
                  <Heart size={14} />
                  <span className="stat-value">2.1k</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Card 3 */}
          <Card hover className="tier-card">
            <div className="tier-preview">
              <div className="mini-tier-row">
                <div className="mini-tier-label" style={{ background: "#ffd700" }}>S</div>
                <div className="mini-tier-items">
                  <div className="mini-item" style={{ background: "#f093fb" }}></div>
                </div>
              </div>
              <div className="mini-tier-row">
                <div className="mini-tier-label" style={{ background: "#b57cff", color: "white" }}>A</div>
                <div className="mini-tier-items">
                  <div className="mini-item" style={{ background: "#f5576c" }}></div>
                  <div className="mini-item" style={{ background: "#4facfe" }}></div>
                </div>
              </div>
              <div className="mini-tier-row">
                <div className="mini-tier-label" style={{ background: "#4d9fff", color: "white" }}>B</div>
                <div className="mini-tier-items">
                  <div className="mini-item" style={{ background: "#00f2fe" }}></div>
                </div>
              </div>
            </div>
            <div className="tier-info">
              <div className="tier-title">지브리 영화 음식 비주얼 티어</div>
              <div className="tier-meta">
                <Avatar size="sm" gradient="linear-gradient(135deg, #fa709a, #fee140)" />
                <span className="user-name-small">GhibliFan</span>
                <Badge variant="default">애니메이션</Badge>
              </div>
              <div className="tier-stats">
                <div className="stat-item">
                  <GitFork size={14} />
                  <span className="stat-value">3,420</span>
                  <span>Forks</span>
                </div>
                <div className="stat-item">
                  <Heart size={14} />
                  <span className="stat-value">8.9k</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Card 4 */}
          <Card hover className="tier-card">
            <div className="tier-preview">
              <div className="mini-tier-row">
                <div className="mini-tier-label" style={{ background: "#ffd700" }}>S</div>
                <div className="mini-tier-items">
                  <div className="mini-item" style={{ background: "#43e97b" }}></div>
                  <div className="mini-item" style={{ background: "#38f9d7" }}></div>
                </div>
              </div>
              <div className="mini-tier-row">
                <div className="mini-tier-label" style={{ background: "#b57cff", color: "white" }}>A</div>
                <div className="mini-tier-items">
                  <div className="mini-item" style={{ background: "#fa8bff" }}></div>
                </div>
              </div>
            </div>
            <div className="tier-info">
              <div className="tier-title">2024 1분기 신작 드라마 평가</div>
              <div className="tier-meta">
                <Avatar size="sm" gradient="linear-gradient(135deg, #30cfd0, #330867)" />
                <span className="user-name-small">DramaQueen</span>
                <Badge variant="default">드라마</Badge>
              </div>
              <div className="tier-stats">
                <div className="stat-item">
                  <GitFork size={14} />
                  <span className="stat-value">420</span>
                  <span>Forks</span>
                </div>
                <div className="stat-item">
                  <Heart size={14} />
                  <span className="stat-value">1.2k</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
