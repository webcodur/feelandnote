"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const MAX_OVERLAYS = 250;
const MIN_COMPONENT_AREA = 16;
const INTERNAL_COMPONENT_NAMES = new Set([
  "AppRouter",
  "AsyncIntlProvider",
  "BaseLink",
  "Button",
  "ClientPageRoot",
  "ClientSegmentRoot",
  "ErrorBoundary",
  "HTTPAccessFallbackBoundary",
  "ImageComponent",
  "InnerLayoutRouter",
  "IntlProvider",
  "Link",
  "LayoutRouter",
  "LinkComponent",
  "LoadingBoundary",
  "LocaleLayout",
  "NextIntlClientProvider",
  "RedirectBoundary",
  "RenderFromTemplateContext",
  "RootLayout",
  "ScrollAndFocusHandler",
  "Suspense",
  "UiXray",
  "UiXrayOverlay",
]);

type ReactFiber = {
  _debugInfo?: Array<{ name?: unknown }> | null;
  elementType?: unknown;
  return: ReactFiber | null;
  type?: unknown;
};

type ComponentBounds = {
  bottom: number;
  left: number;
  names: Set<string>;
  right: number;
  top: number;
};

type OverlayItem = {
  height: number;
  id: string;
  label: string;
  labelLeft: number;
  labelTop: number;
  left: number;
  top: number;
  width: number;
};

type LabelRect = {
  height: number;
  left: number;
  top: number;
  width: number;
};

function getReactFiber(element: HTMLElement): ReactFiber | null {
  const fiberKey = Object.keys(element).find((key) => key.startsWith("__reactFiber$"));
  if (!fiberKey) return null;

  const fiber = (element as unknown as Record<string, unknown>)[fiberKey];
  return fiber && typeof fiber === "object" ? (fiber as ReactFiber) : null;
}

function getTypeName(type: unknown, depth = 0): string | null {
  if (!type || depth > 3) return null;

  if (typeof type === "function") {
    const component = type as { displayName?: string; name?: string };
    return component.displayName ?? component.name ?? null;
  }

  if (typeof type !== "object") return null;

  const component = type as {
    displayName?: unknown;
    render?: unknown;
    type?: unknown;
  };

  if (typeof component.displayName === "string") return component.displayName;
  return getTypeName(component.render, depth + 1) ?? getTypeName(component.type, depth + 1);
}

function isUsefulComponentName(name: string) {
  const normalizedName = name.replace(/^bound\s+/, "").trim();
  return (
    normalizedName.length >= 3 &&
    /^[A-Z][A-Za-z0-9_$.-]*$/.test(normalizedName) &&
    !normalizedName.endsWith("Boundary") &&
    !normalizedName.endsWith("Context") &&
    !normalizedName.endsWith("Provider") &&
    !INTERNAL_COMPONENT_NAMES.has(normalizedName)
  );
}

function findComponentOwner(fiber: ReactFiber | null) {
  let current = fiber?.return ?? null;

  while (current) {
    const name = getTypeName(current.elementType ?? current.type);
    if (name && isUsefulComponentName(name)) return { fiber: current, name };

    const debugName = current._debugInfo?.find(
      (entry) => typeof entry.name === "string" && isUsefulComponentName(entry.name),
    )?.name;
    if (typeof debugName === "string") return { fiber: current, name: debugName };

    current = current.return;
  }

  return null;
}

function expandBounds(bounds: ComponentBounds, rect: DOMRect) {
  bounds.left = Math.min(bounds.left, rect.left);
  bounds.top = Math.min(bounds.top, rect.top);
  bounds.right = Math.max(bounds.right, rect.right);
  bounds.bottom = Math.max(bounds.bottom, rect.bottom);
}

function getVisibleRect(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  if (
    rect.width <= 0 ||
    rect.height <= 0 ||
    rect.bottom <= 0 ||
    rect.right <= 0 ||
    rect.top >= window.innerHeight ||
    rect.left >= window.innerWidth
  ) {
    return null;
  }

  return rect;
}

function estimateLabelWidth(label: string) {
  return Math.min(260, Math.max(42, label.length * 6.2 + 28));
}

function labelsOverlap(first: LabelRect, second: LabelRect) {
  return !(
    first.left + first.width + 2 <= second.left ||
    second.left + second.width + 2 <= first.left ||
    first.top + first.height + 2 <= second.top ||
    second.top + second.height + 2 <= first.top
  );
}

