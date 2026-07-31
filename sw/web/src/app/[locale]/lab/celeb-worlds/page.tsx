import CelebWorldsPreview from "@/components/lab/CelebWorldsPreview";
import { LAB_ITEMS } from "@/constants/lab";

const item = LAB_ITEMS.find((labItem) => labItem.value === "celeb-worlds")!;

export const metadata = { title: `${item.label} | Lab` };

export default function Page() {
  return (
    <section className="space-y-8 rounded-[2rem] border border-white/5 bg-white/[0.02] p-4 md:p-8">
      <div className="space-y-2 text-center">
        <h2 className="font-cinzel text-2xl tracking-[0.2em] text-accent">{item.title}</h2>
        <p className="text-sm text-text-secondary">{item.subtitle}</p>
      </div>
      <CelebWorldsPreview />
    </section>
  );
}
