import { ReservationStatus } from "@prisma/client";

interface StatusBadgeProps {
  status: ReservationStatus;
}

/* Colored status chip that renders differently per reservation status */
export default function StatusBadge({ status }: StatusBadgeProps) {
  const styles: Record<ReservationStatus, { bg: string; color: string }> = {
    PENDING: { bg: "var(--warning-subtle)", color: "var(--warning)" },
    CONFIRMED: { bg: "var(--success-subtle)", color: "var(--success)" },
    RELEASED: { bg: "var(--bg-elevated)", color: "var(--text-muted)" },
    EXPIRED: { bg: "var(--danger-subtle)", color: "var(--danger)" },
  };

  const style = styles[status];

  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        backgroundColor: style.bg,
        color: style.color,
        lineHeight: 1.6,
      }}
    >
      {status}
    </span>
  );
}
