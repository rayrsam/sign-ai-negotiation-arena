import { BriefScreen } from "@/screens/brief-screen";
import { LessonsScreen } from "@/screens/lessons-screen";
import { MeetingScreen } from "@/screens/meeting-screen";
import { PracticeIntroScreen } from "@/screens/practice-intro-screen";
import { ShortReportScreen } from "@/screens/short-report-screen";
import { FullReportScreen } from "@/screens/full-report-screen";
import { ReplayScreen } from "@/screens/replay-screen";
import { TheoryScreen } from "@/screens/theory-screen";
import { LessonOutcomeScreen } from "@/screens/lesson-outcome-screen";
import { TableApp } from "@/table/table-app";
import { tableScreenOf, useSearch } from "@/table/lib/router";
import "@/report.css";

export default function App() {
  // The table mini-game navigates with the History API, so the screen is read reactively.
  const screen = new URLSearchParams(useSearch()).get("screen");

  const tableScreen = tableScreenOf(screen);
  if (tableScreen) return <TableApp screen={tableScreen} />;

  if (screen === "meeting") return <MeetingScreen />;
  if (screen === "brief") return <BriefScreen />;
  if (screen === "lessons") return <LessonsScreen />;
  if (screen === "theory") return <TheoryScreen />;
  if (screen === "report") return <ShortReportScreen />;
  if (screen === "full-report") return <FullReportScreen />;
  if (screen === "replay") return <ReplayScreen />;
  if (screen === "lesson-outcome") return <LessonOutcomeScreen />;
  if (screen === "intro") return <PracticeIntroScreen />;

  window.location.replace("?screen=lessons");
  return null;
}
