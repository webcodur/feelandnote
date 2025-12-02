"use client";

import { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Button, Tabs, Tab, Badge, Avatar, Card } from "@/components/ui";
import { Plus, Quote, Gamepad2 } from "lucide-react";

export default function BlindGamePage() {
  const [activeTab, setActiveTab] = useState("popular");

  return (
    <MainLayout>
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">블라인드 게임</h1>
            <p className="page-subtitle">감상평만 보고 작품을 맞추는 퀴즈에 도전하세요</p>
          </div>
          <Button variant="primary">
            <Plus size={16} style={{ marginRight: "8px" }} /> 새 문제 출제
          </Button>
        </div>

        <Tabs className="view-tabs">
          <Tab label="🔥 인기 퀴즈" active={activeTab === "popular"} onClick={() => setActiveTab("popular")} />
          <Tab label="✨ 최신" active={activeTab === "latest"} onClick={() => setActiveTab("latest")} />
          <Tab label="👥 팔로잉" active={activeTab === "following"} onClick={() => setActiveTab("following")} />
          <Tab label="👤 내 문제" active={activeTab === "my"} onClick={() => setActiveTab("my")} />
        </Tabs>

        <div className="game-grid">
          {/* Card 1 */}
          <Card hover className="game-card">
            <div className="game-preview">
              <Quote className="quote-icon" />
              <div className="preview-text">
                "이 작품은 내 인생을 바꿨다. 처음 읽었을 때의 충격은 아직도 생생하다. 주인공의 선택 하나하나가 너무나 공감되었고..."
              </div>
            </div>
            <div className="game-info">
              <div className="game-title">인생을 바꾼 그 소설</div>
              <div className="game-meta">
                <Avatar size="sm" gradient="linear-gradient(135deg, #7c4dff, #ff4d4d)" />
                <span className="user-name-small">BookLover</span>
                <Badge variant="default">도서</Badge>
              </div>
              <div className="game-stats">
                <div className="difficulty">
                  난이도: <span>★★</span>☆☆☆
                </div>
                <div className="play-count">
                  <Gamepad2 size={14} /> 1,240명 도전
                </div>
              </div>
            </div>
          </Card>

          {/* Card 2 */}
          <Card hover className="game-card">
            <div className="game-preview">
              <Quote className="quote-icon" />
              <div className="preview-text">
                "마지막 장면의 팽이가 쓰러질지 아닐지 숨죽이며 지켜봤던 순간. 감독의 상상력에 다시 한번 감탄했다."
              </div>
            </div>
            <div className="game-info">
              <div className="game-title">꿈속의 꿈, 그 영화</div>
              <div className="game-meta">
                <Avatar size="sm" gradient="linear-gradient(135deg, #84fab0, #8fd3f4)" />
                <span className="user-name-small">MovieBuff</span>
                <Badge variant="default">영화</Badge>
              </div>
              <div className="game-stats">
                <div className="difficulty">
                  난이도: <span>★</span>☆☆☆☆
                </div>
                <div className="play-count">
                  <Gamepad2 size={14} /> 3,502명 도전
                </div>
              </div>
            </div>
          </Card>

          {/* Card 3 */}
          <Card hover className="game-card">
            <div className="game-preview">
              <Quote className="quote-icon" />
              <div className="preview-text">
                "용이 내가 된다! 류승룡 기모찌! 이 대사 하나로 모든 것이 설명되는 게임."
              </div>
            </div>
            <div className="game-info">
              <div className="game-title">전설의 대사 맞추기</div>
              <div className="game-meta">
                <Avatar size="sm" gradient="linear-gradient(135deg, #f093fb, #f5576c)" />
                <span className="user-name-small">GameMaster</span>
                <Badge variant="default">게임</Badge>
              </div>
              <div className="game-stats">
                <div className="difficulty">
                  난이도: <span>★★★</span>☆☆
                </div>
                <div className="play-count">
                  <Gamepad2 size={14} /> 890명 도전
                </div>
              </div>
            </div>
          </Card>

          {/* Card 4 */}
          <Card hover className="game-card">
            <div className="game-preview">
              <Quote className="quote-icon" />
              <div className="preview-text">
                "겨울이 오고 있다. 하지만 그 겨울은 너무나 길었고, 마지막 시즌은 너무나 짧았다."
              </div>
            </div>
            <div className="game-info">
              <div className="game-title">용두사미의 전설</div>
              <div className="game-meta">
                <Avatar size="sm" gradient="linear-gradient(135deg, #fa709a, #fee140)" />
                <span className="user-name-small">DramaQueen</span>
                <Badge variant="default">드라마</Badge>
              </div>
              <div className="game-stats">
                <div className="difficulty">
                  난이도: <span>★★</span>☆☆☆
                </div>
                <div className="play-count">
                  <Gamepad2 size={14} /> 2,100명 도전
                </div>
              </div>
            </div>
          </Card>

          {/* Card 5 */}
          <Card hover className="game-card">
            <div className="game-preview">
              <Quote className="quote-icon" />
              <div className="preview-text">
                "범인은 바로 이 안에 있어! 할아버지의 이름을 걸고 맹세하지."
              </div>
            </div>
            <div className="game-info">
              <div className="game-title">추리 만화 명대사</div>
              <div className="game-meta">
                <Avatar size="sm" gradient="linear-gradient(135deg, #30cfd0, #330867)" />
                <span className="user-name-small">AniLover</span>
                <Badge variant="default">애니메이션</Badge>
              </div>
              <div className="game-stats">
                <div className="difficulty">
                  난이도: <span>★</span>☆☆☆☆
                </div>
                <div className="play-count">
                  <Gamepad2 size={14} /> 5,430명 도전
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
