/**
 * Sections of the application sidebar, top to bottom. The lessons, the table and the free negotiations
 * draw their own sidebars (different art and geometry), but the icons are in this order in all of them,
 * so labels and routes come from here.
 */
export const appSections = [
  { id: "overview", label: "Обзор" },
  { id: "learning", label: "Обучение", href: "?screen=lessons" },
  { id: "training", label: "Тренировки", href: "?screen=table-settings" },
  { id: "free", label: "Свободные переговоры", href: "?screen=free-setup" },
  { id: "progress", label: "Прогресс" },
  { id: "achievements", label: "Достижения" },
] as const satisfies ReadonlyArray<{ id: string; label: string; href?: string }>;

export type AppSection = (typeof appSections)[number];
export type AppSectionId = AppSection["id"];

/**
 * Click handler of a sidebar section. The module's own section uses its in-module navigation
 * (keeps the module state); other sections open with a page load.
 */
export function sectionAction(section: AppSection, current: AppSectionId, openCurrent: () => void) {
  if (section.id === current) return openCurrent;
  if ("href" in section) return () => window.location.assign(section.href);
  return undefined;
}
