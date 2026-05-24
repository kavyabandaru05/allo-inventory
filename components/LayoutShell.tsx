"use client";

import React from "react";

/* Client-side layout shell — handles responsive sidebar margin adjustments */
export function LayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar is the first child */}
      {React.Children.toArray(children)[0]}

      <main
        className="layout-main flex-1"
        style={{
          marginLeft: "var(--sidebar-width)",
          minHeight: "100vh",
          transition: "margin-left 200ms ease",
        }}
      >
        {/* Page content is the second child */}
        {React.Children.toArray(children).slice(1)}
      </main>

      <style jsx global>{`
        @media (max-width: 1023px) and (min-width: 768px) {
          .layout-main {
            margin-left: var(--sidebar-collapsed) !important;
          }
        }
        @media (max-width: 767px) {
          .layout-main {
            margin-left: 0 !important;
            padding-top: 56px;
          }
        }
      `}</style>
    </div>
  );
}
