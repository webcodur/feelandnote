"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Heart,
  MessageCircle,
  Share2,
  Check,
  List,
  Camera,
  PenTool,
  ChevronDown,
  ChevronUp,
  PlayCircle,
  Smartphone,
  Clapperboard,
  BookOpen,
  Book,
} from "lucide-react";
import { Button, Tab, Tabs, Card } from "@/components/ui";
import { ARCHIVE_ITEMS, READING_LIST } from "@/lib/mock-data";

export default function ArchiveDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const [activeTab, setActiveTab] = useState("review");

  const item = ARCHIVE_ITEMS.find((i) => i.id === id) || READING_LIST.find((i) => i.id === id);

  if (!item) {
    return <div className="p-8 text-center">Item not found</div>;
  }

  const [activeTemplate, setActiveTemplate] = useState<number | null>(0);
  const toggleTemplate = (index: number) => {
    setActiveTemplate(activeTemplate === index ? null : index);
  };

  const snapshotOptions = {
    when: ["아침", "점심", "저녁", "밤", "새벽"],
    where: ["집", "카페", "도서관", "이동 중"],
    with: ["혼자", "친구", "가족", "연인"],
    motivation: ["추천받음", "검색", "우연히", "광고"],
  };

  const [selectedSnapshots] = useState({
    when: "밤",
    where: "집",
    with: "혼자",
    motivation: "추천받음",
  });

  return (
    <div className="max-w-[1000px] mx-auto">
      <Button
        variant="ghost"
        className="flex items-center gap-2 text-text-secondary text-sm font-semibold mb-6"
        onClick={() => window.history.back()}
      >
        <ArrowLeft size={16} />
        <span>목록으로 돌아가기</span>
      </Button>

      {/* Compact Header */}
      <div className="flex items-center gap-5 py-5 mb-6 border-b border-border">
        <div
          className="w-20 h-[120px] rounded-xl shadow-lg shrink-0"
          style={{ background: item.coverColor || "var(--bg-secondary)" }}
        />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="py-0.5 px-2.5 bg-white/10 rounded-xl text-[11px] font-semibold text-text-secondary flex items-center gap-1">
              <Book size={14} /> {item.type}
            </span>
            <span className="text-text-secondary text-[11px]">2023.11.30 추가됨</span>
          </div>
          <h1 className="text-[28px] font-extrabold mb-1.5 leading-tight">{item.title}</h1>
          <div className="text-[15px] text-text-secondary">J.K. 롤링 · 판타지</div>
        </div>
      </div>

      <Tabs>
        <Tab label="리뷰" active={activeTab === "review"} onClick={() => setActiveTab("review")} />
        <Tab label="노트 (1)" active={activeTab === "note"} onClick={() => setActiveTab("note")} />
        <Tab label="창작 (3)" active={activeTab === "creation"} onClick={() => setActiveTab("creation")} />
      </Tabs>

      {/* Review Tab Content */}
      {activeTab === "review" && (
        <div className="animate-fade-in mt-6">
          <Card>
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-4">
                <select className="bg-transparent border border-border text-text-primary py-2 px-4 rounded-lg text-sm cursor-pointer outline-none">
                  <option value="watching">읽는 중</option>
                  <option value="completed">완료</option>
                  <option value="wish">관심</option>
                  <option value="paused">중단</option>
                </select>
                <div className="text-yellow-400 text-lg tracking-wide">★★★★☆</div>
              </div>
            </div>

            <div className="mb-5">
              <div className="flex justify-between mb-2 text-[13px] text-text-secondary">
                <span>진행률</span>
                <span>45% (8/17 챕터)</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded overflow-hidden">
                <div className="h-full bg-accent rounded w-[45%]" />
              </div>
            </div>

            <textarea
              className="w-full h-[150px] bg-black/20 border border-border rounded-lg p-3 text-text-primary text-sm resize-y outline-none transition-colors duration-200 mb-4 font-sans focus:border-accent placeholder:text-text-secondary"
              placeholder="작품의 줄거리, 인상 깊었던 장면, 아쉬웠던 점 등을 자유롭게 기록해보세요."
            />

            <div className="flex justify-between items-center pt-4 border-t border-white/10 mb-5">
              <div className="flex gap-3 items-center">
                <select className="bg-bg-main border border-border text-text-primary py-1.5 px-3 rounded-md text-[13px] outline-none cursor-pointer">
                  <option value="public">전체 공개</option>
                  <option value="followers">팔로워만</option>
                  <option value="private">나만 보기</option>
                </select>
                <label className="flex items-center gap-1.5 cursor-pointer text-text-secondary text-[13px]">
                  <input type="checkbox" /> 스포일러 포함
                </label>
              </div>
              <Button variant="primary" size="sm">저장</Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {["#판타지", "#마법", "#성장", "+ 태그 추가"].map((tag) => (
                <div
                  key={tag}
                  className="py-1.5 px-3 bg-white/5 border border-border rounded-full text-[13px] text-text-secondary cursor-pointer transition-all duration-200 hover:border-accent hover:text-accent"
                >
                  {tag}
                </div>
              ))}
            </div>
          </Card>

          {/* Review Grid */}
          <div className="flex justify-between items-center mt-8 mb-6">
            <div className="flex gap-2">
              {["전체", "내 리뷰", "팔로잉"].map((chip, i) => (
                <div
                  key={chip}
                  className={`py-1.5 px-3 rounded-full text-[13px] cursor-pointer transition-all duration-200 hover:text-text-primary
                    ${i === 0 ? "bg-accent/20 text-accent" : "text-text-secondary"}`}
                >
                  {chip}
                </div>
              ))}
            </div>
            <select className="bg-bg-card border border-border text-text-secondary py-1.5 px-3 rounded-md text-[13px] outline-none cursor-pointer">
              <option>최신순</option>
              <option>좋아요순</option>
            </select>
          </div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
            <Card className="p-0">
              <div className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full text-2xl flex items-center justify-center bg-bg-secondary">🧙‍♂️</div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">마법사A</div>
                  <div className="text-xs text-text-secondary">2시간 전</div>
                </div>
              </div>
              <div className="px-4 pb-4">
                <div className="text-yellow-400 mb-3 text-sm">★★★★★ 5.0</div>
                <div className="text-sm leading-relaxed text-text-secondary line-clamp-4">
                  다시 봐도 명작입니다. 처음 호그와트에 들어가는 장면은 언제 봐도 가슴이 뜁니다.
                  어린 시절의 추억이 되살아나는 기분이에요. 강력 추천합니다!
                </div>
              </div>
              <div className="px-4 py-3 border-t border-white/5 flex justify-between items-center">
                <div className="flex gap-4 text-xs text-text-secondary">
                  <span className="flex items-center gap-1"><Heart size={14} /> 24</span>
                  <span className="flex items-center gap-1"><MessageCircle size={14} /> 5</span>
                </div>
                <Share2 size={14} className="text-text-secondary" />
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Note Tab Content */}
      {activeTab === "note" && (
        <div className="animate-fade-in mt-6">
          <Card className="p-0">
            <div className="py-6 px-8 border-b border-border flex justify-between items-center bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-16 rounded-lg" style={{ background: item.coverColor }} />
                <div>
                  <h2 className="text-lg font-bold mb-1">{item.title}</h2>
                  <p className="text-sm text-gray-400">J.K. 롤링 · 도서</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <select className="bg-bg-main border border-border text-text-primary py-1.5 px-3 rounded-md text-[13px] outline-none cursor-pointer">
                  <option>비공개</option>
                  <option>팔로워 공개</option>
                  <option>전체 공개</option>
                </select>
                <Button variant="primary" size="sm">저장</Button>
              </div>
            </div>

            {/* Sectioned Records */}
            <div className="p-8 border-b border-border">
              <div className="text-lg font-semibold mb-6 flex items-center gap-2">
                <List size={18} /> 구획별 기록
              </div>
              <div className="flex flex-col gap-4">
                <div className="bg-bg-secondary rounded-xl p-4 border border-border">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-5 h-5 border-2 border-accent bg-accent rounded cursor-pointer flex items-center justify-center text-white">
                      <Check size={12} />
                    </div>
                    <span className="font-semibold flex-1">1장. 살아남은 아이</span>
                    <div className="cursor-grab text-gray-500">≡</div>
                  </div>
                  <textarea
                    className="w-full bg-black/20 border border-border rounded-lg p-3 text-text-primary resize-y min-h-[80px] text-sm leading-relaxed outline-none focus:border-accent"
                    defaultValue="프리벳가 4번지의 묘사가 인상적이다. 덤블도어의 딜루미네이터 장면이 신비롭다."
                  />
                </div>
                <div className="bg-bg-secondary rounded-xl p-4 border border-border">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-5 h-5 border-2 border-text-secondary rounded cursor-pointer" />
                    <span className="font-semibold flex-1">2장. 사라진 유리창</span>
                    <div className="cursor-grab text-gray-500">≡</div>
                  </div>
                  <textarea
                    className="w-full bg-black/20 border border-border rounded-lg p-3 text-text-primary resize-y min-h-[80px] text-sm leading-relaxed outline-none focus:border-accent"
                    placeholder="메모를 입력하세요..."
                  />
                </div>
              </div>
              <button className="mt-4 w-full p-3 bg-transparent border border-dashed border-border rounded-xl text-text-secondary cursor-pointer transition-all duration-200 flex items-center justify-center gap-2 hover:border-accent hover:text-accent hover:bg-accent/5">
                <Plus size={14} /> 구획 추가
              </button>
            </div>

            {/* Experience Snapshot */}
            <div className="p-8 border-b border-border">
              <div className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Camera size={18} /> 경험 스냅샷
              </div>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-6">
                {Object.entries(snapshotOptions).map(([key, options]) => (
                  <div key={key}>
                    <h3 className="text-sm text-text-secondary mb-3">
                      {key === "when" ? "언제" : key === "where" ? "어디서" : key === "with" ? "누구와" : "계기"}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {options.map((opt) => (
                        <div
                          key={opt}
                          className={`py-1.5 px-3 rounded-2xl bg-bg-secondary border border-border text-text-secondary text-[13px] cursor-pointer transition-all duration-200 hover:bg-accent hover:text-white hover:border-accent
                            ${selectedSnapshots[key as keyof typeof selectedSnapshots] === opt ? "bg-accent text-white border-accent" : ""}`}
                        >
                          {opt}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Structured Template */}
            <div className="p-8">
              <div className="text-lg font-semibold mb-6 flex items-center gap-2">
                <PenTool size={18} /> 구조화 템플릿
              </div>
              <div className="flex flex-col gap-3">
                {[
                  { title: "3줄 요약", content: "1. 해리 포터가 마법사라는 사실을 알게 된다.\n2. 호그와트 입학 후 친구들을 만난다.\n3. 볼드모트로부터 마법사의 돌을 지켜낸다." },
                  { title: "작품의 질문 vs 내 질문", content: "" },
                  { title: "강렬했던 순간", content: "" },
                ].map((template, i) => (
                  <div key={i} className={`border border-border rounded-xl overflow-hidden bg-bg-secondary`}>
                    <div
                      className="py-4 px-6 cursor-pointer flex justify-between items-center font-semibold transition-colors duration-200 hover:bg-white/5"
                      onClick={() => toggleTemplate(i)}
                    >
                      <span>{template.title}</span>
                      {activeTemplate === i ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                    {activeTemplate === i && (
                      <div className="px-6 pb-6">
                        <textarea
                          className="w-full bg-bg-card border border-border rounded-lg p-3 text-text-primary resize-y min-h-[120px] outline-none focus:border-accent"
                          defaultValue={template.content}
                          placeholder={template.content ? undefined : `${template.title}을 기록해보세요.`}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Creation Tab Content */}
      {activeTab === "creation" && (
        <div className="animate-fade-in mt-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-2">
              {["전체", "What If", "매체 변환", "OST 상상"].map((chip, i) => (
                <div
                  key={chip}
                  className={`py-1.5 px-3 rounded-full text-[13px] cursor-pointer transition-all duration-200 hover:text-text-primary
                    ${i === 0 ? "bg-accent/20 text-accent" : "text-text-secondary"}`}
                >
                  {chip}
                </div>
              ))}
            </div>
            <div className="py-1.5 px-3 rounded-full text-[13px] text-text-secondary">최신순</div>
          </div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
            {[
              {
                type: "What If",
                typeClass: "bg-red-500/20 text-red-400",
                date: "2023.10.25",
                title: "만약 해리포터가 슬리데린에 배정되었다면?",
                desc: "해리포터가 그리핀도르가 아닌 슬리데린에 배정되었다면 이야기는 어떻게 전개되었을까? 말포이와의 관계, 스네이프 교수의 태도 변화 등을 상상해본다.",
                tags: ["#해리포터", "#슬리데린", "#대체역사"],
                source: "해리포터와 마법사의 돌",
                sourceIcon: <BookOpen size={14} />,
                likes: 42,
                comments: 8,
              },
              {
                type: "매체 변환",
                typeClass: "bg-green-500/20 text-green-400",
                date: "2023.10.20",
                title: "소설 '전지적 독자 시점' 영화 캐스팅 가상 라인업",
                desc: "전독시가 영화화된다면 김독자, 유중혁 역에는 누가 어울릴까? 개인적으로 생각하는 찰떡 캐스팅을 정리해보았다.",
                tags: ["#전독시", "#가상캐스팅"],
                source: "전지적 독자 시점",
                sourceIcon: <Clapperboard size={14} />,
                likes: 128,
                comments: 56,
              },
              {
                type: "OST 상상",
                typeClass: "bg-blue-500/20 text-blue-400",
                date: "2023.10.15",
                title: "웹툰 '화산귀환' 매화검존 등장 테마곡 작곡",
                desc: "청명이 매화검존의 힘을 드러낼 때 깔리면 좋을 것 같은 BGM을 만들어보았다. 동양적인 선율에 웅장한 오케스트라를 더해서...",
                tags: ["#화산귀환", "#자작곡", "#BGM"],
                source: "화산귀환",
                sourceIcon: <Smartphone size={14} />,
                likes: 55,
                comments: 12,
                isPlay: true,
              },
            ].map((creation, i) => (
              <Card key={i} className="p-0">
                <div className="p-4 flex justify-between items-center">
                  <span className={`text-[13px] font-semibold uppercase tracking-wide py-0.5 px-2 rounded ${creation.typeClass}`}>
                    {creation.type}
                  </span>
                  <span className="text-xs text-text-secondary">{creation.date}</span>
                </div>
                <div className="px-4 pb-4">
                  <h3 className="text-base font-bold mb-2">{creation.title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed line-clamp-3 mb-3">{creation.desc}</p>
                  <div className="flex flex-wrap gap-2">
                    {creation.tags.map((tag) => (
                      <span
                        key={tag}
                        className="py-1.5 px-3 bg-white/5 border border-border rounded-full text-[13px] text-text-secondary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="px-4 py-3 border-t border-white/5 flex justify-between items-center">
                  <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                    {creation.sourceIcon}
                    <span>{creation.source}</span>
                  </div>
                  <div className="flex gap-4 text-xs text-text-secondary">
                    <span className="flex items-center gap-1"><Heart size={14} /> {creation.likes}</span>
                    <span className="flex items-center gap-1">
                      {creation.isPlay ? <PlayCircle size={14} /> : <MessageCircle size={14} />} {creation.comments}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <button className="fixed bottom-10 right-10 w-16 h-16 rounded-full bg-accent flex items-center justify-center shadow-lg cursor-pointer transition-all duration-300 z-20 border-none hover:scale-110 hover:rotate-90 hover:bg-accent-hover">
        <Plus size={32} color="white" />
      </button>
    </div>
  );
}
