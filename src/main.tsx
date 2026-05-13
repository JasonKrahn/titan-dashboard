import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { PwaStatus } from "./components/PwaStatus.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <PwaStatus />
  </>,
);
