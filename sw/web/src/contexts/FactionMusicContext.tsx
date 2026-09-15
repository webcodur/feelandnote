"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export interface FactionMusicSelection {
  id: string;
  title: string;
  url: string;
  kind?: "faction" | "myth";
}

interface FactionMusicContextValue {
  music: FactionMusicSelection | null;
  register: (music: FactionMusicSelection) => void;
  unregister: (id: string) => void;
}

const FactionMusicContext = createContext<FactionMusicContextValue>({
  music: null,
  register: () => {},
  unregister: () => {},
});

export function FactionMusicProvider({ children }: { children: ReactNode }) {
  const [music, setMusic] = useState<FactionMusicSelection | null>(null);
  const register = useCallback((next: FactionMusicSelection) => setMusic(next), []);
  const unregister = useCallback((id: string) => {
    setMusic((current) => current?.id === id ? null : current);
  }, []);

  return (
    <FactionMusicContext.Provider value={{ music, register, unregister }}>
      {children}
    </FactionMusicContext.Provider>
  );
}

export function useFactionMusicContext() {
  return useContext(FactionMusicContext);
}

/** 현재 세력도감 테마를 전역 음악 플레이어에 등록한다. */
export function useRegisterFactionMusic(selection: FactionMusicSelection | null) {
  const { register, unregister } = useFactionMusicContext();
  const id = selection?.id ?? null;
  const title = selection?.title ?? null;
  const url = selection?.url ?? null;
  const kind = selection?.kind ?? "faction";

  useEffect(() => {
    if (!id || !title || !url) return;
    register({ id, title, url, kind });
    return () => unregister(id);
  }, [id, kind, register, title, unregister, url]);
}
