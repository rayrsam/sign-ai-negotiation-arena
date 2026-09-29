import { useModuleClass } from "@/lib/module-class";
import type { ScreenId } from "@/free/lib/router";
import { FlowProvider } from "@/free/state/flow";
import { SetupMethodScreen } from "@/free/screens/setup-method-screen";
import { CounterpartyScreen } from "@/free/screens/counterparty-screen";
import { DetailsScreen } from "@/free/screens/details-screen";
import { ExactScreen } from "@/free/screens/exact-screen";
import { RandomLockScreen, RandomResultScreen } from "@/free/screens/random-screens";
import { SeedScreen } from "@/free/screens/seed-screen";
import { BriefScreen } from "@/free/screens/brief-screen";
import { MeetingScreen } from "@/free/screens/meeting-screen";
import { ReportScreen } from "@/free/screens/report-screen";
import { FullReportScreen } from "@/free/screens/full-report-screen";
import { ReplayScreen } from "@/free/screens/replay-screen";
import "./styles/base.css";
import "./styles/setup.css";
import "./styles/session.css";
import "./styles/meeting.css";
import "./styles/report.css";
import "./styles/full-report.css";
import "./styles/replay.css";

function Screen({ screen }: { screen: ScreenId }) {
  switch (screen) {
    case "counterparty":
      return <CounterpartyScreen />;
    case "details":
      return <DetailsScreen />;
    case "exact":
      return <ExactScreen />;
    case "random":
      return <RandomLockScreen />;
    case "random-result":
      return <RandomResultScreen />;
    case "seed":
      return <SeedScreen />;
    case "brief":
      return <BriefScreen />;
    case "meeting":
      return <MeetingScreen />;
    case "report":
      return <ReportScreen />;
    case "full-report":
      return <FullReportScreen />;
    case "replay":
      return <ReplayScreen />;
    default:
      return <SetupMethodScreen />;
  }
}

export function FreeApp({ screen }: { screen: ScreenId }) {
  useModuleClass("free-module");
  return (
    <FlowProvider>
      <Screen screen={screen} />
    </FlowProvider>
  );
}
