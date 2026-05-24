"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  exiting: boolean;
}

interface ToastContextValue {
  showToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/* Hook to access the toast notification system */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

/* Toast notification provider — manages toast lifecycle, animations, and auto-dismiss */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 250);
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType) => {
      const id = `toast-${++counterRef.current}`;
      setToasts((prev) => [...prev, { id, message, type, exiting: false }]);
      setTimeout(() => removeToast(id), 4000);
    },
    [removeToast]
  );

  const borderColor = (type: ToastType) => {
    switch (type) {
      case "success":
        return "var(--success)";
      case "error":
        return "var(--danger)";
      case "info":
        return "var(--accent)";
    }
  };

  const iconColor = (type: ToastType) => {
    switch (type) {
      case "success":
        return "var(--success)";
      case "error":
        return "var(--danger)";
      case "info":
        return "var(--accent)";
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          pointerEvents: "none",
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={toast.exiting ? "toast-exit" : "toast-enter"}
            style={{
              width: 320,
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 16,
              borderLeft: `4px solid ${borderColor(toast.type)}`,
              pointerEvents: "auto",
              cursor: "pointer",
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
            }}
            onClick={() => removeToast(toast.id)}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              style={{ flexShrink: 0, marginTop: 1 }}
            >
              {toast.type === "success" && (
                <path
                  d="M8 1C4.13 1 1 4.13 1 8s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7zm3.29 5.29l-4 4a.996.996 0 01-1.41 0l-2-2a.996.996 0 111.41-1.41L6.59 8.17l3.29-3.29a.996.996 0 111.41 1.41z"
                  fill={iconColor(toast.type)}
                />
              )}
              {toast.type === "error" && (
                <path
                  d="M8 1C4.13 1 1 4.13 1 8s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7zm3.54 9.13a.75.75 0 01-1.06 1.06L8 8.71 5.52 11.2a.75.75 0 01-1.06-1.06L6.94 7.65 4.46 5.17A.75.75 0 015.52 4.1L8 6.59l2.48-2.48a.75.75 0 011.06 1.06L9.06 7.65l2.48 2.48z"
                  fill={iconColor(toast.type)}
                />
              )}
              {toast.type === "info" && (
                <path
                  d="M8 1C4.13 1 1 4.13 1 8s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7zm.75 10.5h-1.5v-4h1.5v4zm0-5.5h-1.5V4.5h1.5V6z"
                  fill={iconColor(toast.type)}
                />
              )}
            </svg>
            <span
              style={{
                fontSize: 13,
                color: "var(--text-primary)",
                lineHeight: 1.5,
              }}
            >
              {toast.message}
            </span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
