import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/nunito-sans/400.css";
import "@fontsource/nunito-sans/600.css";
import "@fontsource/nunito-sans/700.css";
import "@fontsource/nunito-sans/800.css";
import "@fontsource/nunito-sans/900.css";
import "@fontsource/montserrat-alternates/400.css";
import "@fontsource/montserrat-alternates/600.css";
import "@fontsource/montserrat-alternates/700.css";
import App from "./App";
import "./index.css";
import "./styles/components-base.css";
import "./styles/stage.css";
import "./styles/stage-reports.css";
import { installStageScaling } from "@/lib/stage";
import { installTruncationTitles } from "@/lib/truncation-titles";

installStageScaling();
installTruncationTitles();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
