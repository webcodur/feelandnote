import type { ReactNode } from "react";
import { Check, ChevronLeft, ChevronRight, Copy, Rows3, TextAlignJustify, ZoomIn, ZoomOut } from "lucide-react";
import { useTranslations } from "next-intl";
import FactionCaptionSize, { type CaptionSize } from "./FactionCaptionSize";
import FactionCaptionHeight, { type CaptionHeight } from "./FactionCaptionHeight";

const ICON_BUTTON = "flex min-h-9 min-w-9 items-center justify-center text-white outline-none enabled:hover:text-accent focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-25";

export default function FactionArtworkHelp({ onClose, caption, settings, navigation, zoomed, onZoom, copied, onCopy }: {
  onClose: () => void;
  caption: boolean;
  settings?: { split: boolean; onToggle: () => void; size: CaptionSize; onSize: (value: CaptionSize) => void; height: CaptionHeight; onHeight: (value: CaptionHeight) => void };
  navigation?: { previous: () => void; next: () => void; canPrevious: boolean; canNext: boolean; previousLabel: string; nextLabel: string };
  zoomed: boolean;
  onZoom?: () => void;
  copied: boolean;
  onCopy: () => void;
}) {
  const t = useTranslations("explore.hub.myth");
  const rows: { key: string; icon: ReactNode; label: string }[] = [
    ...(navigation ? [{ key: "helpPaging", label: t("helpPaging"), icon: <div className="flex">
      <button type="button" className={ICON_BUTTON} onClick={navigation.previous} disabled={!navigation.canPrevious} aria-label={navigation.previousLabel}><ChevronLeft size={18} /></button>
      <button type="button" className={ICON_BUTTON} onClick={navigation.next} disabled={!navigation.canNext} aria-label={navigation.nextLabel}><ChevronRight size={18} /></button>
    </div> }] : []),
    ...(settings ? [
      { key: "helpCaptionMode", label: t(settings.split ? "captionPaginate" : "captionShowAll"), icon: <button type="button" data-help-caption-mode className={ICON_BUTTON} aria-label={t(settings.split ? "captionShowAll" : "captionPaginate")} aria-pressed={!settings.split} onClick={settings.onToggle}>{settings.split ? <TextAlignJustify size={18} /> : <Rows3 size={18} />}</button> },
      { key: "helpCaptionSize", label: `${t("captionFontSize")}: ${t(`captionSize.${settings.size}`)}`, icon: <FactionCaptionSize value={settings.size} onChange={settings.onSize} /> },
      { key: "helpCaptionHeight", label: `${t("captionHeightLabel")}: ${t(`captionHeight.${settings.height}`)}`, icon: <FactionCaptionHeight value={settings.height} onChange={settings.onHeight} /> },
    ] : []),
    ...(onZoom ? [{ key: "helpZoom", label: t("helpZoom"), icon: <button type="button" data-help-zoom className={ICON_BUTTON} aria-label={t("helpZoom")} aria-pressed={zoomed} onClick={onZoom}>{zoomed ? <ZoomOut size={18} /> : <ZoomIn size={18} />}</button> }] : []),
    ...(caption ? [{ key: "helpCaption", label: t(copied ? "captionCopied" : "captionCopy"), icon: <button type="button" data-help-copy className={ICON_BUTTON} aria-label={t("captionCopy")} onClick={onCopy}>{copied ? <Check size={18} className="text-accent" /> : <Copy size={18} />}</button> }] : []),
    { key: "helpEsc", label: t("helpEsc"), icon: <button type="button" data-help-back className={ICON_BUTTON} aria-label={t("helpEsc")} onClick={onClose}><kbd className="text-[10px]">Esc</kbd></button> },
  ];
  return (
    <div className="absolute inset-0 z-30" onClick={onClose}>
      <aside data-artwork-help aria-label={t("helpTitle")} onClick={event => event.stopPropagation()}
        className="absolute end-2 top-24 max-h-[calc(100dvh-7rem)] w-64 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-lg border border-white/15 bg-bg-main/95 p-3 shadow-lg md:top-14">
        <p className="mb-2 text-xs font-semibold text-white">{t("helpTitle")}</p>
        <ul className="space-y-1 text-xs leading-4 text-white/80">
          {rows.map(row => <li key={row.key} className="flex items-center gap-2.5">
            <div className="flex w-18 shrink-0 items-center justify-center">{row.icon}</div>
            <span className="break-keep" aria-live={row.key.startsWith("helpCaption") ? "polite" : undefined}>{row.label}</span>
          </li>)}
        </ul>
      </aside>
    </div>
  );
}
