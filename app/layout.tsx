import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { ToastProvider } from "@/components/Toast";
import { LayoutShell } from "@/components/LayoutShell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Allo Inventory — Inventory Reservation System",
  description:
    "A premium inventory reservation system for multi-warehouse e-commerce. Reserve, confirm, and manage product stock in real-time.",
};

/* Root layout — wraps all pages with the Inter font, toast system, and sidebar navigation */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ToastProvider>
          <LayoutShell>
            <Sidebar />
            {children}
          </LayoutShell>
        </ToastProvider>
      </body>
    </html>
  );
}
