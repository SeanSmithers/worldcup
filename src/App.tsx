import { useEffect } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { Sweepstakes } from "./pages/Sweepstakes";

// Mirror the OS prefers-color-scheme onto a `.dark` class on <html>. Using
// the class strategy (rather than Tailwind's media strategy) gives us a
// single source of truth that can later be flipped manually too.
function useSystemDarkMode(): void {
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = (dark: boolean) => document.documentElement.classList.toggle("dark", dark);
    apply(mq.matches);
    const handler = (e: MediaQueryListEvent) => apply(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
}

export function App() {
  useSystemDarkMode();
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/development" replace />} />
        <Route path="/:id" element={<Sweepstakes />} />
      </Routes>
    </HashRouter>
  );
}
