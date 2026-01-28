/*
  파일명: /components/features/recommendations/RecommendationModal.tsx
  기능: 추천 전송 모달
  책임: 추천 대상 선택과 메시지 입력 UI를 제공한다.
*/ // ------------------------------
"use client";

import { useState, useEffect } from "react";
import { Gift, Search, Users, Heart, Check } from "lucide-react";
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

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="콘텐츠 추천" icon={Gift} size="md">
      <ModalBody>
        {/* 성공 메시지 */}
        {success && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
              <Check size={32} className="text-green-400" />
            </div>
            <p className="text-text-primary font-medium">추천을 전송했습니다</p>
          </div>
        )}

        {!success && (
          <>
            {/* 콘텐츠 미리보기 */}
            <div className="flex items-center gap-3 p-3 bg-surface rounded-xl mb-4">
              {contentThumbnail ? (
                <img
                  src={contentThumbnail}
                  alt={contentTitle}
                  className="w-12 h-16 object-cover rounded-lg"
                />
              ) : (
                <div className="w-12 h-16 bg-bg-card rounded-lg flex items-center justify-center">
                  {categoryInfo?.icon && <categoryInfo.icon size={20} className="text-text-tertiary" />}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary font-medium truncate">
                  {contentTitle}
                </p>
                <p className="text-xs text-text-tertiary">
                  {categoryInfo?.label ?? contentType}
                </p>
              </div>
            </div>

            {/* 검색 */}
            <div className="relative mb-3">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
              />
              <input
                type="text"
                placeholder="닉네임 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
              />
            </div>

            {/* 사용자 목록 */}
            <div className="max-h-48 overflow-y-auto space-y-1 mb-4">
              {isLoading && (
                <div className="py-8 text-center text-text-tertiary text-sm">
                  불러오는 중...
                </div>
              )}

              {!isLoading && filteredFriends.length === 0 && (
                <div className="py-8 text-center text-text-tertiary text-sm">
                  {searchQuery ? "검색 결과가 없습니다" : "추천할 수 있는 사용자가 없습니다"}
                </div>
              )}

              {!isLoading &&
                filteredFriends.map((friend) => {
                  const relationInfo = RELATION_LABELS[friend.relation];
                  const RelationIcon = relationInfo.icon;
                  const isSelected = selectedUserId === friend.id;

                  return (
                    <button
                      key={friend.id}
                      onClick={() => setSelectedUserId(friend.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                        isSelected
                          ? "bg-accent/10 ring-2 ring-accent"
                          : "bg-surface hover:bg-surface-hover"
                      }`}
                    >
                      {/* 아바타 */}
                      <div className="relative">
                        {friend.avatar_url ? (
                          <img
                            src={friend.avatar_url}
                            alt={friend.nickname}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-bg-card flex items-center justify-center">
                            <Users size={18} className="text-text-tertiary" />
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                            <Check size={12} className="text-white" />
                          </div>
                        )}
                      </div>

                      {/* 닉네임 */}
                      <div className="flex-1 min-w-0 text-start">
                        <p className="text-sm text-text-primary font-medium truncate">
                          {friend.nickname}
                        </p>
                        <div className={`flex items-center gap-1 text-xs ${relationInfo.color}`}>
                          <RelationIcon size={12} />
                          <span>{relationInfo.label}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>

            {/* 메시지 입력 */}
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">
                메시지 (선택)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 200))}
                placeholder="추천 메시지를 입력하세요..."
                rows={2}
                className="w-full px-3 py-2.5 bg-surface border border-border rounded-xl text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent resize-none"
              />
              <p className="text-xs text-text-tertiary text-end mt-1">
                {message.length}/200
              </p>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}
          </>
        )}
      </ModalBody>

      {!success && (
        <ModalFooter>
          <Button
            unstyled
            onClick={handleClose}
            className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm bg-white/5 hover:bg-white/10 text-text-primary border border-border"
          >
            취소
          </Button>
          <Button
            unstyled
            onClick={handleSend}
            disabled={!selectedUserId || isSending}
            className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm ${
              !selectedUserId || isSending
                ? "bg-accent/50 text-white/50 cursor-not-allowed"
                : "bg-accent hover:bg-accent-hover text-white"
            }`}
          >
            {isSending ? "전송 중..." : "추천하기"}
          </Button>
        </ModalFooter>
      )}
    </Modal>
  );
}
