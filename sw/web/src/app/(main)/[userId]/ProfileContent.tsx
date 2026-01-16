"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Quote, Pencil, Check, X, Eye, EyeOff, ExternalLink, Loader2, Sparkles, User, Trash2, AlertTriangle } from "lucide-react";
import { type PublicUserProfile, updateProfile, updateApiKey } from "@/actions/user";
import { deleteAccount } from "@/actions/auth";
import NationalityText from "@/components/ui/NationalityText";
import { getCelebProfessionLabel } from "@/constants/celebProfessions";
import { type UserContentPublic } from "@/actions/contents/getUserContents";
import { type ActivityLogWithContent } from "@/types/database";
import ActivityTimeline from "@/components/features/archive/ActivityTimeline";
import RecentRecords from "@/components/features/archive/user/RecentRecords";

const formatYear = (year: string | null | undefined) => {
  if (!year) return "";
  const num = parseInt(year);
  if (isNaN(num)) return year;
  if (num < 0) return `BC ${Math.abs(num)}`;
  return `AD ${num}`;
};

interface ProfileContentProps {
  profile: PublicUserProfile;
  userId: string;
  isOwner: boolean;
  recentContents: UserContentPublic[];
  activityLogs: ActivityLogWithContent[];
  initialApiKey?: string | null;
}

