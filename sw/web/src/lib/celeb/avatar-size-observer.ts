// 아바타마다 관찰기·전역 이벤트를 만들지 않고 한 관찰기를 공유한다.
import { usesSmallAvatar } from "@feelandnote/shared/constants/celeb-avatar-small";

interface ObservedAvatar {
  notify: (small: boolean) => void;
  width: number;
  height: number;
}

const avatars = new Map<HTMLImageElement, ObservedAvatar>();
let observer: ResizeObserver | undefined;
let densityQuery: MediaQueryList | undefined;

function notifySize(avatar: ObservedAvatar) {
  // 숨겨진 칸은 펼쳐져 실제 크기가 생긴 뒤에 요청한다.
  if (avatar.width <= 0 || avatar.height <= 0) return;
  avatar.notify(usesSmallAvatar(avatar.width, avatar.height, window.devicePixelRatio || 1));
}

function measure(image: HTMLImageElement, avatar: ObservedAvatar) {
  const rect = image.getBoundingClientRect();
  avatar.width = rect.width;
  avatar.height = rect.height;
  notifySize(avatar);
}

function measureAll() {
  for (const [image, avatar] of avatars) measure(image, avatar);
}

function watchDensity() {
  densityQuery?.removeEventListener("change", onDensityChange);
  densityQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
  densityQuery.addEventListener("change", onDensityChange);
}

function onDensityChange() {
  watchDensity();
  measureAll();
}

export function observeAvatarSize(image: HTMLImageElement, notify: ObservedAvatar["notify"]) {
  if (avatars.size === 0) {
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const avatar = avatars.get(entry.target as HTMLImageElement);
          if (!avatar) continue;
          // 최초 측정과 같은 기준으로 transform까지 포함한 실제 표시 크기를 쓴다.
          measure(entry.target as HTMLImageElement, avatar);
        }
      });
    }
    window.addEventListener("resize", measureAll, { passive: true });
    watchDensity();
  }

  const avatar = { notify, width: 0, height: 0 };
  avatars.set(image, avatar);
  observer?.observe(image);
  measure(image, avatar);

  return () => {
    observer?.unobserve(image);
    avatars.delete(image);
    if (avatars.size > 0) return;
    observer?.disconnect();
    observer = undefined;
    window.removeEventListener("resize", measureAll);
    densityQuery?.removeEventListener("change", onDensityChange);
    densityQuery = undefined;
  };
}
