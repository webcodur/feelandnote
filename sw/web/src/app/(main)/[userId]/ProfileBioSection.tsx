"use client";

import { useState } from "react";
import Image from "next/image";
import { Quote, Pencil, Check } from "lucide-react";
import { type PublicUserProfile, updateProfile } from "@/actions/user";
import NationalityText from "@/components/ui/NationalityText";
import { getCelebProfessionLabel } from "@/constants/celebProfessions";
import ClassicalBox from "@/components/ui/ClassicalBox";
import { DecorativeLabel, InnerBox } from "@/components/ui";

const formatYear = (year: string | null | undefined) => {
  if (!year) return "";
  const num = parseInt(year);
  if (isNaN(num)) return year;
  return num < 0 ? `BC ${Math.abs(num)}` : `AD ${num}`;
};

interface ProfileBioSectionProps {
  profile: PublicUserProfile;
  isOwner: boolean;
}

export default function ProfileBioSection({ profile, isOwner }: ProfileBioSectionProps) {
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioValue, setBioValue] = useState(profile.bio || "");
  const [isSaving, setIsSaving] = useState(false);

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
    <ClassicalBox as="section" className="p-3 sm:p-5 md:p-10 md:pt-8 bg-bg-card/40 border-accent/20 shadow-2xl">
      {/* 헤더 */}
      <div className="flex justify-center mb-6 sm:mb-10">
        <DecorativeLabel label="계보" />
        {isOwner && !isEditingBio && (
          <button onClick={() => setIsEditingBio(true)} className="absolute right-4 md:right-8 top-6 md:top-8 p-1.5 sm:p-2 text-text-secondary hover:text-accent hover:bg-accent/10 rounded-sm transition-colors" title="소개글 수정">
            <Pencil size={14} className="sm:size-4" />
          </button>
        )}
      </div>

      {/* Portrait + Info Layout */}
      <div className="flex flex-col md:flex-row gap-4 sm:gap-8">
        {/* Portrait Image */}
        {profile.portrait_url && <PortraitFrame url={profile.portrait_url} alt={profile.nickname} />}

        {/* Info + Bio + Quote */}
        <div className="flex-1 flex flex-col gap-3 sm:gap-4 min-h-0">
          <ProfileMetadata profile={profile} />
          <BioContent isEditing={isEditingBio} bioValue={bioValue} setBioValue={setBioValue} profile={profile} isOwner={isOwner} isSaving={isSaving} onSave={handleSaveBio} onCancel={handleCancelEdit} />
          {profile.quotes && <QuoteBlock quote={profile.quotes} isCeleb={profile.profile_type === "CELEB"} />}
        </div>
      </div>
    </ClassicalBox>
  );
}

// #region 하위 컴포넌트
function PortraitFrame({ url, alt }: { url: string; alt: string }) {
  return (
    <div className="flex-shrink-0 flex justify-center">
      <div className="relative w-40 sm:w-52 md:w-64 aspect-[3/4] md:h-full min-h-[210px] sm:min-h-[260px] md:min-h-[320px]">
        {/* Frame Outer Relief */}
        <div className="absolute inset-0 bg-gradient-to-br from-stone-600 via-stone-800 to-stone-950 rounded-sm shadow-[0_10px_30px_rgba(0,0,0,0.8),inset_0_0_20px_rgba(255,255,255,0.05)]" />
        
        {/* Inner Engraved Borders */}
        <div className="absolute inset-1 sm:inset-1.5 border border-stone-500/30 rounded-sm" />
        <div className="absolute inset-2 sm:inset-3 border border-black/40 rounded-sm shadow-inner" />
        
        {/* Corner Brackets (Enhanced for visibility) */}
        <div className="absolute top-0 start-0 w-6 h-6 border-t-2 border-s-2 border-stone-400/60 rounded-tl-sm z-20" />
        <div className="absolute top-0 end-0 w-6 h-6 border-t-2 border-e-2 border-stone-400/60 rounded-tr-sm z-20" />
        <div className="absolute bottom-0 start-0 w-6 h-6 border-b-2 border-s-2 border-stone-400/60 rounded-bl-sm z-20" />
        <div className="absolute bottom-0 end-0 w-6 h-6 border-b-2 border-e-2 border-stone-400/60 rounded-br-sm z-20" />
        
        {/* Image Container */}
        <div className="absolute inset-2.5 sm:inset-4 rounded-sm overflow-hidden border border-stone-950 bg-stone-950 shadow-[inset_0_5px_15px_rgba(0,0,0,0.7)] group">
          <Image src={url} alt={alt} fill className="object-cover group-hover:scale-110 transition-transform duration-1000 opacity-90 group-hover:opacity-100" />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/40 to-transparent pointer-events-none" />
        </div>
      </div>
    </div>
  );
}