function placeLabels(items: Array<Omit<OverlayItem, "labelLeft" | "labelTop">>): OverlayItem[] {
  const labelHeight = 20;
  const placedLabels: LabelRect[] = [];
  const statusRect: LabelRect = {
    height: 56,
    left: Math.max(0, window.innerWidth - 150),
    top: 2,
    width: 148,
  };

  return items.map((item) => {
    const labelWidth = estimateLabelWidth(item.label);
    const maxLeft = Math.max(2, window.innerWidth - labelWidth - 2);
    const maxTop = Math.max(0, window.innerHeight - labelHeight - 2);
    const baseLeft = Math.min(Math.max(2, item.left), maxLeft);
    const baseTop = Math.min(Math.max(0, item.top), maxTop);
    const labelLeft = baseLeft;
    let labelTop = baseTop;

    // Keep labels readable when several component roots share the same corner.
    // Try alternating downward/upward slots before accepting an unavoidable collision.
    for (let attempt = 0; attempt < 32; attempt += 1) {
      const direction = attempt % 2 === 0 ? 1 : -1;
      const distance = Math.ceil(attempt / 2) * (labelHeight + 2);
      const candidateTop = Math.min(
        maxTop,
        Math.max(0, baseTop + direction * distance),
      );
      const candidate = {
        height: labelHeight,
        left: baseLeft,
        top: candidateTop,
        width: labelWidth,
      };

      if (
        !labelsOverlap(statusRect, candidate) &&
        !placedLabels.some((placed) => labelsOverlap(placed, candidate))
      ) {
        labelTop = candidateTop;
        break;
      }
    }

    placedLabels.push({ height: labelHeight, left: labelLeft, top: labelTop, width: labelWidth });
    return { ...item, labelLeft, labelTop };
  });
}

function collectComponentOverlays(): { items: OverlayItem[]; total: number } {
  const componentBounds = new Map<object, ComponentBounds>();
  const elements = document.body.querySelectorAll<HTMLElement>("*");

  for (const element of elements) {
    if (element.closest("[data-ui-xray-root], svg.lucide")) continue;

    const rect = getVisibleRect(element);
    if (!rect) continue;

    const explicitName = element.dataset.uiComponent;
    if (explicitName && !isUsefulComponentName(explicitName)) continue;

    const owner = explicitName
      ? { fiber: element, name: explicitName }
      : findComponentOwner(getReactFiber(element));
    if (!owner) continue;

    const existing = componentBounds.get(owner.fiber);
    if (existing) {
      expandBounds(existing, rect);
      existing.names.add(owner.name);
      continue;
    }

    componentBounds.set(owner.fiber, {
      bottom: rect.bottom,
      left: rect.left,
      names: new Set([owner.name]),
      right: rect.right,
      top: rect.top,
    });
  }

  const allItems = Array.from(componentBounds.values())
    .filter((bounds) => {
      const width = bounds.right - bounds.left;
      const height = bounds.bottom - bounds.top;
      return width * height >= MIN_COMPONENT_AREA;
    })
    .sort((a, b) => a.top - b.top || a.left - b.left)
    .map((bounds, index) => ({
      height: bounds.bottom - bounds.top,
      id: `${index}-${bounds.left}-${bounds.top}`,
      label: Array.from(bounds.names).join(" · "),
      left: bounds.left,
      top: bounds.top,
      width: bounds.right - bounds.left,
    }));

  return { items: placeLabels(allItems.slice(0, MAX_OVERLAYS)), total: allItems.length };
}

async function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall back for browsers that expose the API but deny it at runtime.
    }
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
  document.body.appendChild(textArea);
  textArea.select();
  const didCopy = document.execCommand("copy");
  textArea.remove();

  if (!didCopy) throw new Error("Unable to copy the UI component name.");
}

