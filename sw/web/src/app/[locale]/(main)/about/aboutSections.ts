export const ABOUT_SECTIONS = [
  { id: "about-vision", titleKey: "aboutVisionTitle" },
  { id: "about-current", titleKey: "aboutWhatTitle" },
  { id: "about-method", titleKey: "aboutContentTitle" },
  { id: "contact", titleKey: "aboutOperatorTitle" },
] as const;

export function aboutSection(index: number, t: (key: string) => string) {
  const section = ABOUT_SECTIONS[index];
  return {
    id: section.id,
    title: t(section.titleKey),
    index,
    total: ABOUT_SECTIONS.length,
    hideDivider: index === 0,
  };
}