export default function ProfileContent({
  profile,
  userId,
  isOwner,
  recentContents,
  activityLogs,
  initialApiKey,
}: ProfileContentProps) {
  // Bio 편집 상태
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioValue, setBioValue] = useState(profile.bio || "");
  const [isSaving, setIsSaving] = useState(false);

  // 프로필 편집 상태
  const [nickname, setNickname] = useState(profile.nickname);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  // API 키 상태
  const [apiKey, setApiKey] = useState(initialApiKey || "");
  const [showKey, setShowKey] = useState(false);
  const [isSavingApiKey, setIsSavingApiKey] = useState(false);
  const [apiKeySaveSuccess, setApiKeySaveSuccess] = useState(false);

  // 회원탈퇴 상태
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmText = "탈퇴합니다";
  const canDelete = deleteConfirmInput === confirmText;

  const handleSaveBio = async () => {
    if (isSaving) return;
    setIsSaving(true);
    const result = await updateProfile({ bio: bioValue });
    if (result.success) {
      setIsEditingBio(false);
    }
    setIsSaving(false);
  };

  const handleCancelEdit = () => {
    setBioValue(profile.bio || "");
    setIsEditingBio(false);
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    const result = await updateProfile({
      nickname,
      avatar_url: avatarUrl || undefined,
    });
    if (result.success) {
      setProfileSaveSuccess(true);
      setTimeout(() => setProfileSaveSuccess(false), 2000);
    }
    setIsSavingProfile(false);
  };

  const handleSaveApiKey = async () => {
    setIsSavingApiKey(true);
    await updateApiKey({ geminiApiKey: apiKey });
    setApiKeySaveSuccess(true);
    setTimeout(() => setApiKeySaveSuccess(false), 2000);
    setIsSavingApiKey(false);
  };

  const handleDeleteAccount = async () => {
    if (!canDelete) return;
    setIsDeleting(true);
    await deleteAccount();
  };

  const hasProfileChanges = nickname !== profile.nickname || avatarUrl !== (profile.avatar_url || "");
  const hasApiKeyChanges = apiKey !== (initialApiKey || "");

  return (
    <div className="space-y-12">
      {/* 1. Bio & Profile Info Section */}
      <section className="card-classical p-8 md:p-10 bg-bg-card/40 border-accent/20 shadow-2xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-gradient-to-l from-accent/30 to-transparent" />
          <span className="text-serif text-accent text-sm tracking-widest font-black shadow-glow">
            소개
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-accent/30 to-transparent" />
          {isOwner && !isEditingBio && (
            <button
              onClick={() => setIsEditingBio(true)}
              className="p-2 text-text-secondary hover:text-accent hover:bg-accent/10 rounded-sm transition-all"
              title="소개글 수정"
            >
              <Pencil size={16} />
            </button>
          )}
        </div>

        {/* Portrait + Info Layout */}
        <div className="flex flex-col md:flex-row gap-8">
          {/* Portrait Image - 고전 액자 스타일 (액자 포함 전체가 우측 높이와 1:1 정렬) */}
          {profile.portrait_url && (
            <div className="flex-shrink-0">
              <div className="relative w-52 md:w-64 h-full">
                {/* 외곽 프레임 - inset-0으로 경계 일치 */}
                <div className="absolute inset-0 bg-gradient-to-b from-stone-700 via-stone-800 to-stone-900 rounded-sm shadow-2xl" />
                {/* 내부 프레임 장식 */}
                <div className="absolute inset-1 border-2 border-stone-600/50 rounded-sm" />
                <div className="absolute inset-2 border border-stone-500/30 rounded-sm" />
                {/* 모서리 장식 - 경계선에 딱 맞춤 */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-stone-500/80 rounded-tl-sm" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-stone-500/80 rounded-tr-sm" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-stone-500/80 rounded-bl-sm" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-stone-500/80 rounded-br-sm" />
                {/* 이미지 - 프레임 두께(약 12px)만큼 여백을 주어 안쪽에 배치 */}
                <div className="absolute inset-3 rounded-sm overflow-hidden border border-stone-900 bg-stone-950">
                  <Image
                    src={profile.portrait_url}
                    alt={profile.nickname}
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Info + Bio + Quote - 개별 요소 구조 (시각적 조화 강화) */}
          <div className="flex-1 flex flex-col gap-4 min-h-[400px] md:min-h-0">
            {/* 1. 인물 정보 (Metadata) - 석판 스타일 */}
            {(profile.profession || profile.nationality || profile.birth_date || profile.death_date) && (
              <div className="relative p-5 bg-gradient-to-br from-stone-900/80 to-stone-950/90 rounded-sm overflow-hidden group/info">
                {/* 배경 디테일 */}
                <div className="absolute inset-0 border border-stone-800/60 rounded-sm transition-colors group-hover/info:border-stone-700/80" />
                <div className="absolute inset-[1px] border border-stone-700/20 rounded-sm" />
                
                <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
                  {profile.profession && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-stone-500 uppercase tracking-[0.3em] font-cinzel block">PROFESSION</span>
                      <p className="text-base text-stone-200 font-serif font-black">{getCelebProfessionLabel(profile.profession)}</p>
                    </div>
                  )}
                  {profile.nationality && (
                    <div className="space-y-1 relative">
                      {/* 가가운 구분선 (데스크탑) */}
                      <div className="hidden sm:block absolute left-[-12px] top-1/2 -translate-y-1/2 w-px h-6 bg-stone-700/40" />
                      <span className="text-[10px] text-stone-500 uppercase tracking-[0.3em] font-cinzel block">NATIONALITY</span>
                      <p className="text-base text-stone-200 font-serif font-black">
                        <NationalityText code={profile.nationality} />
                      </p>
                      <div className="hidden sm:block absolute right-[-12px] top-1/2 -translate-y-1/2 w-px h-6 bg-stone-700/40" />
                    </div>
                  )}
                  {(profile.birth_date || profile.death_date) && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-stone-500 uppercase tracking-[0.3em] font-cinzel block">PERIOD</span>
                      <p className="text-base text-stone-200 font-serif font-black">
                        {profile.birth_date ? formatYear(profile.birth_date) : "?"} — {profile.death_date ? formatYear(profile.death_date) : "Present"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. 소개글 (Bio) - 가독성 중심 블록 */}
            <div className="flex-1 flex flex-col justify-center">
              {isEditingBio ? (
                <div className="w-full relative p-5 bg-stone-900/40 border border-stone-700/50 rounded-sm">
                  <div className="mb-3">
                    <span className="text-[10px] text-stone-500 uppercase tracking-[0.3em] font-cinzel block mb-1">INSCRIPTION</span>
                  </div>
                  <textarea
                    value={bioValue}
                    onChange={(e) => setBioValue(e.target.value)}
                    placeholder="나를 표현하는 문구를 입력하세요..."
                    className="w-full bg-black/30 border border-stone-800/50 rounded-sm p-4 text-base text-stone-200 font-serif resize-none focus:outline-none focus:border-accent/30 placeholder:text-stone-700"
                    rows={3}
                    maxLength={200}
                  />
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-stone-600 font-serif">
                      {bioValue.length} / 200
                    </span>
                    <div className="flex items-center gap-3">
                      <button onClick={handleCancelEdit} className="text-sm text-stone-500 hover:text-stone-300 font-serif">취소</button>
                      <button
                        onClick={handleSaveBio}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-1.5 text-sm bg-stone-800 text-stone-200 font-black rounded-sm border border-stone-700 hover:bg-stone-700 disabled:opacity-50"
                      >
                        <Check size={14} className="text-accent" />
                        저장
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                (profile.bio?.trim() || isOwner) && (
                  <div className="relative p-6 bg-gradient-to-b from-stone-900/40 to-stone-950/60 rounded-sm border border-stone-800/40 group/bio overflow-hidden">
                    {/* 레이블 추가 */}
                    <div className="mb-3 text-center">
                      <span className="text-[10px] text-stone-500 uppercase tracking-[0.3em] font-cinzel block">INSCRIPTION</span>
                    </div>
                    {/* 미세한 광택 효과 */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-stone-700/20 to-transparent" />
                    
                    <p className="relative text-base md:text-lg text-stone-300 font-serif leading-relaxed text-center group-hover/bio:text-stone-200 transition-colors">
                      {profile.bio?.trim() ? (
                        profile.bio
                      ) : (
                        <span className="text-stone-700 tracking-widest uppercase text-xs font-cinzel">No Bio Inscribed...</span>
                      )}
                    </p>
                  </div>
                )
              )}
            </div>

            {/* 3. 명언 (Quote) - 하단 강조 (셀럽 전용) */}
            {profile.profile_type === "CELEB" && profile.quotes && (
              <div className="relative p-5 bg-black/40 border-l-4 border-accent rounded-sm shadow-2xl group/quote transition-all hover:bg-black/60">
                {/* 레이블 추가 */}
                <div className="mb-2 text-center">
                  <span className="text-[10px] text-stone-500/60 uppercase tracking-[0.3em] font-cinzel block">WISDOM</span>
                </div>
                {/* 배경 장식 */}
                <div className="absolute inset-0 bg-gradient-to-r from-accent/[0.03] to-transparent pointer-events-none" />
                
                <div className="flex items-center gap-4 text-center justify-center">
                  <Quote size={18} className="text-accent opacity-30 rotate-180 group-hover/quote:opacity-100 transition-opacity" />
                  <p className="text-base text-accent font-serif font-black tracking-tight leading-snug drop-shadow-sm">
                    {profile.quotes}
                  </p>
                  <Quote size={18} className="text-accent opacity-30 group-hover/quote:opacity-100 transition-opacity" />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2. Recent Records */}
      <section className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <div className="flex items-center justify-between mb-8 px-2">
          <h2 className="text-2xl md:text-3xl font-serif text-text-primary tracking-tight font-black drop-shadow-xl flex items-center gap-3">
            <span className="w-2 h-8 bg-accent rounded-full shadow-glow" />
            최근 기록
          </h2>
          <Link
            href={`/${userId}/records`}
            className="text-sm font-serif text-accent hover:text-white flex items-center gap-2 transition-all group font-black bg-accent/10 px-4 py-2 rounded-sm border border-accent/20 hover:bg-accent shadow-sm"
          >
            전체 기록 탐색
            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        <div className="card-classical p-6 md:p-8 bg-bg-card/50 shadow-2xl border-accent-dim/20">
          <RecentRecords items={recentContents} userId={userId} />
        </div>
      </section>

      {/* 3. Highlights (리뷰 + 완료) */}
      {activityLogs.length > 0 && (
        <section className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center gap-3 mb-8 px-2">
            <span className="w-2 h-8 bg-accent rounded-full shadow-glow" />
            <h2 className="text-2xl md:text-3xl font-serif text-text-primary tracking-tight font-black drop-shadow-xl">
              하이라이트
            </h2>
          </div>
          <div className="card-classical p-8 md:p-12 bg-bg-card/30 shadow-2xl border-accent-dim/10">
            <ActivityTimeline logs={activityLogs} />
          </div>
        </section>
      )}

      {/* 4. Settings (Owner only) */}
      {isOwner && (
        <section className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <div className="flex items-center gap-3 mb-8 px-2">
            <span className="w-2 h-8 bg-accent rounded-full shadow-glow" />
            <h2 className="text-2xl md:text-3xl font-serif text-text-primary tracking-tight font-black drop-shadow-xl">
              설정
            </h2>
          </div>

          <div className="space-y-6">
            {/* 프로필 편집 카드 */}
            <div className="card-classical p-6 md:p-8 bg-bg-card/40 shadow-2xl border-accent-dim/20">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <User size={20} className="text-accent" />
                  <h3 className="text-lg font-serif font-bold text-text-primary">프로필</h3>
                </div>
                <div className="flex items-center gap-2">
                  {profileSaveSuccess && <Check size={16} className="text-green-400" />}
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile || !hasProfileChanges}
                    className="px-4 py-2 text-sm bg-accent text-bg-main font-bold rounded-sm hover:bg-accent-hover disabled:opacity-50"
                  >
                    {isSavingProfile ? <Loader2 size={14} className="animate-spin" /> : "저장"}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  {avatarUrl ? (
                    <div className="relative w-16 h-16 shrink-0">
                      <Image src={avatarUrl} alt="프로필" fill unoptimized className="rounded-full object-cover ring-2 ring-accent/30" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-2xl font-bold text-accent ring-2 ring-accent/30 shrink-0">
                      {nickname.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <label className="text-xs text-text-secondary mb-1 block">닉네임</label>
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      maxLength={20}
                      className="w-full h-10 bg-black/30 border border-accent/20 rounded-sm px-3 text-sm text-text-primary outline-none focus:border-accent/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-text-secondary mb-1 block">프로필 이미지 URL</label>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full h-10 bg-black/30 border border-accent/20 rounded-sm px-3 text-sm text-text-primary outline-none focus:border-accent/50 placeholder:text-text-secondary/50"
                  />
                </div>
              </div>
            </div>

            {/* AI 설정 카드 */}
            <div className="card-classical p-6 md:p-8 bg-bg-card/40 shadow-2xl border-accent-dim/20">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Sparkles size={20} className="text-accent" />
                  <h3 className="text-lg font-serif font-bold text-text-primary">AI 설정</h3>
                </div>
                <div className="flex items-center gap-2">
                  {apiKeySaveSuccess && <Check size={16} className="text-green-400" />}
                  <button
                    onClick={handleSaveApiKey}
                    disabled={isSavingApiKey || !hasApiKeyChanges}
                    className="px-4 py-2 text-sm bg-accent text-bg-main font-bold rounded-sm hover:bg-accent-hover disabled:opacity-50"
                  >
                    {isSavingApiKey ? <Loader2 size={14} className="animate-spin" /> : "저장"}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <label className="text-xs text-text-secondary mb-1 block">Gemini API 키</label>
                  <div className="relative">
                    <input
                      type={showKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="API 키 입력"
                      className="w-full h-10 bg-black/30 border border-accent/20 rounded-sm px-3 pr-10 text-sm text-text-primary outline-none focus:border-accent/50 placeholder:text-text-secondary/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                    >
                      {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-accent hover:underline"
                  >
                    <ExternalLink size={12} />
                    API 키 발급
                  </a>
                  <span>AI 리뷰 생성, 줄거리 요약에 사용</span>
                </div>
              </div>
            </div>

            {/* 위험 영역 카드 */}
            <div className="card-classical p-6 md:p-8 bg-bg-card/40 shadow-2xl border-red-500/30">
              <div className="flex items-center gap-3 mb-6">
                <Trash2 size={20} className="text-red-400" />
                <h3 className="text-lg font-serif font-bold text-red-400">위험 영역</h3>
              </div>

              {!showDeleteConfirm ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-primary">회원탈퇴</p>
                    <p className="text-xs text-text-secondary mt-1">모든 기록, 플레이리스트, 팔로우 정보가 영구 삭제된다.</p>
                  </div>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 text-sm text-red-400 border border-red-500/30 rounded-sm hover:bg-red-500/10"
                  >
                    탈퇴하기
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-red-500/10 rounded-sm border border-red-500/20">
                    <AlertTriangle size={18} className="text-red-400 mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-red-400">정말 탈퇴하시겠습니까?</p>
                      <p className="text-text-secondary mt-1">이 작업은 되돌릴 수 없다. 모든 데이터가 즉시 삭제된다.</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary mb-2">
                      확인을 위해 <span className="text-red-400 font-medium">{confirmText}</span>를 입력
                    </p>
                    <input
                      type="text"
                      value={deleteConfirmInput}
                      onChange={(e) => setDeleteConfirmInput(e.target.value)}
                      placeholder={confirmText}
                      className="w-full h-10 bg-black/30 border border-red-500/30 rounded-sm px-3 text-sm text-text-primary outline-none focus:border-red-500/50 placeholder:text-text-secondary/50"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmInput("");
                      }}
                      disabled={isDeleting}
                      className="flex-1 px-4 py-2 text-sm text-text-secondary border border-border rounded-sm hover:bg-white/5"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={!canDelete || isDeleting}
                      className="flex-1 px-4 py-2 text-sm bg-red-500/20 text-red-400 rounded-sm hover:bg-red-500/30 disabled:opacity-50"
                    >
                      {isDeleting ? <Loader2 size={14} className="animate-spin mx-auto" /> : "영구 삭제"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
