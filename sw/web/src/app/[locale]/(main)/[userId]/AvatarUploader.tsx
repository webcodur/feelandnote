"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Camera, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

// 클라이언트 검증 기준 (즉시 피드백용. 본선 검증은 서버)
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 8 * 1024 * 1024;

interface AvatarUploaderProps {
  avatarUrl: string;
  nickname: string;
  isEditing: boolean;
  onUploaded: (url: string) => void;
  onError: (message: string) => void;
}

export default function AvatarUploader({ avatarUrl, nickname, isEditing, onUploaded, onError }: AvatarUploaderProps) {
  const t = useTranslations("userBio");
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // 미리보기 objectURL 해제
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 같은 파일 재선택도 동작하도록 값 초기화
    e.target.value = "";
    if (!file) return;

    if (!ALLOWED_MIME.includes(file.type)) {
      onError(t("avatarInvalidType"));
      return;
    }

    if (file.size > MAX_BYTES) {
      onError(t("avatarTooLarge"));
      return;
    }

    onError("");
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/avatar", { method: "POST", body: formData });
      const body = await res.json();

      if (!res.ok) {
        onError(body.error || t("avatarUploadFailed"));
        setPreview("");
        return;
      }

      onUploaded(body.url);
      setPreview("");
    } catch {
      onError(t("avatarUploadFailed"));
      setPreview("");
    } finally {
      setIsUploading(false);
    }
  };

  const displaySrc = preview || avatarUrl;
  const actionLabel = isUploading ? t("avatarUploading") : t("avatarChange");

  const avatarBody = displaySrc ? (
    <Image src={displaySrc} alt={t("avatarAlt")} fill unoptimized className="rounded-full object-cover ring-2 ring-accent/30" />
  ) : (
    <div className="w-full h-full rounded-full bg-accent/20 flex items-center justify-center text-xl font-bold text-accent ring-2 ring-accent/30">
      {nickname.charAt(0).toUpperCase()}
    </div>
  );

  if (!isEditing) {
    return <div className="relative w-14 h-14 shrink-0">{avatarBody}</div>;
  }

  return (
    <div className="relative w-14 h-14 shrink-0">
      {avatarBody}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        title={actionLabel}
        aria-label={actionLabel}
        className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50 text-text-primary opacity-0 hover:opacity-100 disabled:opacity-100 disabled:cursor-wait"
      >
        {isUploading ? <Loader2 size={16} className="animate-spin text-accent" /> : <Camera size={16} />}
      </button>
      <input ref={inputRef} type="file" accept={ALLOWED_MIME.join(",")} onChange={handleSelect} className="hidden" />
    </div>
  );
}
