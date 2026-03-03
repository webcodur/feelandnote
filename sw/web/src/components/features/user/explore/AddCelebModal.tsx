/*
  파일명: /components/features/explore/modals/AddCelebModal.tsx
  기능: 셀럽 프로필 추가 모달
  책임: 새로운 셀럽 프로필 생성 폼 제공
*/ // ------------------------------
"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import Button from "@/components/ui/Button";
import { Modal, ModalBody, ModalFooter } from "@/components/ui";
import { createCelebProfile } from "@/actions/celebs";
import { CELEB_PROFESSIONS } from "@/constants/celebProfessions";
import { useTranslations } from "next-intl";

interface AddCelebModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddCelebModal({ isOpen, onClose }: AddCelebModalProps) {
  const router = useRouter();
  const t = useTranslations("explore.ui");
  const tp = useTranslations("profession");
  const [nickname, setNickname] = useState("");
  const [profession, setProfession] = useState("");
  const [bio, setBio] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setError(t("nameRequired"));
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await createCelebProfile({ nickname: nickname.trim(), profession: profession || undefined, bio: bio || undefined });
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("addFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("addCeleb")} size="md">
      <form onSubmit={handleSubmit}>
        <ModalBody className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">{t("nameLabel")}</label>
            <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder={t("namePlaceholder")} className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent" />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">{t("fieldLabel")}</label>
            <select value={profession} onChange={(e) => setProfession(e.target.value)} className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent">
              <option value="">{t("fieldNone")}</option>
              {CELEB_PROFESSIONS.map((p) => <option key={p.value} value={p.value}>{tp(p.value)}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">{t("bioLabel")}</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder={t("bioPlaceholder")} rows={3} className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent resize-none" />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </ModalBody>

        <ModalFooter>
          <Button unstyled type="button" onClick={onClose} className="flex-1 px-4 py-2.5 bg-surface text-text-secondary rounded-lg hover:bg-surface-hover font-medium">{t("cancel")}</Button>
          <Button unstyled type="submit" disabled={isLoading} className="flex-1 px-4 py-2.5 bg-accent text-white rounded-lg hover:bg-accent/90 font-medium disabled:opacity-50">{isLoading ? t("adding") : t("add")}</Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
