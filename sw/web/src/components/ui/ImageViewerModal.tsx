/*
  파일명: /components/ui/ImageViewerModal.tsx
  기능: 이미지 뷰어 모달
  책임: 이미지를 전체 화면으로 확대하여 표시한다.
*/ // ------------------------------

"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import Button from "./Button";
import { Z_INDEX } from "@/constants/zIndex";

interface ImageViewerModalProps {
  src: string;
  alt?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageViewerModal({
  src,
  alt = "Image",
  isOpen,
  onClose,
}: ImageViewerModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Portal to move modal outside of parent stacking contexts (like transforms)
  return createPortal(
    <div 
      className="fixed inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      style={{ zIndex: Z_INDEX.top }}
      onClick={onClose}
    >
      <Button
        unstyled
        onClick={onClose}
        className="absolute top-4 end-4 p-2 text-white/50 hover:text-white"
      >
        <X size={32} />
      </Button>
      
      <div 
        className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center p-4 outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={src}
          alt={alt}
          width={1200}
          height={800}
          unoptimized
          className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
        />
      </div>
    </div>,
    document.body
  );
}
