"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import { SacredFlameIcon, MessageTabletIcon } from "@/components/ui/icons/neo-pantheon";
import { cn } from "@/lib/utils/index";
import FormattedText from "@/components/ui/FormattedText";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface RecordInteractionsProps {
  recordId: string;
  initialLikeCount?: number;
  initialCommentCount?: number;
  initialLiked?: boolean;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user: {
    id: string;
    nickname: string;
    avatar_url: string | null;
  };
}

export default function RecordInteractions({
  recordId,
  initialLikeCount = 0,
  initialCommentCount = 0,
  initialLiked = false,
}: RecordInteractionsProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  
  const supabase = createClient();

  useEffect(() => {
    // 좋아요 상태 확인
    const checkStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("record_likes")
        .select("id")
        .eq("record_id", recordId)
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (data) setLiked(true);
    };
    checkStatus();
  }, [recordId]);

  const toggleLike = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }

    const prevLiked = liked;
    setLiked(!prevLiked);
    setLikeCount((prev) => (prevLiked ? prev - 1 : prev + 1));

    if (prevLiked) {
       await supabase.from("record_likes").delete().eq("record_id", recordId).eq("user_id", user.id);
    } else {
       await supabase.from("record_likes").insert({ record_id: recordId, user_id: user.id });
    }
  };

  const loadComments = async () => {
    if (showComments) {
      setShowComments(false);
      return;
    }

    setIsLoadingComments(true);
    setShowComments(true);

    const { data } = await supabase
      .from("record_comments")
      .select(`
        id,
        content,
        created_at,
        user:user_id (id, nickname, avatar_url)
      `)
      .eq("record_id", recordId)
      .order("created_at", { ascending: true });

    if (data) {
      // @ts-ignore
      setComments(data);
    }
    setIsLoadingComments(false);
  };

  const submitComment = async () => {
    if (!newComment.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        alert("로그인이 필요합니다.");
        return;
    }

    const { data, error } = await supabase
      .from("record_comments")
      .insert({
        record_id: recordId,
        user_id: user.id,
        content: newComment
      })
      .select(`
        id,
        content,
        created_at,
        user:user_id (id, nickname, avatar_url)
      `)
      .single();

    if (data) {
        // @ts-ignore
        setComments(prev => [...prev, data]);
        setNewComment("");
        setCommentCount(prev => prev + 1);
    }
  };

  return (
    <div className="mt-4 border-t border-white/5 pt-3">
      {/* 액션 버튼 */}
      <div className="flex items-center gap-4">
        <Button 
          unstyled 
          onClick={toggleLike}
          className={cn("flex items-center gap-1.5 text-sm transition-colors", liked ? "text-red-400" : "text-text-secondary hover:text-text-primary")}
        >
          <SacredFlameIcon size={18} className={liked ? "fill-current" : ""} />
          <span>{likeCount}</span>
        </Button>
        
        <Button 
            unstyled 
            onClick={loadComments}
            className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
            <MessageTabletIcon size={18} />
            <span>{commentCount}</span>
        </Button>
      </div>

      {/* 댓글 섹션 */}
      {showComments && (
        <div className="mt-4 animate-fade-in">
            {/* 댓글 목록 */}
            <div className="space-y-4 mb-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {isLoadingComments ? (
                    <div className="text-center text-xs text-text-tertiary py-4">로딩 중...</div>
                ) : comments.length > 0 ? (
                    comments.map(comment => (
                        <div key={comment.id} className="flex gap-3 text-sm">
                            <div className="w-8 h-8 rounded-full bg-bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                                {comment.user.avatar_url ? (
                                    <img src={comment.user.avatar_url} alt={comment.user.nickname} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-xs text-text-tertiary">{comment.user.nickname.charAt(0)}</span>
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-text-primary">{comment.user.nickname}</span>
                                    <span className="text-[10px] text-text-tertiary">
                                        {format(new Date(comment.created_at), "yyyy.MM.dd HH:mm", { locale: ko })}
                                    </span>
                                </div>
                                <p className="text-text-secondary whitespace-pre-wrap leading-relaxed"><FormattedText text={comment.content} /></p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center text-xs text-text-tertiary py-4">첫 번째 댓글을 남겨보세요.</div>
                )}
            </div>

            {/* 댓글 입력 */}
            <div className="flex gap-2">
                <input 
                    type="text" 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && submitComment()}
                    placeholder="댓글을 입력하세요..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
                />
                <Button variant="secondary" size="sm" onClick={submitComment} disabled={!newComment.trim()}>
                    등록
                </Button>
            </div>
        </div>
      )}
    </div>
  );
}
