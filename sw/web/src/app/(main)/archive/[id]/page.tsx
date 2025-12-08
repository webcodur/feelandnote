"use client";

import { useState, useEffect, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Heart,
  MessageCircle,
  Share2,
  PenTool,
  PlayCircle,
  Smartphone,
  Clapperboard,
  BookOpen,
  Book,
  Film,
  Tv,
  Gamepad2,
  Music,
  Drama,
  Loader2,
} from "lucide-react";
import { Button, Tab, Tabs, Card } from "@/components/ui";
import CreateCreationModal from "@/components/features/archive/CreateCreationModal";
import NoteEditor from "@/components/features/archive/NoteEditor";
import { getContent, type UserContentWithDetails } from "@/actions/contents/getContent";
import { updateStatus } from "@/actions/contents/updateStatus";
import { getRecords, createRecord, updateRecord, type RecordType } from "@/actions/records";
import type { ContentStatus } from "@/actions/contents/addContent";

interface RecordData {
  id: string;
  user_id: string;
  content_id: string;
  type: RecordType;
  content: string;
  rating: number | null;
  location: string | null;
  created_at: string;
  updated_at: string;
}

type CategoryLabels = { [key: string]: string };
type CategoryIcons = { [key: string]: React.ElementType };

const CATEGORY_LABELS: CategoryLabels = {
  book: "도서",
  movie: "영화",
  drama: "드라마",
  animation: "애니메이션",
  game: "게임",
  performance: "공연",
};

const CATEGORY_ICONS: CategoryIcons = {
  book: Book,
  movie: Film,
  drama: Tv,
  animation: Music,
  game: Gamepad2,
  performance: Drama,
};

