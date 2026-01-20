"use client";

import { useState } from "react";
import { Quote, Pencil, Check, MapPin, Calendar } from "lucide-react";
import { type PublicUserProfile, updateProfile } from "@/actions/user";
import NationalityText from "@/components/ui/NationalityText";
import ClassicalBox from "@/components/ui/ClassicalBox";
import { DecorativeLabel } from "@/components/ui";

interface UserBioSectionProps {
  profile: PublicUserProfile;
  isOwner: boolean;
}

export default function UserBioSection({ profile, isOwner }: UserBioSectionProps) {
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioValue, setBioValue] = useState(profile.bio || "");
  const [isSaving, setIsSaving] = useState(false);

  const hasInfo = profile.nationality || profile.birth_date || profile.quotes;

  // 정보가 전혀 없고 본인도 아니면 섹션 자체를 숨김
  if (!hasInfo && !profile.bio && !isOwner) return null;

  const handleSaveBio = async () => {
    if (isSaving) return;
    setIsSaving(true);
    const result = await updateProfile({ bio: bioValue });
    if (result.success) setIsEditingBio(false);
    setIsSaving(false);
  };

  const handleCancelEdit = () => {
    setBioValue(profile.bio || "");
    setIsEditingBio(false);
  };

  return (
    <ClassicalBox as="section" className="p-4 sm:p-6 bg-bg-card/40 border-accent/20 shadow-xl">
      {/* 헤더 */}
      <div className="flex justify-center mb-4 relative">
        <DecorativeLabel label="소개" />
        {isOwner && !isEditingBio && (
          <button onClick={() => setIsEditingBio(true)} className="absolute right-0 top-1/2 -translate-y-1/2 p-1.5 text-text-secondary hover:text-accent hover:bg-accent/10 rounded-sm" title="소개글 수정">
            <Pencil size={14} />
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* 메타 정보 (국적, 생일) */}
        {(profile.nationality || profile.birth_date) && (
          <div className="flex flex-wrap gap-4 text-sm">
            {profile.nationality && (
              <div className="flex items-center gap-2 text-text-secondary">
                <MapPin size={14} className="text-accent/60" />
                <NationalityText code={profile.nationality} />
              </div>
            )}
            {profile.birth_date && (
              <div className="flex items-center gap-2 text-text-secondary">
                <Calendar size={14} className="text-accent/60" />
                <span>{profile.birth_date}</span>
              </div>
            )}
          </div>
        )}

        {/* Bio */}
        {isEditingBio ? (
          <div className="space-y-3">
            <textarea
              value={bioValue}
              onChange={(e) => setBioValue(e.target.value)}
              placeholder="자기소개를 입력하세요..."
              className="w-full bg-black/30 border border-accent/20 rounded-sm p-3 text-sm text-text-primary resize-none focus:outline-none focus:border-accent/40 placeholder:text-text-secondary/50"
              rows={3}
              maxLength={200}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-secondary">{bioValue.length} / 200</span>
              <div className="flex items-center gap-2">
                <button onClick={handleCancelEdit} className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary">취소</button>
                <button onClick={handleSaveBio} disabled={isSaving} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-accent/20 text-accent rounded-sm hover:bg-accent/30 disabled:opacity-50">
                  <Check size={12} />저장
                </button>
              </div>
            </div>
          </div>
        ) : profile.bio ? (
          <p className="text-sm text-text-primary leading-relaxed">{profile.bio}</p>
        ) : isOwner ? (
          <p className="text-sm text-text-secondary/50 italic">자기소개를 작성해보세요...</p>
        ) : null}

        {/* 좌우명 */}
        {profile.quotes && (
          <div className="flex items-start gap-3 pt-3 border-t border-border/30">
            <Quote size={16} className="text-accent/40 shrink-0 mt-0.5" />
            <p className="text-sm text-text-secondary italic leading-relaxed">&ldquo;{profile.quotes}&rdquo;</p>
          </div>
        )}
      </div>
    </ClassicalBox>
  );
}
