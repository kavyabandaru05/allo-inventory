interface StockIndicatorProps {
  available: number;
  total: number;
}

/* Visual stock level bar — green if ≥50%, amber if 20-50%, red if <20% */
export default function StockIndicator({ available, total }: StockIndicatorProps) {
  const percentage = total > 0 ? (available / total) * 100 : 0;

  const barColor =
    percentage >= 50
      ? "var(--success)"
      : percentage >= 20
        ? "var(--warning)"
        : "var(--danger)";

  return (
    <div>
      <div
        style={{
          width: "100%",
          height: 4,
          backgroundColor: "var(--bg-elevated)",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.min(percentage, 100)}%`,
            height: "100%",
            backgroundColor: barColor,
            borderRadius: 2,
            transition: "width 300ms ease",
          }}
        />
      </div>
      <p
        style={{
          fontSize: 12,
          color: "var(--text-muted)",
          marginTop: 6,
        }}
      >
        {available} of {total} available
      </p>
    </div>
  );
}
