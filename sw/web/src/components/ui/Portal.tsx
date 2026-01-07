/*
  파일명: /components/ui/Portal.tsx
  기능: 포탈 컴포넌트
  책임: 자식 요소를 DOM의 body로 렌더링한다.
*/ // ------------------------------

"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface PortalProps {
  children: ReactNode;
}

export default function Portal({ children }: PortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  return createPortal(children, document.body);
}
