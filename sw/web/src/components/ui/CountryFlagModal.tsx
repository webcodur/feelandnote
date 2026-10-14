"use client";

import { useTranslations } from "next-intl";
import Modal from "./Modal";
import CountryFlagImage from "./CountryFlagImage";
import { Z_INDEX } from "@/constants/zIndex";

interface Props {
  code: string;
  name: string;
  onClose: () => void;
}

export default function CountryFlagModal({ code, name, onClose }: Props) {
  const t = useTranslations("shared.countryFlag");

  return <Modal isOpen onClose={onClose} title={t("title")} titleClassName="text-center text-text-primary" size="sm" stickyHeader escapeCapture zIndex={Z_INDEX.gameModal}>
    <div className="flex flex-col items-center gap-5 px-6 py-8 text-center">
      <CountryFlagImage code={code} label={name} className="text-[clamp(4rem,20vw,8rem)]" />
      <p className="text-xl font-semibold text-text-primary">{name}</p>
      <dl className="flex items-center gap-3 text-sm">
        <dt className="text-text-secondary">{t("code")}</dt>
        <dd className="font-medium text-text-primary">{code}</dd>
      </dl>
    </div>
  </Modal>;
}