function ProfileMetadata({ profile }: { profile: PublicUserProfile }) {
  const isCeleb = profile.profile_type === "CELEB";
  // 일반 유저: profession, death_date 제외
  const hasMetadata = isCeleb
    ? profile.profession || profile.nationality || profile.birth_date || profile.death_date
    : profile.nationality || profile.birth_date;

  if (!hasMetadata) return null;

  return (
    <InnerBox className="p-3 sm:p-5 group/info">
      <div className="relative grid grid-cols-2 sm:grid-cols-3 gap-x-2 sm:gap-x-6 gap-y-4 text-center">
        {isCeleb && profile.profession && (
          <div className="space-y-1">
            <span className="text-[9px] text-stone-500 uppercase tracking-widest font-cinzel block opacity-70">Profession</span>
            <p className="text-sm sm:text-base text-stone-200 font-serif font-black">{getCelebProfessionLabel(profile.profession)}</p>
          </div>
        )}
        {profile.nationality && (
          <div className="space-y-1 relative">
            <div className="hidden sm:block absolute start-[-12px] top-1/2 -translate-y-1/2 w-px h-6 bg-stone-700/40" />
            <span className="text-[9px] text-stone-500 uppercase tracking-widest font-cinzel block opacity-70">{isCeleb ? "Nationality" : "Region"}</span>
            <p className="text-sm sm:text-base text-stone-200 font-serif font-black flex items-center justify-center gap-1.5">
              <NationalityText code={profile.nationality} />
            </p>
            <div className="hidden sm:block absolute end-[-12px] top-1/2 -translate-y-1/2 w-px h-6 bg-stone-700/40" />
          </div>
        )}
        {isCeleb && (profile.birth_date || profile.death_date) && (
          <div className="space-y-1 col-span-2 sm:col-span-1 border-t border-stone-800/60 pt-4 sm:border-0 sm:pt-0">
            <span className="text-[9px] text-stone-500 uppercase tracking-widest font-cinzel block opacity-70">Period of Existence</span>
            <p className="text-xs sm:text-base text-stone-200 font-serif font-black tracking-tight">
              {profile.birth_date ? formatYear(profile.birth_date) : "?"} — {profile.death_date ? formatYear(profile.death_date) : "Present"}
            </p>
          </div>
        )}
        {!isCeleb && profile.birth_date && (
          <div className="space-y-1 col-span-2 sm:col-span-1 border-t border-stone-800/60 pt-4 sm:border-0 sm:pt-0">
            <span className="text-[9px] text-stone-500 uppercase tracking-widest font-cinzel block opacity-70">Birthday</span>
            <p className="text-xs sm:text-base text-stone-200 font-serif font-black tracking-tight">{profile.birth_date}</p>
          </div>
        )}
      </div>
    </InnerBox>
  );
}

interface BioContentProps {
  isEditing: boolean;
  bioValue: string;
  setBioValue: (v: string) => void;
  profile: PublicUserProfile;
  isOwner: boolean;
  isSaving: boolean;
  onSave: () => void;
  onCancel: () => void;
}

function BioContent({ isEditing, bioValue, setBioValue, profile, isOwner, isSaving, onSave, onCancel }: BioContentProps) {
  if (isEditing) {
    return (
      <div className="flex-1 flex flex-col justify-center">
        <InnerBox variant="subtle" className="w-full p-5">
          <div className="mb-3">
            <span className="text-[10px] text-stone-500 uppercase tracking-[0.3em] font-cinzel block mb-1">INSCRIPTION</span>
          </div>
          <textarea value={bioValue} onChange={(e) => setBioValue(e.target.value)} placeholder="나를 표현하는 문구를 입력하세요..." className="w-full bg-black/30 border border-stone-800/50 rounded-sm p-4 text-base text-stone-200 font-serif resize-none focus:outline-none focus:border-accent/30 placeholder:text-stone-700" rows={3} maxLength={200} />
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-stone-600 font-serif">{bioValue.length} / 200</span>
            <div className="flex items-center gap-3">
              <button onClick={onCancel} className="text-sm text-stone-500 hover:text-stone-300 font-serif">취소</button>
              <button onClick={onSave} disabled={isSaving} className="flex items-center gap-2 px-4 py-1.5 text-sm bg-stone-800 text-stone-200 font-black rounded-sm border border-stone-700 hover:bg-stone-700 disabled:opacity-50">
                <Check size={14} className="text-accent" />저장
              </button>
            </div>
          </div>
        </InnerBox>
      </div>
    );
  }

  if (!profile.bio?.trim() && !isOwner) return null;

  return (
    <div className="flex-1 flex flex-col justify-center">
      <InnerBox variant="subtle" className="p-6 group/bio">
        <div className="mb-3 text-center">
          <span className="text-[10px] text-stone-500 uppercase tracking-[0.3em] font-cinzel block">INSCRIPTION</span>
        </div>
        <div className="absolute top-0 start-0 w-full h-1 bg-gradient-to-r from-transparent via-stone-700/20 to-transparent" />
        <p className="relative text-sm md:text-lg text-stone-300 font-serif leading-relaxed text-center group-hover/bio:text-stone-200">
          {profile.bio?.trim() || <span className="text-stone-700 tracking-widest uppercase text-xs font-cinzel">No Bio Inscribed...</span>}
        </p>
      </InnerBox>
    </div>
  );
}

function QuoteBlock({ quote, isCeleb }: { quote: string; isCeleb: boolean }) {
  return (
    <div className="relative p-5 bg-black/40 border-l-4 border-accent rounded-sm shadow-2xl group/quote hover:bg-black/60">
      <div className="mb-2 text-center">
        <span className="text-[10px] text-stone-500/60 uppercase tracking-[0.3em] font-cinzel block">{isCeleb ? "WISDOM" : "MOTTO"}</span>
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-accent/[0.03] to-transparent pointer-events-none" />
      <div className="flex items-center gap-4 text-center justify-center">
        <Quote size={14} className="text-accent opacity-30 rotate-180 group-hover/quote:opacity-100 shrink-0" />
        <p className="text-sm md:text-base text-accent font-serif font-black tracking-tight leading-snug drop-shadow-sm">{quote}</p>
        <Quote size={14} className="text-accent opacity-30 group-hover/quote:opacity-100 shrink-0" />
      </div>
    </div>
  );
}
// #endregion