export default function ArchiveDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contentId = params.id as string;

  const [activeTab, setActiveTab] = useState("myRecord");
  const [activeSubTab, setActiveSubTab] = useState<"review" | "note" | "creation">("review");
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [item, setItem] = useState<UserContentWithDetails | null>(null);
  const [myReview, setMyReview] = useState<RecordData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();

  // Review form state
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState<number | null>(null);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);
      try {
        const [contentData, reviewsData] = await Promise.all([
          getContent(contentId),
          getRecords({ contentId, type: 'REVIEW' }).catch(() => []),
        ]);
        setItem(contentData);

        // Find user's review from records
        const reviewRecord = reviewsData.find(r => r.type === 'REVIEW');
        if (reviewRecord) {
          setMyReview(reviewRecord as unknown as RecordData);
          setReviewText(reviewRecord.content || "");
          setReviewRating(reviewRecord.rating);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "콘텐츠를 불러오는데 실패했습니다.");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [contentId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-accent" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-400 mb-4">{error || "콘텐츠를 찾을 수 없습니다."}</p>
        <Button variant="secondary" onClick={() => router.push("/archive")}>
          목록으로 돌아가기
        </Button>
      </div>
    );
  }

  const content = item.content;
  const categoryLabel = CATEGORY_LABELS[content.type.toLowerCase()] || content.type;
  const Icon = CATEGORY_ICONS[content.type.toLowerCase()] || Book;

  const handleStatusChange = (newStatus: ContentStatus) => {
    if (!item) return;
    startSaveTransition(async () => {
      try {
        await updateStatus({ userContentId: item.id, status: newStatus });
        setItem((prev) => prev ? { ...prev, status: newStatus } : null);
      } catch (err) {
        console.error("상태 변경 실패:", err);
      }
    });
  };

  const handleSaveReview = () => {
    startSaveTransition(async () => {
      try {
        if (myReview) {
          await updateRecord({
            recordId: myReview.id,
            content: reviewText || undefined,
            rating: reviewRating ?? undefined,
          });
        } else {
          await createRecord({
            contentId,
            type: 'REVIEW',
            content: reviewText || '',
            rating: reviewRating ?? undefined,
          });
          // Reload review data
          const records = await getRecords({ contentId, type: 'REVIEW' });
          const reviewRecord = records.find(r => r.type === 'REVIEW');
          if (reviewRecord) {
            setMyReview(reviewRecord as unknown as RecordData);
          }
        }
      } catch (err) {
        console.error("리뷰 저장 실패:", err);
      }
    });
  };


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
        <div className="w-20 h-[120px] rounded-xl shadow-lg shrink-0 overflow-hidden">
          {content.thumbnail_url ? (
            <img
              src={content.thumbnail_url}
              alt={content.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
              <Icon size={32} className="text-gray-500" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="py-0.5 px-2.5 bg-white/10 rounded-xl text-[11px] font-semibold text-text-secondary flex items-center gap-1">
              <Icon size={14} /> {categoryLabel}
            </span>
            <span className="text-text-secondary text-[11px]">
              {new Date(item.created_at).toLocaleDateString("ko-KR")} 추가됨
            </span>
          </div>
          <h1 className="text-[28px] font-extrabold mb-1.5 leading-tight">{content.title}</h1>
          <div className="text-[15px] text-text-secondary">
            {content.creator}
            {(content.metadata as { genre?: string })?.genre && ` · ${(content.metadata as { genre?: string }).genre}`}
          </div>
        </div>
      </div>

      <Tabs>
        <Tab label="내 기록" active={activeTab === "myRecord"} onClick={() => setActiveTab("myRecord")} />
        <Tab label="피드" active={activeTab === "feed"} onClick={() => setActiveTab("feed")} />
      </Tabs>

      {/* Sub Tabs - 리뷰/노트/창작 (공통) */}
      <div className="flex gap-2 mt-4 mb-4 pb-4 border-b border-border">
        {[
          { key: "review", label: "리뷰" },
          { key: "note", label: "노트" },
          { key: "creation", label: "창작" },
        ].map((subTab) => (
          <button
            key={subTab.key}
            onClick={() => setActiveSubTab(subTab.key as "review" | "note" | "creation")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-white/5 ${
              activeSubTab === subTab.key
                ? "bg-accent/20 text-accent"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {subTab.label}
          </button>
        ))}
      </div>


      {/* 피드 + 리뷰 */}
      {activeTab === "feed" && activeSubTab === "review" && (
        <div className="animate-fade-in">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
            {[
              { user: "독서광", avatar: "🧙‍♂️", time: "2시간 전", rating: "★★★★★ 5.0", content: "다시 봐도 명작입니다. 처음 호그와트에 들어가는 장면은 언제 봐도 가슴이 뜁니다.", likes: 24, comments: 5 },
              { user: "마법사A", avatar: "🧙", time: "5시간 전", rating: "★★★★☆ 4.0", content: "처음 읽었을 때의 감동이 아직도 생생합니다. 다만 번역이 조금 아쉽네요.", likes: 18, comments: 3 },
            ].map((post, i) => (
              <Card key={i} className="p-0">
                <div className="p-4 flex items-center gap-3 border-b border-white/5">
                  <div className="w-10 h-10 rounded-full text-2xl flex items-center justify-center bg-bg-secondary">{post.avatar}</div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{post.user}</div>
                    <div className="text-xs text-text-secondary">{post.time}</div>
                  </div>
                </div>
                <div className="px-4 pb-4 pt-3">
                  <div className="text-yellow-400 mb-3 text-sm">{post.rating}</div>
                  <div className="text-sm leading-relaxed text-text-secondary line-clamp-3">{post.content}</div>
                </div>
                <div className="px-4 py-3 border-t border-white/5 flex justify-between items-center">
                  <div className="flex gap-4 text-xs text-text-secondary">
                    <span className="flex items-center gap-1"><Heart size={14} /> {post.likes}</span>
                    <span className="flex items-center gap-1"><MessageCircle size={14} /> {post.comments}</span>
                  </div>
                  <Share2 size={14} className="text-text-secondary" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 피드 + 노트 */}
      {activeTab === "feed" && activeSubTab === "note" && (
        <div className="animate-fade-in">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
            {[
              { user: "영화매니아", avatar: "🎬", time: "5시간 전", progress: "8/17 챕터 (47%)", content: "🌙 밤 · 🏠 집 · 👤 혼자\n\n1장 메모: 프리벳가 4번지의 묘사가 인상적이다.", likes: 12, comments: 2 },
              { user: "책벌레", avatar: "📖", time: "1일 전", progress: "완독", content: "🌅 아침 · ☕ 카페 · 👥 친구\n\n3줄 요약: 마법사의 세계, 우정, 그리고 선택", likes: 8, comments: 1 },
            ].map((post, i) => (
              <Card key={i} className="p-0">
                <div className="p-4 flex items-center gap-3 border-b border-white/5">
                  <div className="w-10 h-10 rounded-full text-2xl flex items-center justify-center bg-bg-secondary">{post.avatar}</div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{post.user}</div>
                    <div className="text-xs text-text-secondary">{post.time}</div>
                  </div>
                </div>
                <div className="px-4 pb-4 pt-3">
                  <div className="text-sm text-accent mb-2">{post.progress}</div>
                  <div className="text-sm leading-relaxed text-text-secondary whitespace-pre-line line-clamp-4">{post.content}</div>
                </div>
                <div className="px-4 py-3 border-t border-white/5 flex justify-between items-center">
                  <div className="flex gap-4 text-xs text-text-secondary">
                    <span className="flex items-center gap-1"><Heart size={14} /> {post.likes}</span>
                    <span className="flex items-center gap-1"><MessageCircle size={14} /> {post.comments}</span>
                  </div>
                  <Share2 size={14} className="text-text-secondary" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 피드 + 창작 */}
      {activeTab === "feed" && activeSubTab === "creation" && (
        <div className="animate-fade-in">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
            {[
              { user: "판타지러버", avatar: "📚", time: "1일 전", type: "What If", typeClass: "bg-red-500/20 text-red-400", title: "만약 해리가 슬리데린에 배정되었다면?", content: "드레이코와의 관계가 어떻게 달라졌을지 상상해봤습니다...", likes: 38, comments: 15 },
              { user: "OST덕후", avatar: "🎵", time: "3일 전", type: "OST 상상", typeClass: "bg-blue-500/20 text-blue-400", title: "호그와트 입학 장면 BGM 상상", content: "웅장한 오케스트라와 신비로운 첼레스타가 어우러진 곡을 상상해봤어요.", likes: 22, comments: 8 },
            ].map((post, i) => (
              <Card key={i} className="p-0">
                <div className="p-4 flex items-center gap-3 border-b border-white/5">
                  <div className="w-10 h-10 rounded-full text-2xl flex items-center justify-center bg-bg-secondary">{post.avatar}</div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{post.user}</div>
                    <div className="text-xs text-text-secondary flex gap-2 items-center mt-1">
                      <span className={`py-0.5 px-2 rounded text-[11px] font-semibold ${post.typeClass}`}>{post.type}</span>
                      <span>{post.time}</span>
                    </div>
                  </div>
                </div>
                <div className="px-4 pb-4 pt-3">
                  <h4 className="font-semibold text-sm mb-2">{post.title}</h4>
                  <div className="text-sm leading-relaxed text-text-secondary line-clamp-3">{post.content}</div>
                </div>
                <div className="px-4 py-3 border-t border-white/5 flex justify-between items-center">
                  <div className="flex gap-4 text-xs text-text-secondary">
                    <span className="flex items-center gap-1"><Heart size={14} /> {post.likes}</span>
                    <span className="flex items-center gap-1"><MessageCircle size={14} /> {post.comments}</span>
                  </div>
                  <Share2 size={14} className="text-text-secondary" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Review Tab Content */}
      {activeTab === "myRecord" && activeSubTab === "review" && (
        <div className="animate-fade-in mt-6">
          {/* 헤더 영역 */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-2 items-center">
              <select
                className="bg-bg-secondary border border-border text-text-primary py-2 px-4 rounded-lg text-sm cursor-pointer outline-none"
                value={item.status}
                onChange={(e) => handleStatusChange(e.target.value as ContentStatus)}
                disabled={isSaving}
              >
                <option value="EXPERIENCE">{content.type === "BOOK" ? "읽음" : "봄"}</option>
                <option value="WISH">관심</option>
              </select>
              <div className="flex gap-1 ml-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setReviewRating(reviewRating === star ? null : star)}
                    className={`text-lg ${(reviewRating ?? 0) >= star ? "text-yellow-400" : "text-gray-600"}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-text-secondary">
              <span>진행률 {item.progress ?? 0}%</span>
              <div className="w-24 h-1.5 bg-white/10 rounded overflow-hidden">
                <div className="h-full bg-accent rounded" style={{ width: `${item.progress ?? 0}%` }} />
              </div>
            </div>
          </div>

          {/* 내 리뷰 작성 카드 */}
          <Card className="p-0 mb-6">
            <div className="p-4 border-b border-white/5">
              <h3 className="font-semibold text-sm">내 리뷰</h3>
            </div>
            <div className="p-4">
              <textarea
                className="w-full h-[120px] bg-black/20 border border-border rounded-lg p-3 text-text-primary text-sm resize-y outline-none transition-colors duration-200 mb-4 font-sans focus:border-accent placeholder:text-text-secondary"
                placeholder="작품의 줄거리, 인상 깊었던 장면, 아쉬웠던 점 등을 자유롭게 기록해보세요."
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
              />
              <div className="flex justify-between items-center">
                <div className="flex flex-wrap gap-2">
                  {["#판타지", "#마법", "#성장", "+ 태그"].map((tag) => (
                    <span
                      key={tag}
                      className="py-1 px-2.5 bg-white/5 border border-border rounded-full text-[12px] text-text-secondary cursor-pointer hover:border-accent hover:text-accent"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer text-text-secondary text-[12px]">
                    <input type="checkbox" className="w-3 h-3" /> 스포일러
                  </label>
                  <Button variant="primary" size="sm" onClick={handleSaveReview} disabled={isSaving}>
                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : "저장"}
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* 다른 사용자 리뷰 그리드 (placeholder) */}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
            {myReview && (
              <Card className="p-0">
                <div className="p-4 flex items-center gap-3 border-b border-white/5">
                  <div className="w-10 h-10 rounded-full text-2xl flex items-center justify-center bg-bg-secondary">📝</div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">나의 리뷰</div>
                    <div className="text-xs text-text-secondary">{new Date(myReview.created_at).toLocaleDateString("ko-KR")}</div>
                  </div>
                </div>
                <div className="px-4 pb-4 pt-3">
                  <div className="text-yellow-400 mb-3 text-sm">{"★".repeat(myReview.rating ?? 0)}{"☆".repeat(5 - (myReview.rating ?? 0))} {myReview.rating ?? 0}.0</div>
                  <div className="text-sm leading-relaxed text-text-secondary line-clamp-3">{myReview.content}</div>
                </div>
                <div className="px-4 py-3 border-t border-white/5 flex justify-between items-center">
                  <div className="flex gap-4 text-xs text-text-secondary">
                    <span className="flex items-center gap-1"><Heart size={14} /> 0</span>
                    <span className="flex items-center gap-1"><MessageCircle size={14} /> 0</span>
                  </div>
                  <Share2 size={14} className="text-text-secondary" />
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Note Tab Content */}
      {activeTab === "myRecord" && activeSubTab === "note" && (
        <div className="animate-fade-in mt-6">
          <NoteEditor contentId={contentId} />
        </div>
      )}

      {/* Creation Tab Content */}
      {activeTab === "myRecord" && activeSubTab === "creation" && (
        <div className="animate-fade-in mt-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={() => setIsCreationModalOpen(true)}>
                <Plus size={14} /> 새 창작
              </Button>
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
                <div className="p-4 flex justify-between items-center border-b border-white/5">
                  <span className={`text-[13px] font-semibold py-0.5 px-2 rounded ${creation.typeClass}`}>
                    {creation.type}
                  </span>
                  <span className="text-xs text-text-secondary">{creation.date}</span>
                </div>
                <div className="px-4 pb-4 pt-3">
                  <h4 className="font-semibold text-sm mb-2">{creation.title}</h4>
                  <p className="text-sm text-text-secondary leading-relaxed line-clamp-3 mb-3">{creation.desc}</p>
                  <div className="flex flex-wrap gap-2">
                    {creation.tags.map((tag) => (
                      <span
                        key={tag}
                        className="py-1 px-2.5 bg-white/5 border border-border rounded-full text-[12px] text-text-secondary"
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

      <button
        onClick={() => (activeTab === "myRecord" && activeSubTab === "creation") ? setIsCreationModalOpen(true) : null}
        className="fixed bottom-10 right-10 w-16 h-16 rounded-full bg-accent flex items-center justify-center shadow-lg cursor-pointer transition-all duration-300 z-20 border-none hover:scale-110 hover:rotate-90 hover:bg-accent-hover"
      >
        <Plus size={32} color="white" />
      </button>

      <CreateCreationModal
        isOpen={isCreationModalOpen}
        onClose={() => setIsCreationModalOpen(false)}
        contentTitle={content.title}
      />
    </div>
  );
}

