import CelebMaterialsPreview from "@/components/lab/CelebMaterialsPreview";
import CelebThemeRoster from "@/components/lab/CelebThemeRoster";
import { LAB_ITEMS } from "@/constants/lab";

const item = LAB_ITEMS.find((labItem) => labItem.value === "celeb-themes")!;

export const metadata = { title: `${item.label} | Lab` };

// 인물 전원을 DB에서 읽어 재질별로 모은다. 명단은 자주 바뀌지 않아 10분 캐시로 충분하다.
export const revalidate = 600;

export default function Page() {
  return (
    <section className="space-y-8">
      <div className="space-y-2 text-center">
        <h2 className="font-cinzel text-2xl tracking-[0.2em] text-accent">{item.title}</h2>
        <p className="text-sm text-text-secondary">{item.subtitle}</p>
      </div>
      <CelebMaterialsPreview />

      <div className="space-y-4">
        <h3 className="font-cinzel text-xl tracking-[0.2em] text-accent">ROSTER</h3>
        <CelebThemeRoster />
      </div>
    </section>
  );
}