export default function UiXrayOverlay() {
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);
  const [raisedItemId, setRaisedItemId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<{ items: OverlayItem[]; total: number }>({
    items: [],
    total: 0,
  });
  const copiedTimerRef = useRef<number | null>(null);

  const handleCopy = async (item: OverlayItem) => {
    await copyToClipboard(item.label);
    setCopiedItemId(item.id);

    if (copiedTimerRef.current !== null) window.clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = window.setTimeout(() => setCopiedItemId(null), 1_200);
  };

  const handleRaise = (item: OverlayItem) => {
    setRaisedItemId((currentId) => {
      if (currentId !== item.id) return item.id;

      const stackedItems = snapshot.items.filter(
        (candidate) =>
          Math.abs(candidate.left - item.left) <= 2 &&
          Math.abs(candidate.top - item.top) <= 2,
      );
      if (stackedItems.length <= 1) return item.id;

      const currentIndex = stackedItems.findIndex((candidate) => candidate.id === item.id);
      return stackedItems[(currentIndex + 1) % stackedItems.length].id;
    });
  };

  useEffect(() => {
    let frameId = 0;
    let isDisposed = false;

    const scan = () => {
      frameId = 0;
      if (!isDisposed) setSnapshot(collectComponentOverlays());
    };

    const scheduleScan = () => {
      if (!isDisposed && frameId === 0) frameId = window.requestAnimationFrame(scan);
    };

    const resizeObserver = new ResizeObserver(scheduleScan);
    resizeObserver.observe(document.documentElement);
    resizeObserver.observe(document.body);

    const mutationObserver = new MutationObserver(scheduleScan);
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    window.addEventListener("resize", scheduleScan);
    window.addEventListener("scroll", scheduleScan, { capture: true, passive: true });
    document.fonts.ready.then(scheduleScan);
    scheduleScan();

    return () => {
      isDisposed = true;
      if (frameId !== 0) window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("resize", scheduleScan);
      window.removeEventListener("scroll", scheduleScan, true);
      if (copiedTimerRef.current !== null) window.clearTimeout(copiedTimerRef.current);
    };
  }, []);

  return createPortal(
    <div
      data-ui-xray-root
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: 2_147_483_646 }}
    >
      {snapshot.items.map((item) => (
        <div
          key={item.id}
          className={
            raisedItemId === item.id
              ? "fixed border border-cyan-100 bg-cyan-200/[0.07] shadow-[0_0_0_1px_rgba(165,243,252,0.35),0_0_18px_rgba(34,211,238,0.16)]"
              : "fixed border border-cyan-300/70 bg-cyan-300/[0.025]"
          }
          style={{
            height: item.height,
            left: item.left,
            top: item.top,
            width: item.width,
            zIndex: raisedItemId === item.id ? 2 : 1,
          }}
        />
      ))}

      {snapshot.items.map((item) => (
        <div
          key={`${item.id}-label`}
          className="pointer-events-none fixed"
          style={{
            left: item.labelLeft,
            top: item.labelTop,
            zIndex: raisedItemId === item.id ? 10 : 5,
          }}
        >
          <div className="flex max-w-[260px] items-stretch overflow-hidden bg-cyan-950/95 font-mono text-[10px] font-semibold leading-none text-cyan-100 shadow-[0_1px_5px_rgba(0,0,0,0.55)]">
            <button
              type="button"
              aria-label={`Raise ${item.label}`}
              title="Bring UI layer to front; click again to cycle stacked layers" /* i18n-audit-ignore — 개발자 전용 도구 */
              className="pointer-events-auto truncate px-1.5 py-1 text-left hover:bg-cyan-800 active:bg-cyan-700"
              onClick={() => handleRaise(item)}
            >
              {item.label}
            </button>
            <button
              type="button"
              aria-label={`Copy ${item.label}`}
              title="Copy UI name" /* i18n-audit-ignore — 개발자 전용 도구 */
              className="pointer-events-auto flex shrink-0 items-center border-l border-cyan-300/35 px-1.5 text-cyan-200 hover:bg-cyan-300 hover:text-cyan-950 active:bg-cyan-200"
              onClick={() => void handleCopy(item)}
            >
              {copiedItemId === item.id ? (
                <Check aria-hidden="true" size={10} strokeWidth={2.5} />
              ) : (
                <Copy aria-hidden="true" size={10} strokeWidth={2.25} />
              )}
            </button>
          </div>
        </div>
      ))}

      <div className="fixed right-3 top-3 z-[100] rounded-md border border-cyan-300/70 bg-slate-950/95 px-3 py-2 font-mono text-[11px] leading-tight text-cyan-100 shadow-xl">
        <div className="font-semibold tracking-wide">UI XRAY</div>
        <div className="mt-1 text-cyan-200/75">
          Ctrl + Alt · {snapshot.total}
          {snapshot.total > snapshot.items.length ? ` (showing ${snapshot.items.length})` : ""}
        </div>
      </div>
    </div>,
    document.body,
  );
}
