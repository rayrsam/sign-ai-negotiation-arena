import { useLayoutEffect } from "react";
import type { ScreenId } from "@/table/lib/router";
import { SettingsScreen } from "@/table/screens/settings-screen";
import { HowtoScreen } from "@/table/screens/howto-screen";
import { TableScreen } from "@/table/screens/table-screen";
import { ResultScreen } from "@/table/screens/result-screen";
import { ReportScreen } from "@/table/screens/report-screen";
import { FullReportScreen } from "@/table/screens/full-report-screen";
import { HistoryScreen } from "@/table/screens/history-screen";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/settings.css";
import "./styles/howto.css";
import "./styles/table.css";
import "./styles/dialogs.css";
import "./styles/result.css";
import "./styles/report.css";
import "./styles/full-report.css";
import "./styles/history.css";

/** Marks the document while the table mini-game is shown: its element-level base styles apply only then. */
function useTableModuleClass() {
  useLayoutEffect(() => {
    document.documentElement.classList.add("table-module");
    return () => document.documentElement.classList.remove("table-module");
  }, []);
}

export function TableApp({ screen }: { screen: ScreenId }) {
  useTableModuleClass();
  switch (screen) {
    case "howto":
      return <HowtoScreen />;
    case "table":
      return <TableScreen />;
    case "result":
      return <ResultScreen />;
    case "report":
      return <ReportScreen />;
    case "full-report":
      return <FullReportScreen />;
    case "history":
      return <HistoryScreen />;
    default:
      return <SettingsScreen />;
  }
}
