"use client";

import { useLocale } from "next-intl";
import type { CelebProfile } from "@/types/home";
import AtlasPersonDetail from "@/components/features/user/explore/atlas/AtlasPersonDetail";

export interface FactionMemberMeta { group: string | null }

interface Props {
  factionId: string;
  factionName: string;
  celeb: CelebProfile;
  meta: FactionMemberMeta | undefined;
  onClose: () => void;
  portraitUrl?: string | null;
}

/** 인물 상세의 소속 목록도 도감 페이지와 같은 모달을 쓴다. 자료 형식만 연결한다. */
export default function FactionMemberModal({ factionId, factionName, celeb, meta, onClose, portraitUrl }: Props) {
  const isEn = useLocale() === "en";
  const membership = celeb.factions.find(faction => faction.id === factionId);
  const description = (isEn ? membership?.long_desc_en : membership?.long_desc)?.trim() || null;
  return <AtlasPersonDetail mode={membership?.is_myth ? "myth" : "faction"} profile={celeb}
    theme={{ id: factionId, name: factionName }} group={meta?.group} onClose={onClose}
    person={{
      id: celeb.id, slug: celeb.slug ?? celeb.id,
      name: isEn ? celeb.nickname_en || celeb.nickname : celeb.nickname,
      title: isEn ? celeb.title_en || celeb.title : celeb.title,
      reality: celeb.celeb_reality, headline: null,
      bio: (isEn ? celeb.bio_en || celeb.bio : celeb.bio) ?? null, reading: null,
      voiceV: celeb.voice_v ?? 0, summary: description,
      appearances: [{ mythId: factionId, summary: description, imageUrl: portraitUrl ?? null }],
      avatarUrl: celeb.avatar_url, portraitUrl: celeb.portrait_url ?? null, imageUrl: null,
      images: [], mythIds: [factionId], sourceIds: [],
    }} />;
}
