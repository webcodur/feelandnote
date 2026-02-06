/*
  파일명: /components/features/recommendations/RecommendationModal.tsx
  기능: 추천 전송 모달
  책임: 추천 대상 선택과 메시지 입력 UI를 제공한다.
*/ // ------------------------------
"use client";

import { useState, useEffect } from "react";
import { Gift, Search, Users, Heart, Check, Send } from "lucide-react";
import Modal, { ModalBody, ModalFooter } from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { getRecommendableFriends } from "@/actions/recommendations";
import { sendRecommendation } from "@/actions/recommendations";
import type { RecommendableUser } from "@/types/recommendation";
import { getCategoryByDbType } from "@/constants/categories";

interface RecommendationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userContentId: string;
  contentTitle: string;
  contentThumbnail: string | null;
  contentType: string;
}

const RELATION_LABELS = {
  friend: { label: "친구", icon: Heart, color: "text-pink-400" },
  follower: { label: "팔로워", icon: Users, color: "text-blue-400" },
};

export default function RecommendationModal({
  isOpen,
  onClose,
  userContentId,
  contentTitle,
  contentThumbnail,
  contentType,
}: RecommendationModalProps) {
  const [friends, setFriends] = useState<RecommendableUser[]>([]);
  const [filteredFriends, setFilteredFriends] = useState<RecommendableUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 친구 목록 로드
  useEffect(() => {
    if (!isOpen) return;

    const loadFriends = async () => {
      setIsLoading(true);
      setError(null);
      const result = await getRecommendableFriends();
      if (result.success) {
        setFriends(result.data);
        setFilteredFriends(result.data);
      } else {
        setError(result.error ?? "목록을 불러올 수 없습니다.");
      }
      setIsLoading(false);
    };

    loadFriends();
  }, [isOpen]);

  // 검색 필터
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredFriends(friends);
      return;
    }

    const query = searchQuery.toLowerCase();
    setFilteredFriends(
      friends.filter((f) => f.nickname.toLowerCase().includes(query))
    );
  }, [searchQuery, friends]);

  // 모달 닫을 때 초기화
  const handleClose = () => {
    setSelectedUserId(null);
    setMessage("");
    setSearchQuery("");
    setSuccess(false);
    setError(null);
    onClose();
  };

  // 추천 전송
  const handleSend = async () => {
    if (!selectedUserId) return;

    setIsSending(true);
    setError(null);

    const result = await sendRecommendation({
      receiverId: selectedUserId,
      userContentId,
      message: message.trim() || undefined,
    });

    setIsSending(false);

    if (result.success) {
      setSuccess(true);
      setTimeout(handleClose, 1500);
    } else {
      setError(result.message ?? "추천 전송에 실패했습니다.");
    }
  };

  const categoryInfo = getCategoryByDbType(contentType);
  const selectedFriend = friends.find((f) => f.id === selectedUserId);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="콘텐츠 추천" size="lg">
      <ModalBody className="!p-0">
        {/* 성공 메시지 */}
        {success && (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center mb-5 shadow-glow animate-unlock-bounce">
              <Check size={36} className="text-accent" />
            </div>
            <p className="text-text-primary font-serif text-lg font-bold">추천 완료</p>
            <p className="text-text-secondary text-sm mt-1">
              {selectedFriend?.nickname}님에게 전송되었습니다
            </p>
          </div>
        )}

        {!success && (
          <div className="flex flex-col sm:flex-row">
            {/* ───────────────────────────────────────────────────────────────
               좌측 패널: 콘텐츠 정보 (고정 앵커)
            ─────────────────────────────────────────────────────────────── */}
            <div className="sm:w-[180px] shrink-0 p-5 bg-gradient-to-b from-stone-900 to-stone-950 border-b sm:border-b-0 sm:border-r border-border/40">
              {/* 썸네일 */}
              <div className="relative mx-auto w-fit">
                {contentThumbnail ? (
                  <img
                    src={contentThumbnail}
                    alt={contentTitle}
                    className="w-[100px] h-[140px] object-cover rounded-lg border border-accent/30 shadow-xl"
                  />
                ) : (
                  <div className="w-[100px] h-[140px] bg-bg-card rounded-lg border border-accent/30 flex items-center justify-center">
                    {categoryInfo?.icon && <categoryInfo.icon size={32} className="text-accent/50" />}
                  </div>
                )}
                {/* 카테고리 뱃지 */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-stone-800 border border-accent/40 rounded-full">
                  <span className="text-[10px] text-accent font-bold tracking-wide">
                    {categoryInfo?.label ?? contentType}
                  </span>
                </div>
              </div>

              {/* 제목 */}
              <p className="mt-5 text-sm text-text-primary font-serif font-bold text-center leading-snug line-clamp-2">
                {contentTitle}
              </p>
            </div>

            {/* ───────────────────────────────────────────────────────────────
               우측 패널: 사용자 선택 & 메시지
            ─────────────────────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* 검색바 */}
              <div className="p-4 border-b border-border/30">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                  <input
                    type="text"
                    placeholder="친구 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-stone-900/50 border border-border/50 rounded-lg text-sm font-sans text-text-primary placeholder:text-text-tertiary/60 focus:outline-none focus:border-accent/50 transition-colors"
                  />
                </div>
              </div>

              {/* 사용자 목록 */}
              <div className="flex-1 overflow-y-auto max-h-[200px] sm:max-h-[240px] custom-scrollbar">
                {isLoading && (
                  <div className="h-full flex items-center justify-center py-10">
                    <div className="text-center">
                      <div className="inline-block w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                      <p className="text-text-tertiary text-xs mt-2">불러오는 중</p>
                    </div>
                  </div>
                )}

                {!isLoading && filteredFriends.length === 0 && (
                  <div className="h-full flex items-center justify-center py-10">
                    <div className="text-center">
                      <Users size={28} className="text-text-tertiary/30 mx-auto mb-2" />
                      <p className="text-text-tertiary text-xs">
                        {searchQuery ? "검색 결과 없음" : "추천 가능한 친구 없음"}
                      </p>
                    </div>
                  </div>
                )}

                {!isLoading && filteredFriends.length > 0 && (
                  <div className="p-2 space-y-1">
                    {filteredFriends.map((friend) => {
                      const relationInfo = RELATION_LABELS[friend.relation];
                      const RelationIcon = relationInfo.icon;
                      const isSelected = selectedUserId === friend.id;

                      return (
                        <button
                          key={friend.id}
                          onClick={() => setSelectedUserId(friend.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                            isSelected
                              ? "bg-accent/15 border border-accent/40"
                              : "bg-transparent border border-transparent hover:bg-stone-800/50"
                          }`}
                        >
                          {/* 아바타 */}
                          <div className="relative shrink-0">
                            {friend.avatar_url ? (
                              <img
                                src={friend.avatar_url}
                                alt={friend.nickname}
                                className={`w-9 h-9 rounded-full object-cover border transition-colors ${
                                  isSelected ? "border-accent" : "border-border/30"
                                }`}
                              />
                            ) : (
                              <div className={`w-9 h-9 rounded-full bg-bg-card flex items-center justify-center border ${
                                isSelected ? "border-accent" : "border-border/30"
                              }`}>
                                <Users size={14} className="text-text-tertiary" />
                              </div>
                            )}
                            {isSelected && (
                              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                                <Check size={9} className="text-stone-900" strokeWidth={3} />
                              </div>
                            )}
                          </div>

                          {/* 정보 */}
                          <div className="flex-1 min-w-0 text-start">
                            <p className={`text-sm font-sans font-medium truncate ${
                              isSelected ? "text-accent" : "text-text-primary"
                            }`}>
                              {friend.nickname}
                            </p>
                            <div className={`flex items-center gap-1 text-[11px] ${relationInfo.color}`}>
                              <RelationIcon size={10} />
                              <span>{relationInfo.label}</span>
                            </div>
                          </div>

                          {/* 라디오 인디케이터 */}
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            isSelected ? "border-accent bg-accent" : "border-border/40"
                          }`}>
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-stone-900" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 메시지 입력 */}
              <div className="p-4 border-t border-border/30 bg-stone-950/30">
                <div className="relative">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value.slice(0, 200))}
                    placeholder="메시지를 남겨보세요 (선택)"
                    rows={2}
                    className="w-full px-3 py-2.5 bg-stone-900/50 border border-border/50 rounded-lg text-sm font-sans text-text-primary placeholder:text-text-tertiary/60 focus:outline-none focus:border-accent/50 transition-colors resize-none pr-14"
                  />
                  <span className="absolute bottom-2.5 right-3 text-[10px] text-text-tertiary/50">
                    {message.length}/200
                  </span>
                </div>
              </div>

              {/* 에러 */}
              {error && (
                <div className="px-4 pb-4">
                  <div className="p-2.5 bg-red-950/50 border border-red-500/30 rounded-lg">
                    <p className="text-xs text-red-400">{error}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </ModalBody>

      {!success && (
        <ModalFooter className="!py-3 !px-5 bg-stone-950/50 border-t border-border/30 justify-end gap-3">
          <Button
            unstyled
            onClick={handleClose}
            className="min-w-[100px] px-5 py-2.5 rounded-lg text-sm font-sans font-medium text-text-secondary hover:text-text-primary bg-stone-800/60 hover:bg-stone-700/60 border border-border/40 transition-colors text-center"
          >
            취소
          </Button>
          <Button
            unstyled
            onClick={handleSend}
            disabled={!selectedUserId || isSending}
            className={`min-w-[120px] px-5 py-2.5 rounded-lg text-sm font-sans font-bold transition-all flex items-center justify-center gap-2 ${
              !selectedUserId || isSending
                ? "bg-stone-800 text-text-tertiary cursor-not-allowed border border-border/30"
                : "bg-accent hover:bg-accent-hover text-stone-900 border border-accent/50"
            }`}
          >
            {isSending ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-stone-900/30 border-t-stone-900 rounded-full animate-spin" />
                전송 중
              </>
            ) : (
              <>
                <Send size={14} />
                추천 보내기
              </>
            )}
          </Button>
        </ModalFooter>
      )}
    </Modal>
  );
}

