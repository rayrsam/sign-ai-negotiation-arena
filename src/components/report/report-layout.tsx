import type { ReactNode } from "react";
import { ReportSidebar } from "@/components/report/report-sidebar";

interface ReportLayoutProps {
  title: string;
  location?: string;
  breadcrumb?: string;
  children: ReactNode;
  className?: string;
}

export function ReportLayout({ title, location, breadcrumb, children, className = "" }: ReportLayoutProps) {
  return (
    <div className="report-stage">
      <div className={`report-page ${className}`}>
        <ReportSidebar />
        <main className="report-main">
          <header className="report-header">
            <div>
              <h1>{title}</h1>
              <p>{breadcrumb ?? `Главная/Обучение/Блок 3 · Урок 2/${location}`}</p>
            </div>
            <div className="report-header-tools">
              <label className="report-search">
                <svg className="report-search-icon" viewBox="0 0 27 25" fill="none" aria-hidden="true">
                  <circle cx="17" cy="9.5" r="8" stroke="currentColor" strokeWidth="2.2" />
                  <path d="M11.2 15.2 2 23.3" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
                <input type="search" placeholder="Поиск" aria-label="Поиск" />
              </label>
              <span className="report-header-user" aria-label="Профиль"><img src="/icons/profile-header.svg" alt="" /></span>
            </div>
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
