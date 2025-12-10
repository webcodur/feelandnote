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
  Book,
  Film,
  Tv,
  Gamepad2,
  Music,
  Drama,
  Loader2,
  Trash2,
} from "lucide-react";
import { Button, Tab, Tabs, Card } from "@/components/ui";
import CreateCreationModal from "@/components/features/archive/CreateCreationModal";
import NoteEditor from "@/components/features/archive/NoteEditor";
import { getContent, type UserContentWithDetails } from "@/actions/contents/getContent";
import { updateStatus } from "@/actions/contents/updateStatus";
import { updateProgress } from "@/actions/contents/updateProgress";
import { removeContent } from "@/actions/contents/removeContent";
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

export default function ArchiveDetailView() {
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

  const handleProgressChange = (newProgress: number) => {
    if (!item) return;
    // 낙관적 업데이트
    // - 100%면 COMPLETE
    // - 0이 아니고 현재 WISH면 EXPERIENCE로 변경
    let newStatus: ContentStatus | undefined;
    if (newProgress === 100) {
      newStatus = 'COMPLETE';
    } else if (newProgress > 0 && item.status === 'WISH') {
      newStatus = 'EXPERIENCE';
    }

    setItem((prev) => prev ? {
      ...prev,
      progress: newProgress,
      ...(newStatus ? { status: newStatus } : {})
    } : null);

    startSaveTransition(async () => {
      try {
        await updateProgress({ userContentId: item.id, progress: newProgress });
      } catch (err) {
        console.error("진행도 변경 실패:", err);
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
          // 기존 리뷰 업데이트 반영
          setMyReview((prev) => prev ? {
            ...prev,
            content: reviewText,
            rating: reviewRating,
            updated_at: new Date().toISOString(),
          } : null);
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
    <>
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
            <select
              className="bg-bg-secondary border border-border text-text-primary py-0.5 px-2 rounded-lg text-[11px] cursor-pointer outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              value={item.status}
              onChange={(e) => handleStatusChange(e.target.value as ContentStatus)}
              disabled={isSaving || ((item.progress ?? 0) > 0 && item.status !== 'COMPLETE')}
            >
              <option value="EXPERIENCE">감상 중</option>
              <option value="WISH">관심</option>
              <option value="COMPLETE">완료</option>
            </select>
            <span className="text-text-secondary text-[11px]">
              {new Date(item.created_at).toLocaleDateString("ko-KR")} 추가됨
            </span>
          </div>
          <h1 className="text-[28px] font-extrabold mb-1.5 leading-tight">{content.title}</h1>
          <div className="text-[15px] text-text-secondary mb-3">
            {content.creator}
            {(content.metadata as { genre?: string })?.genre && ` · ${(content.metadata as { genre?: string }).genre}`}
          </div>
          {/* 진행도 */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-secondary">진행도</span>
            <div className="relative flex-1 max-w-[200px] group">
              <input
                type="range"
                min="0"
                max="100"
                step="10"
                value={item.progress ?? 0}
                onChange={(e) => handleProgressChange(Number(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-4
                  [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-accent
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:shadow-lg
                  [&::-webkit-slider-thumb]:transition-transform
                  [&::-webkit-slider-thumb]:hover:scale-110
                  [&::-moz-range-thumb]:w-4
                  [&::-moz-range-thumb]:h-4
                  [&::-moz-range-thumb]:rounded-full
                  [&::-moz-range-thumb]:bg-accent
                  [&::-moz-range-thumb]:border-0
                  [&::-moz-range-thumb]:cursor-pointer"
                style={{
                  background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${item.progress ?? 0}%, rgba(255,255,255,0.1) ${item.progress ?? 0}%, rgba(255,255,255,0.1) 100%)`,
                }}
              />
            </div>
            <span className="text-sm font-semibold text-accent min-w-[40px]">{item.progress ?? 0}%</span>
            <button
              onClick={() => handleProgressChange(Math.min(100, (item.progress ?? 0) + 10))}
              className="text-[11px] py-1 px-2 bg-white/5 hover:bg-accent/20 text-text-secondary hover:text-accent rounded transition-colors"
            >
              +10%
            </button>
          </div>
        </div>
        <button
          onClick={() => {
            if (confirm("이 콘텐츠를 삭제하시겠습니까?")) {
              startSaveTransition(async () => {
                try {
                  await removeContent(item.id);
                  router.push("/archive");
                } catch (err) {
                  console.error("삭제 실패:", err);
                }
              });
            }
          }}
          className="p-2 text-text-secondary hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
          title="삭제"
        >
          <Trash2 size={20} />
        </button>
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
        <div className="animate-fade-in">
          {/* 내 리뷰 작성 카드 */}
          <Card className="p-0 mb-6">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-semibold text-sm">내 리뷰</h3>
              {/* 평점 */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-secondary">평점</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(reviewRating === star ? null : star)}
                      className={`text-xl transition-colors ${(reviewRating ?? 0) >= star ? "text-yellow-400" : "text-gray-600 hover:text-yellow-400/50"}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                {reviewRating && (
                  <span className="text-sm font-medium text-yellow-400">{reviewRating}.0</span>
                )}
              </div>
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
        <div className="animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <Button variant="primary" size="sm" onClick={() => setIsCreationModalOpen(true)}>
              <Plus size={14} /> 새 창작
            </Button>
          </div>

          {/* 예시 안내 영역 */}
          <Card className="p-6 mb-6 border-dashed">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <PenTool size={18} className="text-accent" />
              창작이란?
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              작품을 보며 떠오른 상상을 기록하고 공유하세요. 세 가지 유형의 창작을 지원합니다.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-bg-secondary rounded-xl">
                <div className="text-lg mb-2">💭 What If</div>
                <div className="text-sm text-text-secondary">
                  "만약 주인공이 다른 선택을 했다면?"<br />
                  대체 역사, 다른 결말 등을 상상해보세요.
                </div>
              </div>
              <div className="p-4 bg-bg-secondary rounded-xl">
                <div className="text-lg mb-2">🎬 매체 전환</div>
                <div className="text-sm text-text-secondary">
                  "이 작품이 영화/드라마가 된다면?"<br />
                  캐스팅, 연출 방향 등을 제안해보세요.
                </div>
              </div>
              <div className="p-4 bg-bg-secondary rounded-xl">
                <div className="text-lg mb-2">🎵 OST 상상</div>
                <div className="text-sm text-text-secondary">
                  "이 장면에 어울리는 음악은?"<br />
                  장면별 OST를 선곡해보세요.
                </div>
              </div>
            </div>
          </Card>

          {/* 내 창작물 목록 (추후 API 연동) */}
          <div className="text-center py-12 text-text-secondary">
            <PenTool size={48} className="mx-auto mb-4 opacity-30" />
            <p>아직 작성한 창작물이 없습니다.</p>
            <p className="text-sm mt-1">위 버튼을 눌러 첫 번째 창작을 시작해보세요!</p>
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
    </>
  );
}
