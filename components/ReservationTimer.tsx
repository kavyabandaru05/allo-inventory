"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCountdown } from "@/lib/utils";

interface TimerResult {
  secondsRemaining: number;
  formattedTime: string;
  percentRemaining: number;
  urgency: "normal" | "warning" | "danger";
  isExpired: boolean;
}

interface ReservationTimerProps {
  expiresAt: string;
  totalDuration?: number;
  onExpire?: () => void;
}

/* Live countdown timer that returns urgency-aware state for reservation expiry display */
export function useReservationTimer(
  expiresAt: string,
  totalDuration: number = 600,
  onExpire?: () => void
): TimerResult {
  const calculateRemaining = useCallback(() => {
    const remaining = Math.max(
      0,
      Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
    );
    return remaining;
  }, [expiresAt]);

  const [secondsRemaining, setSecondsRemaining] = useState(calculateRemaining);

  useEffect(() => {
    setSecondsRemaining(calculateRemaining());

    const interval = setInterval(() => {
      const remaining = calculateRemaining();
      setSecondsRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [calculateRemaining, onExpire]);

  const percentRemaining = Math.max(
    0,
    (secondsRemaining / totalDuration) * 100
  );

  const urgency: "normal" | "warning" | "danger" =
    secondsRemaining <= 60
      ? "danger"
      : secondsRemaining <= 180
        ? "warning"
        : "normal";

  return {
    secondsRemaining,
    formattedTime: formatCountdown(secondsRemaining),
    percentRemaining,
    urgency,
    isExpired: secondsRemaining <= 0,
  };
}

/* Inline countdown timer component — renders formatted time with urgency-based color */
export default function ReservationTimer({
  expiresAt,
  totalDuration = 600,
  onExpire,
}: ReservationTimerProps) {
  const { formattedTime, urgency } = useReservationTimer(
    expiresAt,
    totalDuration,
    onExpire
  );

  const color =
    urgency === "danger"
      ? "var(--danger)"
      : urgency === "warning"
        ? "var(--warning)"
        : "var(--success)";

  return (
    <span
      className={urgency === "danger" ? "danger-pulse" : ""}
      style={{
        fontFamily: "monospace",
        fontSize: 13,
        fontWeight: 600,
        color,
      }}
    >
      {formattedTime}
    </span>
  );
}
