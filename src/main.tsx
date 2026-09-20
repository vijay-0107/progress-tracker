import { createRoot } from "react-dom/client";
import App, { AppErrorBoundary } from "./App";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Learning workspace root is missing.");
createRoot(root).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>,
);
