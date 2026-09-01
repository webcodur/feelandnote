"use client";

import { useCallback, useRef, useState } from "react";

import {
  getCelebGreetingProfile,
  type CelebGreetingProfile,
} from "@/actions/celebs/getCelebGreetingProfile";
import { useDialogueSubtitle } from "@/components/features/game/shared/hooks/useDialogue";
import { useCelebGreeting } from "@/hooks/useCelebGreeting";
import type { Locale } from "@/types/locale";

import type { PersonNode } from "./types";

const hasDialogue = (profile: CelebGreetingProfile) => Boolean(
  profile.greeting?.length || profile.greeting_en?.length
  || profile.quotes || profile.quotes_en || profile.speech_tone,
);

export default function useRelationDialogue(locale: string) {
  const { handleSubtitle } = useDialogueSubtitle();
  const { fireGreeting } = useCelebGreeting({ onSubtitle: handleSubtitle, locale: locale as Locale });
  const cacheRef = useRef(new Map<string, CelebGreetingProfile | null>());
  const [profiles, setProfiles] = useState<Record<string, CelebGreetingProfile | null>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [pulse, setPulse] = useState({ personId: "", count: 0 });

  const speak = useCallback(async (person: PersonNode) => {
    if (!person.listed || !person.slug || loadingId === person.id) return;
    let profile = cacheRef.current.get(person.id);
    if (!cacheRef.current.has(person.id)) {
      setLoadingId(person.id);
      try {
        profile = await getCelebGreetingProfile(person.id);
        cacheRef.current.set(person.id, profile ?? null);
        setProfiles((current) => ({ ...current, [person.id]: profile ?? null }));
      } catch (error) {
        console.error("[relation-dialogue] Failed to load dialogue", error);
        cacheRef.current.set(person.id, null);
        setProfiles((current) => ({ ...current, [person.id]: null }));
      } finally {
        setLoadingId((current) => current === person.id ? null : current);
      }
    }
    if (!profile || !hasDialogue(profile)) return;
    fireGreeting({
      ...profile,
      nickname: locale === "en" ? profile.nickname_en ?? profile.nickname : profile.nickname,
    });
    if (profile.has_voice) setPulse((current) => ({
      personId: person.id, count: current.personId === person.id ? current.count + 1 : 1,
    }));
  }, [fireGreeting, loadingId, locale]);

  const stateFor = useCallback((person: PersonNode) => {
    const profile = profiles[person.id];
    const eligible = person.listed && Boolean(person.slug);
    return {
      canSpeak: eligible && (profile === undefined || Boolean(profile && hasDialogue(profile))),
      loading: loadingId === person.id,
      hasVoice: profile?.has_voice ?? false,
      pulse: pulse.personId === person.id ? pulse.count : 0,
    };
  }, [loadingId, profiles, pulse]);

  return { speak, stateFor };
}
