"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";

const SECRET_CODE = "123";

interface Props {
  children: React.ReactNode;
}

export default function DevGate({ children }: Props) {
  const t = useTranslations("rest.arena.suikoden");
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);

  const handleIconClick = useCallback(() => {
    setListening(true);
    setInput("");
  }, []);

  useEffect(() => {
    if (!listening) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const next = input + e.key;
      if (SECRET_CODE.startsWith(next)) {
        setInput(next);
        if (next === SECRET_CODE) {
          setUnlocked(true);
          setListening(false);
        }
      } else {
        setInput("");
        setListening(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [listening, input]);

  if (unlocked) return <>{children}</>;

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <button
        type="button"
        onClick={handleIconClick}
        className={`text-5xl mb-4 transition-transform cursor-pointer ${listening ? "animate-pulse scale-110" : ""}`}
      >
        🏗️
      </button>
      <h2 className="text-xl font-bold text-text-primary mb-2">
        {t("devNoticeTitle")}
      </h2>
      <p className="text-text-secondary text-sm max-w-md">
        {t("devNoticeDesc")}
      </p>
    </div>
  );
}
