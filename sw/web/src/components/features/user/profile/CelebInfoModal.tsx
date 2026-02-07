/*
  파일명: /components/features/user/profile/CelebInfoModal.tsx
  기능: 셀럽 정보 모달
  책임: 중형 초상화와 인물 정보를 모달로 표시한다.
*/ // ------------------------------
"use client";

import Image from "next/image";
import { Sparkles, Quote, Calendar, MapPin } from "lucide-react";
import Modal, { ModalBody } from "@/components/ui/Modal";
import { type PublicUserProfile } from "@/actions/user";
import { getCelebProfessionLabel } from "@/constants/celebProfessions";
import NationalityText from "@/components/ui/NationalityText";

// #region 헬퍼 함수
function formatLifespan(birthDate: string | null, deathDate: string | null): string | null {
  if (!birthDate && !deathDate) return null;

  const formatYear = (date: string): string => {
    if (date.startsWith("-")) {
      return `BC ${date.slice(1)}`;
    }
    return date.split("-")[0];
  };

  const birth = birthDate ? formatYear(birthDate) : "?";
  const death = deathDate ? formatYear(deathDate) : birthDate ? "현재" : "?";

  return `${birth} ~ ${death}`;
}
// #endregion

interface CelebInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PublicUserProfile;
}

export default function CelebInfoModal({ isOpen, onClose, profile }: CelebInfoModalProps) {
  const lifespan = formatLifespan(profile.birth_date, profile.death_date);
  const hasPortrait = !!profile.portrait_url;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" closeOnOverlayClick>
      <ModalBody className="p-0">
        <div className="flex flex-col md:flex-row">
          {/* 좌측: 중형 초상화 (2:3 비율) */}
          <div className="flex-shrink-0 bg-bg-secondary">
            {hasPortrait ? (
              <div className="relative w-full md:w-44 aspect-[2/3]">
                <Image
                  src={profile.portrait_url!}
                  alt={profile.nickname}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            ) : (
              <div
                className="w-full md:w-44 aspect-[2/3] flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #050505, #111111)" }}
              >
                <span className="text-6xl font-bold text-white">
                  {profile.nickname.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* 우측: 정보 */}
          <div className="flex-1 p-5">
            {/* 이름 및 배지 */}
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-xl font-bold text-text-primary">{profile.nickname}</h2>
              <span className="px-2 py-0.5 bg-accent/10 text-accent border border-accent/20 text-xs rounded-full flex items-center gap-1">
                <Sparkles size={10} />
                셀럽
              </span>
            </div>

            {/* 메타 정보 */}
            <div className="space-y-1.5 mb-4">
              {profile.title && (
                <div className="flex items-center gap-2 text-sm">
                  <Sparkles size={14} className="text-accent" />
                  <span className="text-accent font-medium">{profile.title}</span>
                </div>
              )}
              {profile.profession && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Sparkles size={14} className="text-text-tertiary" />
                  <span>{getCelebProfessionLabel(profile.profession)}</span>
                </div>
              )}
              {profile.nationality && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <MapPin size={14} className="text-text-tertiary" />
                  <NationalityText code={profile.nationality} />
                </div>
              )}
              {lifespan && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Calendar size={14} className="text-text-tertiary" />
                  <span>{lifespan}</span>
                </div>
              )}
            </div>

            {/* 소개 */}
            {profile.bio && (
              <div className="mb-4">
                <p className="text-sm text-text-secondary leading-relaxed">{profile.bio}</p>
              </div>
            )}

            {/* 명언 */}
            {profile.quotes && (
              <div className="p-3 bg-accent/5 rounded-lg border border-accent/10">
                <div className="flex items-start gap-2">
                  <Quote size={14} className="text-accent flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-text-secondary font-serif">"{profile.quotes}"</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
}
