"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { 
  ArrowLeft, 
  Plus, 
  Star, 
  Heart, 
  MessageCircle, 
  Share2, 
  Lock, 
  Globe, 
  Users, 
  Check, 
  List, 
  Camera, 
  PenTool, 
  ChevronDown, 
  ChevronUp,
  PlayCircle,
  Smartphone,
  Clapperboard,
  BookOpen
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button, Tab, Tabs, Badge, Avatar, Card } from "@/components/ui";
import { ARCHIVE_ITEMS, READING_LIST } from "@/lib/mock-data";

export default function ArchiveDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const [activeTab, setActiveTab] = useState("review");
  
  // Find item from mock data
  const item = ARCHIVE_ITEMS.find((i) => i.id === id) || READING_LIST.find((i) => i.id === id);

  if (!item) {
    return <div className="p-8 text-center">Item not found</div>;
  }

  // Mock Data for Note Tab
  const [activeTemplate, setActiveTemplate] = useState<number | null>(0);
  const toggleTemplate = (index: number) => {
    setActiveTemplate(activeTemplate === index ? null : index);
  };

  const snapshotOptions = {
    when: ["아침", "점심", "저녁", "밤", "새벽"],
    where: ["집", "카페", "도서관", "이동 중"],
    with: ["혼자", "친구", "가족", "연인"],
    motivation: ["추천받음", "검색", "우연히", "광고"]
  };

  const [selectedSnapshots, setSelectedSnapshots] = useState({
    when: "밤",
    where: "집",
    with: "혼자",
    motivation: "추천받음"
  });

  return (
    <MainLayout>
      <div className="archive-detail-container">
        <Button variant="ghost" className="back-button" onClick={() => window.history.back()}>
          <ArrowLeft size={16} />
          <span>목록으로 돌아가기</span>
        </Button>

      {/* Compact Header */}
      <div className="compact-header">
        <div 
          className="compact-poster" 
          style={{ background: item.coverColor || "var(--bg-secondary)" }}
        ></div>
        <div className="compact-info">
          <div className="compact-meta">
            <span className="category-badge">📚 {item.type}</span>
            <span style={{ color: "var(--text-secondary)", fontSize: "11px" }}>2023.11.30 추가됨</span>
          </div>
          <h1 className="compact-title">{item.title}</h1>
          <div className="compact-creator">J.K. 롤링 · 판타지</div>
        </div>
      </div>

      <Tabs>
        <Tab label="리뷰" active={activeTab === "review"} onClick={() => setActiveTab("review")} />
        <Tab label="노트 (1)" active={activeTab === "note"} onClick={() => setActiveTab("note")} />
        <Tab label="창작 (3)" active={activeTab === "creation"} onClick={() => setActiveTab("creation")} />
      </Tabs>

      {/* Review Tab Content */}
      {activeTab === "review" && (
        <div className="animate-fade-in">
          <div className="review-section">
            <div className="review-row">
              <div className="status-container">
                <select className="status-select" defaultValue="watching">
                  <option value="watching">읽는 중</option>
                  <option value="completed">완료</option>
                  <option value="wish">관심</option>
                  <option value="paused">중단</option>
                </select>
                <div className="rating-stars">★★★★☆</div>
              </div>
            </div>

            <div className="progress-section">
              <div className="progress-label">
                <span>진행률</span>
                <span>45% (8/17 챕터)</span>
              </div>
              <div className="detail-progress-bar">
                <div className="detail-progress-fill"></div>
              </div>
            </div>

            <textarea 
              className="review-textarea" 
              placeholder="작품의 줄거리, 인상 깊었던 장면, 아쉬웠던 점 등을 자유롭게 기록해보세요."
            ></textarea>
            
            <div className="review-footer">
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <select className="visibility-select">
                  <option value="public">🌏 전체 공개</option>
                  <option value="followers">👥 팔로워만</option>
                  <option value="private">🔒 나만 보기</option>
                </select>
                <label className="spoiler-check">
                  <input type="checkbox" /> 스포일러 포함
                </label>
              </div>
              <Button variant="primary" size="sm">저장</Button>
            </div>

            <div className="tags-container">
              <div className="tag">#판타지</div>
              <div className="tag">#마법</div>
              <div className="tag">#성장</div>
              <div className="tag">+ 태그 추가</div>
            </div>
          </div>

          {/* Review Grid (Mockup for other reviews) */}
          <div className="filter-section mt-8">
            <div className="filter-group">
              <div className="filter-chip active">전체</div>
              <div className="filter-chip">내 리뷰</div>
              <div className="filter-chip">팔로잉</div>
            </div>
            <div className="filter-group">
              <select className="sort-select">
                <option>최신순</option>
                <option>좋아요순</option>
              </select>
            </div>
          </div>

          <div className="review-grid">
            {/* Mock Review Card 1 */}
            <div className="review-card">
              <div className="card-header">
                <div className="user-avatar">🧙‍♂️</div>
                <div className="user-info">
                  <div className="user-name">마법사A</div>
                  <div className="review-date">2시간 전</div>
                </div>
              </div>
              <div className="card-body">
                <div className="rating text-yellow-400 mb-3 text-sm">★★★★★ 5.0</div>
                <div className="review-text">
                  다시 봐도 명작입니다. 처음 호그와트에 들어가는 장면은 언제 봐도 가슴이 뜁니다.
                  어린 시절의 추억이 되살아나는 기분이에요. 강력 추천합니다!
                </div>
              </div>
              <div className="card-footer">
                <div className="interaction">
                  <span><Heart size={14} /> 24</span>
                  <span><MessageCircle size={14} /> 5</span>
                </div>
                <div><Share2 size={14} /></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Note Tab Content */}
      {activeTab === "note" && (
        <div className="animate-fade-in">
          <div className="note-container">
            <div className="note-header">
              <div className="content-meta">
                <div className="content-poster" style={{ background: item.coverColor }}></div>
                <div className="content-details">
                  <h2 className="text-lg font-bold mb-1">{item.title}</h2>
                  <p className="text-sm text-gray-400">J.K. 롤링 · 도서</p>
                </div>
              </div>
              <div className="note-actions">
                <select className="visibility-select">
                  <option>🔒 비공개</option>
                  <option>👥 팔로워 공개</option>
                  <option>🌍 전체 공개</option>
                </select>
                <Button variant="primary" size="sm">저장</Button>
              </div>
            </div>

            {/* 1. Sectioned Records */}
            <div className="note-section">
              <div className="section-title">
                <List size={18} /> 구획별 기록
              </div>
              <div className="section-list">
                <div className="section-item">
                  <div className="section-header">
                    <div className="checkbox checked"><Check size={12} /></div>
                    <span className="section-name">1장. 살아남은 아이</span>
                    <div className="cursor-grab text-gray-500">≡</div>
                  </div>
                  <textarea className="section-memo" defaultValue="프리벳가 4번지의 묘사가 인상적이다. 덤블도어의 딜루미네이터 장면이 신비롭다."></textarea>
                </div>
                <div className="section-item">
                  <div className="section-header">
                    <div className="checkbox"></div>
                    <span className="section-name">2장. 사라진 유리창</span>
                    <div className="cursor-grab text-gray-500">≡</div>
                  </div>
                  <textarea className="section-memo" placeholder="메모를 입력하세요..."></textarea>
                </div>
              </div>
              <button className="add-section-btn">
                <Plus size={14} /> 구획 추가
              </button>
            </div>

            {/* 2. Experience Snapshot */}
            <div className="note-section">
              <div className="section-title">
                <Camera size={18} /> 경험 스냅샷
              </div>
              <div className="snapshot-grid">
                <div className="snapshot-group">
                  <h3>언제</h3>
                  <div className="snapshot-options">
                    {snapshotOptions.when.map(opt => (
                      <div key={opt} className={`snapshot-chip ${selectedSnapshots.when === opt ? 'active' : ''}`}>{opt}</div>
                    ))}
                  </div>
                </div>
                <div className="snapshot-group">
                  <h3>어디서</h3>
                  <div className="snapshot-options">
                    {snapshotOptions.where.map(opt => (
                      <div key={opt} className={`snapshot-chip ${selectedSnapshots.where === opt ? 'active' : ''}`}>{opt}</div>
                    ))}
                  </div>
                </div>
                <div className="snapshot-group">
                  <h3>누구와</h3>
                  <div className="snapshot-options">
                    {snapshotOptions.with.map(opt => (
                      <div key={opt} className={`snapshot-chip ${selectedSnapshots.with === opt ? 'active' : ''}`}>{opt}</div>
                    ))}
                  </div>
                </div>
                <div className="snapshot-group">
                  <h3>계기</h3>
                  <div className="snapshot-options">
                    {snapshotOptions.motivation.map(opt => (
                      <div key={opt} className={`snapshot-chip ${selectedSnapshots.motivation === opt ? 'active' : ''}`}>{opt}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Structured Template */}
            <div className="note-section" style={{ borderBottom: "none" }}>
              <div className="section-title">
                <PenTool size={18} /> 구조화 템플릿
              </div>
              <div className="template-list">
                <div className={`template-item ${activeTemplate === 0 ? 'active' : ''}`}>
                  <div className="template-header" onClick={() => toggleTemplate(0)}>
                    <span>3줄 요약</span>
                    {activeTemplate === 0 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                  <div className="template-content">
                    <textarea className="template-textarea" defaultValue={"1. 해리 포터가 마법사라는 사실을 알게 된다.\n2. 호그와트 입학 후 친구들을 만난다.\n3. 볼드모트로부터 마법사의 돌을 지켜낸다."}></textarea>
                  </div>
                </div>
                <div className={`template-item ${activeTemplate === 1 ? 'active' : ''}`}>
                  <div className="template-header" onClick={() => toggleTemplate(1)}>
                    <span>작품의 질문 vs 내 질문</span>
                    {activeTemplate === 1 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                  <div className="template-content">
                    <textarea className="template-textarea" placeholder="작품이 던지는 질문과 내가 갖게 된 질문을 기록해보세요."></textarea>
                  </div>
                </div>
                <div className={`template-item ${activeTemplate === 2 ? 'active' : ''}`}>
                  <div className="template-header" onClick={() => toggleTemplate(2)}>
                    <span>강렬했던 순간</span>
                    {activeTemplate === 2 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                  <div className="template-content">
                    <textarea className="template-textarea" placeholder="가장 인상 깊었던 장면이나 순간을 기록해보세요."></textarea>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Creation Tab Content */}
      {activeTab === "creation" && (
        <div className="animate-fade-in">
          <div className="filter-section">
            <div className="filter-group">
              <div className="filter-chip active">전체</div>
              <div className="filter-chip">What If</div>
              <div className="filter-chip">매체 변환</div>
              <div className="filter-chip">OST 상상</div>
            </div>
            <div className="filter-group">
              <div className="filter-chip">최신순</div>
            </div>
          </div>

          <div className="creation-grid">
            {/* Card 1: What If */}
            <div className="creation-card">
              <div className="card-header">
                <span className="creation-type what-if">What If</span>
                <span className="creation-date">2023.10.25</span>
              </div>
              <div className="card-body">
                <h3 className="creation-title">만약 해리포터가 슬리데린에 배정되었다면?</h3>
                <p className="creation-desc">
                  해리포터가 그리핀도르가 아닌 슬리데린에 배정되었다면 이야기는 어떻게 전개되었을까?
                  말포이와의 관계, 스네이프 교수의 태도 변화 등을 상상해본다.
                </p>
                <div className="tag-container">
                  <span className="tag">#해리포터</span>
                  <span className="tag">#슬리데린</span>
                  <span className="tag">#대체역사</span>
                </div>
              </div>
              <div className="card-footer">
                <div className="source-content">
                  <BookOpen size={14} />
                  <span>해리포터와 마법사의 돌</span>
                </div>
                <div className="interaction">
                  <span><Heart size={14} /> 42</span>
                  <span><MessageCircle size={14} /> 8</span>
                </div>
              </div>
            </div>

            {/* Card 2: Media Conversion */}
            <div className="creation-card">
              <div className="card-header">
                <span className="creation-type media">매체 변환</span>
                <span className="creation-date">2023.10.20</span>
              </div>
              <div className="card-body">
                <h3 className="creation-title">소설 '전지적 독자 시점' 영화 캐스팅 가상 라인업</h3>
                <p className="creation-desc">
                  전독시가 영화화된다면 김독자, 유중혁 역에는 누가 어울릴까?
                  개인적으로 생각하는 찰떡 캐스팅을 정리해보았다.
                </p>
                <div className="tag-container">
                  <span className="tag">#전독시</span>
                  <span className="tag">#가상캐스팅</span>
                </div>
              </div>
              <div className="card-footer">
                <div className="source-content">
                  <Clapperboard size={14} />
                  <span>전지적 독자 시점</span>
                </div>
                <div className="interaction">
                  <span><Heart size={14} /> 128</span>
                  <span><MessageCircle size={14} /> 56</span>
                </div>
              </div>
            </div>

            {/* Card 3: OST Imagination */}
            <div className="creation-card">
              <div className="card-header">
                <span className="creation-type ost">OST 상상</span>
                <span className="creation-date">2023.10.15</span>
              </div>
              <div className="card-body">
                <h3 className="creation-title">웹툰 '화산귀환' 매화검존 등장 테마곡 작곡</h3>
                <p className="creation-desc">
                  청명이 매화검존의 힘을 드러낼 때 깔리면 좋을 것 같은 BGM을 만들어보았다.
                  동양적인 선율에 웅장한 오케스트라를 더해서...
                </p>
                <div className="tag-container">
                  <span className="tag">#화산귀환</span>
                  <span className="tag">#자작곡</span>
                  <span className="tag">#BGM</span>
                </div>
              </div>
              <div className="card-footer">
                <div className="source-content">
                  <Smartphone size={14} />
                  <span>화산귀환</span>
                </div>
                <div className="interaction">
                  <span><Heart size={14} /> 55</span>
                  <span><PlayCircle size={14} /> 12</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Button variant="primary" className="add-btn-floating">
        <Plus size={32} color="white" />
      </Button>
      </div>
    </MainLayout>
  );
}
