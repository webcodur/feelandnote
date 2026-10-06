import type { ReactNode } from "react";
import { ArrowDownUp, ArrowLeftRight, Copy, Rows3, ZoomIn } from "lucide-react";
import { useTranslations } from "next-intl";

export default function FactionArtworkHelp({ onClose, sceneCaption, caption }: {
  onClose: () => void;
  sceneCaption: boolean;
  caption: boolean;
}) {
  const t = useTranslations("explore.hub.myth");
  const rows: { key: string; icon: ReactNode }[] = [
    { key: "helpPaging", icon: <ArrowLeftRight size={15} /> },
    ...(sceneCaption ? [
      { key: "helpCaptionMode", icon: <Rows3 size={15} /> },
      { key: "helpCaptionSize", icon: <span className="text-base font-medium">{t("captionSizeSample")}</span> },
      { key: "helpCaptionHeight", icon: <ArrowDownUp size={15} /> },
    ] : []),
    { key: "helpZoom", icon: <ZoomIn size={15} /> },
    ...(caption ? [{ key: "helpCaption", icon: <Copy size={15} /> }] : []),
    { key: "helpEsc", icon: <kbd className="text-[9px]">Esc</kbd> },
  ];
  return (
    <div className="absolute inset-0 z-30" onClick={onClose}>
      <aside data-artwork-help aria-label={t("helpTitle")} onClick={event => event.stopPropagation()}
        className="absolute end-2 top-24 max-h-[calc(100dvh-7rem)] w-64 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-lg border border-white/15 bg-bg-main/95 p-3 shadow-lg md:top-14">
        <p className="mb-2 text-xs font-semibold text-white">{t("helpTitle")}</p>
        <ul className="space-y-2 text-xs leading-4 text-white/80">
          {rows.map(row => <li key={row.key} className="flex items-center gap-2.5">
            <span aria-hidden className="flex w-5 shrink-0 items-center justify-center text-white/55">{row.icon}</span>
            <span>{t(row.key)}</span>
          </li>)}
        </ul>
      </aside>
    </div>
  );
}
