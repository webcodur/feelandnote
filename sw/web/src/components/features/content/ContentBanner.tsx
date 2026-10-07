import { getBookBannerImages, type BookBannerTheme } from "@/lib/books/bookBanner";
import styles from "./ContentDetail.module.css";

export default function ContentBanner({ theme, mediaThumbnail }: { theme: BookBannerTheme; mediaThumbnail?: string | null }) {
  const images = getBookBannerImages(theme);
  return <div className={styles.banner} data-content-banner={mediaThumbnail ? "media" : theme} aria-hidden="true">
    <picture>
      <source media="(min-width: 768px)" srcSet={mediaThumbnail ?? images.pc} />
      <img src={mediaThumbnail ?? images.mb} alt="" fetchPriority="high" decoding="async" draggable={false} />
    </picture>
    <div className={styles.bannerShade} />
  </div>;
}
