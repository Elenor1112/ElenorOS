"use client";
import * as React from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { CommandPalette } from "./command-palette";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);

  React.useEffect(() => {
    const stored = localStorage.getItem("elenor-sidebar");
    if (stored) setCollapsed(stored === "1");
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("elenor-sidebar", next ? "1" : "0");
      return next;
    });
  };

  return (
    // print:* rules drop the chrome and let the page flow across sheets, so
    // window.print() yields a clean PDF of just the page content.
    <div className="flex h-screen overflow-hidden bg-background print:block print:h-auto print:overflow-visible">
      <div className="contents print:hidden">
        <Sidebar collapsed={collapsed} onToggle={toggle} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col print:block">
        <div className="contents print:hidden">
          <Topbar />
        </div>
        <main className="flex-1 overflow-y-auto print:overflow-visible">{children}</main>
      </div>
      <CommandPalette />
    </div>
  );
}
