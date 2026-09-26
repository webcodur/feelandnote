/*
  파일명: /components/features/faction/entry/FactionMemberModal.tsx
  기능: 세력도감 인물 소개 모달
  책임: 카드를 누른 인물을 이 테마 안에서 소개한다 — 인물 상세와 같은 아바타 모듈(확대 보기·인사 음성), 테마·진영, 이름·직함,
        테마에서의 역할과 긴 소개, 가상독백, 인물 상세와 같은 등장·감상·집필 참고도서를 보여 준다.
        아바타·신원·상세 버튼을 머리말로 묶고, 역할과 소개는 그 아래 전체 폭에서 읽는다.
*/ // ------------------------------

"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getFactionLongDescs, type FactionLongDescs } from "@/actions/home/getFactionLongDescs";
import VirtualMonologueModal from "@/components/shared/VirtualMonologueModal";
import { FormattedText, splitReadableParagraphs } from "@/components/ui";
import Modal from "@/components/ui/Modal";
import FactionPersonHeader from "./FactionPersonHeader";
import FactionPersonBooks from "./FactionPersonBooks";
import { FACTION_PERSON_LAYOUT as layout } from "./factionPersonLayout";
import { useCelebVirtualMonologue } from "@/hooks/useCelebVirtualMonologue";
import { useCelebVoice } from "@/hooks/useCelebVoice";
import type { CelebProfile } from "@/types/home";
import type { Locale } from "@/types/locale";

/** 이 테마 안에서의 인물 정보 — 서버가 명단에서 만들어 넘긴다 */
export interface FactionMemberMeta {
  role: string | null;
  group: string | null;
}

interface FactionMemberModalProps {
  factionId: string;
  /** 화면 언어의 테마 이름 */
  factionName: string;
  celeb: CelebProfile;
  meta: FactionMemberMeta | undefined;
  onClose: () => void;
  portraitUrl?: string | null;
}

export default function FactionMemberModal({ factionId, factionName, celeb, meta, onClose, portraitUrl }: FactionMemberModalProps) {
  const tCeleb = useTranslations("celebPage");
  const locale = useLocale() as Locale;
  const isEn = locale === "en";
  const [longDescs, setLongDescs] = useState<{ factionId: string; byCeleb: FactionLongDescs } | null>(null);
  const [monologueOpen, setMonologueOpen] = useState(false);
  // 가상독백 — 인물 단위로 따로 받고, 없는 인물은 단추를 두지 않는다
  const monologue = useCelebVirtualMonologue(celeb.id);

  const name = (isEn && celeb.nickname_en) || celeb.nickname;
  const title = (isEn && celeb.title_en) || celeb.title;
  const greeting = isEn ? (celeb.greeting_en ?? celeb.greeting) : celeb.greeting;

  // 인물 상세·인물 상세 모달과 같은 인사 음성 재생 — 음성이 없으면 인사 대사 자막만 띄운다
  const { canGreet, hasGreetingAudio, isVoiceActive, handleGreetingPlay } = useCelebVoice({
    profile: celeb,
    greeting,
    nickname: name,
    locale,
  });

  /* 긴 소개 — 테마 단위로 캐시된 묶음에서 꺼낸다. 못 받아도 모달의 나머지는 그대로다 */
  useEffect(() => {
    let alive = true;
    getFactionLongDescs(factionId)
      .then((byCeleb) => alive && setLongDescs({ factionId, byCeleb }))
      .catch((error) => {
        console.error("[FactionMemberModal] 긴 소개 조회 실패:", error);
        if (alive) setLongDescs({ factionId, byCeleb: {} });
      });
    return () => {
      alive = false;
    };
  }, [factionId]);

  const desc = longDescs?.byCeleb[celeb.id];
  const paragraphs = splitReadableParagraphs((isEn ? desc?.en : desc?.ko) ?? "");
  const content = (
    <>
      <article className={layout.article}>

        <FactionPersonHeader
          person={{ id: celeb.id, slug: celeb.slug, name, title, avatarUrl: celeb.avatar_url, reality: celeb.celeb_reality }}
          factionName={factionName} group={meta?.group} portraitUrl={portraitUrl} nested
          onMonologue={monologue ? () => setMonologueOpen(true) : undefined}
          voice={{ hasVoice: hasGreetingAudio, isVoicePlaying: isVoiceActive,
            onGreet: canGreet ? handleGreetingPlay : undefined,
            greetLabel: hasGreetingAudio ? tCeleb("playGreetingVoice") : tCeleb("dialogue_greeting") }}
        >
        {meta?.role && (
          <p className={layout.lead}>
            {meta.role}
          </p>
        )}

        {longDescs === null ? (
          <div className="space-y-2" aria-hidden>
            <div className="h-3.5 w-full animate-pulse rounded bg-white/[0.07]" />
            <div className="h-3.5 w-11/12 animate-pulse rounded bg-white/[0.07]" />
            <div className="h-3.5 w-3/4 animate-pulse rounded bg-white/[0.07]" />
          </div>
        ) : paragraphs.length > 0 && (
            <div className={layout.paragraphs}>
              {paragraphs.map((paragraph, index) => (
                <p key={index}>
                  <FormattedText text={paragraph} />
                </p>
              ))}
            </div>
        )}
        </FactionPersonHeader>

        <FactionPersonBooks celebId={celeb.id} />
      </article>

      {monologueOpen && monologue && (
        <VirtualMonologueModal text={monologue} onClose={() => setMonologueOpen(false)} nested />
      )}
    </>
  );
  return <Modal isOpen onClose={onClose} ariaLabel={name} size="full" animateHeight={false} frame="plain" boxClassName={layout.modal}>{content}</Modal>;
}
