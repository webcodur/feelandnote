"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

/** Chrome 내장 번역 API (데스크톱 Chrome 계열 전용, 모바일 미지원).
 *  표준 타입에 아직 없어 최소 형태만 선언한다. */
interface BrowserTranslator {
  translate: (text: string) => Promise<string>;
  destroy?: () => void;
}
interface TranslatorFactory {
  availability: (opts: {
    sourceLanguage: string;
    targetLanguage: string;
  }) => Promise<"unavailable" | "downloadable" | "downloading" | "available">;
  create: (opts: {
    sourceLanguage: string;
    targetLanguage: string;
  }) => Promise<BrowserTranslator>;
}

const SOURCE_LANG = "ko";
const TARGET_LANG = "en";

interface Props {
  /** 화면 언어에 맞춰 고른 본문. 영문본이 아직 없는 인물은 한국어 원문이 그대로 온다 */
  text: string;
  /** 영어 화면에서만 번역 버튼을 노출한다 */
  showTranslate: boolean;
}

const isKorean = (s: string) => /[가-힣]/.test(s);

type State = "idle" | "translating" | "done" | "error";

export default function VirtualMonologueSection({ text, showTranslate: showTranslateProp }: Props) {
  const t = useTranslations("celebPage");
  // 영문본이 실린 인물은 번역할 것이 없다. 한국어 원문이 온 인물에게만 번역 수단을 붙인다.
  const koreanBody = isKorean(text);
  const showTranslate = showTranslateProp && koreanBody;
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<State>("idle");
  const [translated, setTranslated] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);

  // 지원 여부 확인 — 미지원 브라우저(모바일·Safari·Firefox)에서는 버튼 자체를 띄우지 않는다.
  useEffect(() => {
    if (!showTranslate) return;
    let alive = true;
    const factory = (globalThis as unknown as { Translator?: TranslatorFactory }).Translator;
    if (!factory) return;
    factory
      .availability({ sourceLanguage: SOURCE_LANG, targetLanguage: TARGET_LANG })
      .then((status) => {
        if (alive && status !== "unavailable") setSupported(true);
      })
      .catch(() => {
        /* 판별 실패 시 버튼을 숨긴 채 원문만 보여준다 */
      });
    return () => {
      alive = false;
    };
  }, [showTranslate]);

  const handleTranslate = useCallback(async () => {
    if (translated) {
      setShowOriginal((v) => !v);
      return;
    }
    const factory = (globalThis as unknown as { Translator?: TranslatorFactory }).Translator;
    if (!factory) return;
    setState("translating");
    try {
      const translator = await factory.create({
        sourceLanguage: SOURCE_LANG,
        targetLanguage: TARGET_LANG,
      });
      const paragraphs = text.split(/\n\n+/);
      const results: string[] = [];
      for (const para of paragraphs) {
        results.push(await translator.translate(para));
      }
      translator.destroy?.();
      setTranslated(results.join("\n\n"));
      setState("done");
    } catch {
      setState("error");
    }
  }, [text, translated]);

  const isShowingTranslation = translated !== null && !showOriginal;
  const body = isShowingTranslation ? (translated as string) : text;

  const buttonLabel =
    state === "translating"
      ? t("virtualMonologueTranslating")
      : translated
        ? showOriginal
          ? t("virtualMonologueTranslate")
          : t("virtualMonologueShowOriginal")
        : t("virtualMonologueTranslate");

  return (
    <>
      <p className="text-xs leading-relaxed break-keep text-center mb-4">
        {t("virtualMonologueNote")}
      </p>

      {showTranslate && (
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <p className="text-xs leading-relaxed break-keep">
            {t("virtualMonologueKoNotice")}
          </p>
          {supported && (
            <button
              type="button"
              onClick={handleTranslate}
              disabled={state === "translating"}
              className="shrink-0 rounded border border-accent-dim/40 px-2.5 py-1 text-xs hover:border-accent/60 hover:text-accent disabled:opacity-50"
            >
              {buttonLabel}
            </button>
          )}
        </div>
      )}

      {state === "error" && (
        <p className="text-xs mb-4">{t("virtualMonologueTranslateError")}</p>
      )}

      <div
        lang={isShowingTranslation || !koreanBody ? TARGET_LANG : SOURCE_LANG}
        className="space-y-4 font-serif text-[15px] md:text-base text-text-secondary leading-loose break-keep"
      >
        {body.split(/\n\n+/).map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>

      {isShowingTranslation && (
        <p className="text-xs leading-relaxed break-keep mt-4">
          {t("virtualMonologueMachineNote")}
        </p>
      )}
    </>
  );
}
