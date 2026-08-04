"use client";

import { lazy, Suspense, useEffect, useState } from "react";

const UiXrayOverlay = lazy(() => import("./UiXrayOverlay"));

/**
 * Hold Ctrl + Alt to reveal the React components composing the current screen.
 * The heavier inspection code is downloaded only when the shortcut is used.
 */
export default function UiXray() {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const syncShortcutState = (event: KeyboardEvent) => {
      const isAltGraph = event.getModifierState("AltGraph");
      setIsActive(event.ctrlKey && event.altKey && !isAltGraph);
    };

    const deactivate = () => setIsActive(false);

    window.addEventListener("keydown", syncShortcutState, true);
    window.addEventListener("keyup", syncShortcutState, true);
    window.addEventListener("blur", deactivate);
    document.addEventListener("visibilitychange", deactivate);

    return () => {
      window.removeEventListener("keydown", syncShortcutState, true);
      window.removeEventListener("keyup", syncShortcutState, true);
      window.removeEventListener("blur", deactivate);
      document.removeEventListener("visibilitychange", deactivate);
    };
  }, []);

  if (!isActive) return null;

  return (
    <Suspense fallback={null}>
      <UiXrayOverlay />
    </Suspense>
  );
}
