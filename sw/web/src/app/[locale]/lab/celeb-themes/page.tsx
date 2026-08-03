import CelebMaterialsPreview from "@/components/lab/CelebMaterialsPreview";
import { LAB_ITEMS } from "@/constants/lab";

const item = LAB_ITEMS.find((labItem) => labItem.value === "celeb-themes")!;

export const metadata = { title: `${item.label} | Lab` };

export default function Page() {
  return (
    <section className="space-y-8">
      <div className="space-y-2 text-center">
        <h2 className="font-cinzel text-2xl tracking-[0.2em] text-accent">{item.title}</h2>
        <p className="text-sm text-text-secondary">{item.subtitle}</p>
      </div>
      <CelebMaterialsPreview />
    </section>
  );
}
