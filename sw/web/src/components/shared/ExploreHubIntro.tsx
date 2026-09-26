export default function ExploreHubIntro({ id, title, description }: {
  id: string;
  title: string;
  description: string;
}) {
  return (
    <header className="mb-4 flex flex-col gap-1.5 md:mb-8 md:items-center md:gap-2 md:text-center">
      <h2 id={id} className="break-keep font-serif text-xl font-bold leading-snug tracking-tight text-text-primary md:text-3xl">
        {title}
      </h2>
      <p className="max-w-xl break-keep text-xs leading-relaxed text-text-secondary md:text-sm">{description}</p>
    </header>
  );
}
