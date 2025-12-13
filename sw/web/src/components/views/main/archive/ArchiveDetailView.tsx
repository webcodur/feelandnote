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
import { Button, Card } from "@/components/ui";
import CreateCreationModal from "@/components/features/archive/CreateCreationModal";
import NoteEditor from "@/components/features/archive/NoteEditor";
import { getContent, type UserContentWithDetails } from "@/actions/contents/getContent";
import { updateStatus } from "@/actions/contents/updateStatus";
import { updateProgress } from "@/actions/contents/updateProgress";
import { removeContent } from "@/actions/contents/removeContent";
import { getRecords, createRecord, updateRecord, type RecordType } from "@/actions/records";
import type { ContentStatus } from "@/actions/contents/addContent";
import { useAchievement } from "@/components/features/achievements";

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
  const { showUnlock } = useAchievement();

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
          const result = await createRecord({
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
          // 칭호 해금 알림 표시
          if (result.unlockedTitles && result.unlockedTitles.length > 0) {
            showUnlock(result.unlockedTitles);
          }
        }
      } catch (err) {
        console.error("리뷰 저장 실패:", err);
      }
    });
  };


  return (
    <>
      {/* 컴팩트 네비게이션 */}
      <button
        className="flex items-center gap-1 text-text-secondary text-sm mb-3 hover:text-text-primary transition-colors"
        onClick={() => window.history.back()}
      >
        <ArrowLeft size={16} />
        <span>뒤로</span>
      </button>

      {/* 반응형 헤더 */}
      <div className="flex flex-col sm:flex-row gap-4 pb-4 mb-4 border-b border-border">
        {/* 썸네일 + 기본 정보 */}
        <div className="flex gap-3 sm:gap-4">
          <div className="w-16 h-24 sm:w-20 sm:h-[120px] rounded-lg shadow-lg shrink-0 overflow-hidden">
            {content.thumbnail_url ? (
              <img
                src={content.thumbnail_url}
                alt={content.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                <Icon size={24} className="text-gray-500" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            {/* 배지 + 상태 */}
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="py-0.5 px-2 bg-white/10 rounded text-[10px] font-medium text-text-secondary flex items-center gap-1">
                <Icon size={12} /> {categoryLabel}
              </span>
              <select
                className="bg-bg-secondary border border-border text-text-primary py-0.5 px-1.5 rounded text-[10px] cursor-pointer outline-none disabled:opacity-50"
                value={item.status}
                onChange={(e) => handleStatusChange(e.target.value as ContentStatus)}
                disabled={isSaving || ((item.progress ?? 0) > 0 && item.status !== 'COMPLETE')}
              >
                <option value="EXPERIENCE">감상 중</option>
                <option value="WISH">관심</option>
                <option value="COMPLETE">완료</option>
              </select>
            </div>
            {/* 제목 */}
            <h1 className="text-lg sm:text-xl font-bold leading-tight truncate mb-1">{content.title}</h1>
            {/* 크리에이터 */}
            <div className="text-xs sm:text-sm text-text-secondary truncate">
              {content.creator}
              {(content.metadata as { genre?: string })?.genre && ` · ${(content.metadata as { genre?: string }).genre}`}
            </div>
          </div>
          {/* 삭제 버튼 - 모바일에서는 오른쪽 상단 */}
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
            className="p-1.5 text-text-secondary hover:text-red-400 hover:bg-red-400/10 rounded transition-colors self-start sm:hidden"
            title="삭제"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* 진행도 + 액션 (데스크톱에서는 오른쪽) */}
        <div className="flex items-center gap-3 sm:ml-auto">
          <div className="flex items-center gap-2 flex-1 sm:flex-none">
            <div className="relative flex-1 sm:w-32 group">
              <input
                type="range"
                min="0"
                max="100"
                step="10"
                value={item.progress ?? 0}
                onChange={(e) => handleProgressChange(Number(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-3
                  [&::-webkit-slider-thumb]:h-3
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-accent
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-moz-range-thumb]:w-3
                  [&::-moz-range-thumb]:h-3
                  [&::-moz-range-thumb]:rounded-full
                  [&::-moz-range-thumb]:bg-accent
                  [&::-moz-range-thumb]:border-0"
                style={{
                  background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${item.progress ?? 0}%, rgba(255,255,255,0.1) ${item.progress ?? 0}%, rgba(255,255,255,0.1) 100%)`,
                }}
              />
            </div>
            <span className="text-xs font-semibold text-accent w-8">{item.progress ?? 0}%</span>
            <button
              onClick={() => handleProgressChange(Math.min(100, (item.progress ?? 0) + 10))}
              className="text-[10px] py-1 px-2 bg-white/5 hover:bg-accent/20 text-text-secondary hover:text-accent rounded transition-colors whitespace-nowrap"
            >
              +10%
            </button>
          </div>
          {/* 삭제 버튼 - 데스크톱 */}
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
            className="hidden sm:block p-1.5 text-text-secondary hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
            title="삭제"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* 통합 탭 영역 */}
      <div className="flex items-center gap-4 mb-4 overflow-x-auto pb-2 -mb-2">
        {/* 메인 탭 (세그먼트 스타일) */}
        <div className="flex bg-bg-secondary rounded-lg p-0.5 flex-shrink-0">
          <button
            onClick={() => setActiveTab("myRecord")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === "myRecord"
                ? "bg-bg-card text-text-primary"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            내 기록
          </button>
          <button
            onClick={() => setActiveTab("feed")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === "feed"
                ? "bg-bg-card text-text-primary"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            피드
          </button>
        </div>

        {/* 구분선 */}
        <div className="w-px h-5 bg-border flex-shrink-0" />

        {/* 서브 탭 */}
        <div className="flex gap-1 flex-shrink-0">
          {[
            { key: "review", label: "리뷰" },
            { key: "note", label: "노트" },
            { key: "creation", label: "창작" },
          ].map((subTab) => (
            <button
              key={subTab.key}
              onClick={() => setActiveSubTab(subTab.key as "review" | "note" | "creation")}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                activeSubTab === subTab.key
                  ? "bg-accent/20 text-accent"
                  : "text-text-secondary hover:text-text-primary hover:bg-white/5"
              }`}
            >
              {subTab.label}
            </button>
          ))}
        </div>
      </div>



      {/* 피드 + 리뷰 */}
      {activeTab === "feed" && activeSubTab === "review" && (
        <div className="animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
            {[
              { user: "독서광", avatar: "🧙‍♂️", time: "2시간 전", rating: "★★★★★", content: "다시 봐도 명작입니다. 처음 호그와트에 들어가는 장면은 언제 봐도 가슴이 뜁니다.", likes: 24, comments: 5 },
              { user: "마법사A", avatar: "🧙", time: "5시간 전", rating: "★★★★☆", content: "처음 읽었을 때의 감동이 아직도 생생합니다.", likes: 18, comments: 3 },
            ].map((post, i) => (
              <Card key={i} className="p-0">
                <div className="p-2.5 flex items-center gap-2 border-b border-white/5">
                  <div className="w-8 h-8 rounded-full text-lg flex items-center justify-center bg-bg-secondary">{post.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-xs">{post.user}</div>
                    <div className="text-[10px] text-text-secondary">{post.time}</div>
                  </div>
                  <div className="text-yellow-400 text-xs">{post.rating}</div>
                </div>
                <div className="p-2.5">
                  <div className="text-xs leading-relaxed text-text-secondary line-clamp-2">{post.content}</div>
                </div>
                <div className="px-2.5 py-2 border-t border-white/5 flex gap-3 text-[10px] text-text-secondary">
                  <span className="flex items-center gap-1"><Heart size={12} /> {post.likes}</span>
                  <span className="flex items-center gap-1"><MessageCircle size={12} /> {post.comments}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 피드 + 노트 */}
      {activeTab === "feed" && activeSubTab === "note" && (
        <div className="animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
            {[
              { user: "영화매니아", avatar: "🎬", time: "5시간 전", progress: "47%", content: "1장 메모: 프리벳가 4번지의 묘사가 인상적이다.", likes: 12, comments: 2 },
              { user: "책벌레", avatar: "📖", time: "1일 전", progress: "완독", content: "3줄 요약: 마법사의 세계, 우정, 그리고 선택", likes: 8, comments: 1 },
            ].map((post, i) => (
              <Card key={i} className="p-0">
                <div className="p-2.5 flex items-center gap-2 border-b border-white/5">
                  <div className="w-8 h-8 rounded-full text-lg flex items-center justify-center bg-bg-secondary">{post.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-xs">{post.user}</div>
                    <div className="text-[10px] text-text-secondary">{post.time}</div>
                  </div>
                  <span className="text-[10px] text-accent font-medium">{post.progress}</span>
                </div>
                <div className="p-2.5">
                  <div className="text-xs leading-relaxed text-text-secondary line-clamp-2">{post.content}</div>
                </div>
                <div className="px-2.5 py-2 border-t border-white/5 flex gap-3 text-[10px] text-text-secondary">
                  <span className="flex items-center gap-1"><Heart size={12} /> {post.likes}</span>
                  <span className="flex items-center gap-1"><MessageCircle size={12} /> {post.comments}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 피드 + 창작 */}
      {activeTab === "feed" && activeSubTab === "creation" && (
        <div className="animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
            {[
              { user: "판타지러버", avatar: "📚", time: "1일 전", type: "What If", typeClass: "bg-red-500/20 text-red-400", title: "해리가 슬리데린이었다면?", content: "드레이코와의 관계가 어떻게 달라졌을지...", likes: 38, comments: 15 },
              { user: "OST덕후", avatar: "🎵", time: "3일 전", type: "OST", typeClass: "bg-blue-500/20 text-blue-400", title: "호그와트 입학 장면 BGM", content: "웅장한 오케스트라와 신비로운 첼레스타", likes: 22, comments: 8 },
            ].map((post, i) => (
              <Card key={i} className="p-0">
                <div className="p-2.5 flex items-center gap-2 border-b border-white/5">
                  <div className="w-8 h-8 rounded-full text-lg flex items-center justify-center bg-bg-secondary">{post.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-xs">{post.user}</div>
                    <div className="text-[10px] text-text-secondary flex gap-1.5 items-center">
                      <span className={`py-0.5 px-1.5 rounded text-[9px] font-medium ${post.typeClass}`}>{post.type}</span>
                      <span>{post.time}</span>
                    </div>
                  </div>
                </div>
                <div className="p-2.5">
                  <h4 className="font-medium text-xs mb-1">{post.title}</h4>
                  <div className="text-xs leading-relaxed text-text-secondary line-clamp-2">{post.content}</div>
                </div>
                <div className="px-2.5 py-2 border-t border-white/5 flex gap-3 text-[10px] text-text-secondary">
                  <span className="flex items-center gap-1"><Heart size={12} /> {post.likes}</span>
                  <span className="flex items-center gap-1"><MessageCircle size={12} /> {post.comments}</span>
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
          <Card className="p-0 mb-4">
            <div className="p-3 border-b border-white/5 flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
              <h3 className="font-semibold text-sm">내 리뷰</h3>
              {/* 평점 */}
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(reviewRating === star ? null : star)}
                      className={`text-lg transition-colors ${(reviewRating ?? 0) >= star ? "text-yellow-400" : "text-gray-600 hover:text-yellow-400/50"}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                {reviewRating && (
                  <span className="text-xs font-medium text-yellow-400">{reviewRating}.0</span>
                )}
              </div>
            </div>
            <div className="p-3">
              <textarea
                className="w-full h-24 bg-black/20 border border-border rounded-lg p-2.5 text-text-primary text-sm resize-y outline-none transition-colors duration-200 mb-3 font-sans focus:border-accent placeholder:text-text-secondary"
                placeholder="이 작품에 대한 생각을 자유롭게 기록해보세요."
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
              />
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {["#판타지", "#성장", "+ 태그"].map((tag) => (
                    <span
                      key={tag}
                      className="py-0.5 px-2 bg-white/5 border border-border rounded-full text-[11px] text-text-secondary cursor-pointer hover:border-accent hover:text-accent"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <label className="flex items-center gap-1 cursor-pointer text-text-secondary text-[11px]">
                    <input type="checkbox" className="w-3 h-3" /> 스포일러
                  </label>
                  <Button variant="primary" size="sm" onClick={handleSaveReview} disabled={isSaving}>
                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : "저장"}
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* 내 리뷰 카드 */}
          {myReview && (
            <Card className="p-0">
              <div className="p-2.5 flex items-center gap-2 border-b border-white/5">
                <div className="w-8 h-8 rounded-full text-lg flex items-center justify-center bg-bg-secondary">📝</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-xs">내 리뷰</div>
                  <div className="text-[10px] text-text-secondary">{new Date(myReview.created_at).toLocaleDateString("ko-KR")}</div>
                </div>
                <div className="text-yellow-400 text-xs">{"★".repeat(myReview.rating ?? 0)}</div>
              </div>
              <div className="p-2.5">
                <div className="text-xs leading-relaxed text-text-secondary">{myReview.content}</div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Note Tab Content */}
      {activeTab === "myRecord" && activeSubTab === "note" && (
        <div className="animate-fade-in">
          <NoteEditor contentId={contentId} />
        </div>
      )}

      {/* Creation Tab Content */}
      {activeTab === "myRecord" && activeSubTab === "creation" && (
        <div className="animate-fade-in">
          {/* 컴팩트 안내 영역 */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { emoji: "💭", label: "What If", desc: "대체 역사, 다른 결말" },
              { emoji: "🎬", label: "매체 전환", desc: "캐스팅, 연출 상상" },
              { emoji: "🎵", label: "OST 상상", desc: "장면별 음악 선곡" },
            ].map((item) => (
              <div key={item.label} className="p-2.5 bg-bg-secondary rounded-lg text-center">
                <div className="text-lg mb-1">{item.emoji}</div>
                <div className="text-xs font-medium mb-0.5">{item.label}</div>
                <div className="text-[10px] text-text-secondary hidden sm:block">{item.desc}</div>
              </div>
            ))}
          </div>

          {/* 내 창작물 목록 (추후 API 연동) */}
          <div className="text-center py-8 text-text-secondary">
            <PenTool size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">아직 작성한 창작물이 없습니다</p>
            <p className="text-xs mt-1">+ 버튼으로 첫 창작을 시작해보세요</p>
          </div>
        </div>
      )}

      {/* 창작 탭에서만 FAB 표시 */}
      {activeSubTab === "creation" && (
        <button
          onClick={() => setIsCreationModalOpen(true)}
          className="fixed bottom-20 right-4 sm:bottom-8 sm:right-8 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-accent flex items-center justify-center shadow-lg cursor-pointer transition-all duration-300 z-20 hover:scale-110 hover:bg-accent-hover"
        >
          <Plus size={24} color="white" />
        </button>
      )}

      <CreateCreationModal
        isOpen={isCreationModalOpen}
        onClose={() => setIsCreationModalOpen(false)}
        contentTitle={content.title}
      />
    </>
  );
}
