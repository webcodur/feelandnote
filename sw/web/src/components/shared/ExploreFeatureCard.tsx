import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

export default function ExploreFeatureCard({ href, title, description, imageSrc, wide = false, badge }: {
  href: string;
  title: string;
  description: string;
  imageSrc: string;
  wide?: boolean;
  badge?: string;
}) {
  return (
    <Link href={href} prefetch={false}
      className={`group relative grid min-h-40 grid-cols-[minmax(0,1fr)_44%] items-center overflow-hidden rounded-xl border border-accent/15 bg-[#0a0a0a] hover:border-accent/60 active:bg-accent/10 outline-none focus-visible:ring-2 focus-visible:ring-accent md:min-h-56 ${wide ? "lg:grid-cols-[minmax(0,1fr)_24%]" : ""}`}>
      <div className="relative order-2 aspect-square w-full overflow-hidden bg-[#0a0a0a]">
        <Image src={imageSrc} alt="" fill sizes={wide ? "(min-width: 1024px) 256px, 44vw" : "(min-width: 1024px) 260px, 44vw"}
          className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:transform-none" />
        <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1/6 bg-gradient-to-r from-[#0a0a0a] to-transparent" />
      </div>
      <div className="relative z-10 flex min-w-0 flex-col justify-center pl-4 pr-2 py-5 md:pl-6 md:pr-3">
        {badge && <span className="mb-2 w-fit rounded border border-accent/25 bg-accent/5 px-1.5 py-0.5 text-[10px] font-medium text-accent md:text-xs">{badge}</span>}
        <h3 className="text-lg font-semibold leading-snug text-text-primary group-hover:text-accent md:text-xl">
          <span className="inline-flex items-center gap-1.5">{title}<ArrowUpRight size={16} className="shrink-0 text-accent group-hover:text-accent-hover" aria-hidden /></span>
        </h3>
        <p className="mt-2 max-w-sm break-keep text-[13px] leading-relaxed text-text-secondary md:text-sm">{description}</p>
      </div>
    </Link>
  );
}
