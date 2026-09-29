import type { ReactNode } from "react";
import { navigate } from "@/table/lib/router";

const railSpots = [
  { label: "Главная", top: 271 },
  { label: "Обучение", top: 353, href: "?screen=lessons" },
  { label: "Тренировки", top: 435, go: "settings" as const },
  { label: "Прогресс", top: 517 },
  { label: "Свободные переговоры", top: 599 },
  { label: "Достижения", top: 681 },
  { label: "Профиль", top: 922 },
  { label: "Настройки", top: 988 },
];

/** Application rail from the mockups; the highlighted item is baked into the asset. */
export function AppRail() {
  const current = "Тренировки";
  return (
    <nav className="app-rail" aria-label="Разделы приложения">
      <img className="asset app-rail-art" src="/assets/rail-training.svg" alt="" width="92" height="990" draggable={false} />
      <button type="button" className="app-rail-logo" aria-label="Тренировки" title="Тренировки" onClick={() => navigate("settings")} />
      {railSpots.map((spot) => (
        <button
          key={spot.label}
          type="button"
          className="app-rail-spot"
          style={{ top: spot.top }}
          title={spot.label}
          aria-label={spot.label}
          aria-current={spot.label === current ? "page" : undefined}
          onClick={spot.go ? () => navigate(spot.go) : spot.href ? () => window.location.assign(spot.href) : undefined}
        />
      ))}
    </nav>
  );
}

export function PageHeader({ title, breadcrumb }: { title: string; breadcrumb: string }) {
  return (
    <>
      <h1 className="page-title">{title}</h1>
      <p className="page-breadcrumb">{breadcrumb}</p>
      <label className="page-search">
        <img src="/assets/search.svg" alt="" width="31" height="29" />
        <input type="search" placeholder="Поиск" aria-label="Поиск" />
      </label>
      <button type="button" className="page-profile" title="Профиль" aria-label="Профиль">
        <img src="/assets/profile.svg" alt="" width="45" height="45" />
      </button>
    </>
  );
}

export function AppLayout({ title, breadcrumb, children }: { title: string; breadcrumb: string; active?: "training"; children: ReactNode }) {
  return (
    <>
      <AppRail />
      <PageHeader title={title} breadcrumb={breadcrumb} />
      {children}
    </>
  );
}

/** Header of the table screens: logo, scenario title and the subtitle line. */
export function TableHeader({ title, subtitle, logo = true, children }: { title: string; subtitle: string; logo?: boolean; children?: ReactNode }) {
  return (
    <header className="tb-header">
      {logo && <img className="asset tb-logo" src="/assets/logo-table.svg" alt="" width="90" height="90" draggable={false} />}
      <h1 className="tb-title">{title}</h1>
      <p className="tb-subtitle">{subtitle}</p>
      {children}
    </header>
  );
}
