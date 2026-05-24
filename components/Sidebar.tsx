"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

/* Responsive sidebar navigation — full width on desktop, icons-only on tablet, overlay on mobile */
export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  /* Close mobile sidebar on route change */
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  /* Prevent body scroll when mobile overlay is open */
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const navItems = [
    {
      label: "Products",
      href: "/products",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      ),
    },
    {
      label: "Reservations",
      href: "/admin",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
  ];

  const isActive = (href: string) => {
    if (href === "/products") return pathname === "/products" || pathname.startsWith("/checkout");
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3" style={{ padding: "24px 16px 32px" }}>
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            backgroundColor: "var(--accent)",
            flexShrink: 0,
          }}
        />
        <span
          className="sidebar-logo-text"
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
          }}
        >
          Allo
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1" style={{ padding: "0 8px", flex: 1 }}>
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "sidebar-nav-item",
                "flex items-center gap-3",
                active && "sidebar-nav-active"
              )}
              style={{
                height: 36,
                borderRadius: 8,
                padding: "0 12px",
                fontSize: 13,
                fontWeight: active ? 500 : 400,
                color: active ? "var(--text-primary)" : "var(--text-secondary)",
                backgroundColor: active ? "var(--accent)" : "transparent",
                transition: "all 150ms ease",
                textDecoration: "none",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-elevated)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                }
              }}
            >
              <span className="sidebar-icon" style={{ flexShrink: 0, display: "flex" }}>{item.icon}</span>
              <span className="sidebar-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* System status */}
      <div
        className="sidebar-status"
        style={{
          padding: "16px",
          borderTop: "1px solid var(--border-subtle)",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: "var(--success)",
              flexShrink: 0,
            }}
          />
          <span
            className="sidebar-status-text"
            style={{ fontSize: 12, color: "var(--text-muted)" }}
          >
            All systems normal
          </span>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="mobile-hamburger"
        onClick={() => setMobileOpen(true)}
        style={{
          position: "fixed",
          top: 12,
          left: 12,
          zIndex: 1001,
          width: 40,
          height: 40,
          display: "none",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          cursor: "pointer",
          color: "var(--text-secondary)",
        }}
        aria-label="Open menu"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="mobile-backdrop"
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            zIndex: 1002,
            animation: "fade-in 250ms ease",
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn("sidebar", mobileOpen && "sidebar-mobile-open")}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          height: "100vh",
          backgroundColor: "var(--bg-surface)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          zIndex: 1003,
          overflowY: "auto",
          overflowX: "hidden",
          transition: "width 200ms ease",
        }}
      >
        {sidebarContent}
      </aside>

      <style jsx>{`
        .sidebar {
          width: var(--sidebar-width);
        }

        .mobile-hamburger {
          display: none !important;
        }

        @media (max-width: 1023px) and (min-width: 768px) {
          .sidebar {
            width: var(--sidebar-collapsed);
          }
          .sidebar .sidebar-label,
          .sidebar .sidebar-logo-text,
          .sidebar .sidebar-status-text {
            display: none;
          }
          .sidebar .sidebar-nav-item {
            justify-content: center;
            padding: 0 !important;
          }
          .sidebar .sidebar-icon {
            margin: 0;
          }
          .sidebar .sidebar-status {
            justify-content: center;
          }
        }

        @media (max-width: 767px) {
          .sidebar {
            transform: translateX(-100%);
            width: var(--sidebar-width);
          }
          .sidebar.sidebar-mobile-open {
            transform: translateX(0);
            animation: sidebar-slide-in 250ms ease;
          }
          .mobile-hamburger {
            display: flex !important;
          }
        }
      `}</style>
    </>
  );
}
