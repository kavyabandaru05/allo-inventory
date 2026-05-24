interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/* Empty state display with an SVG illustration, message, and optional action button */
export default function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{ padding: "64px 24px", textAlign: "center" }}
    >
      <svg
        width="80"
        height="80"
        viewBox="0 0 80 80"
        fill="none"
        style={{ marginBottom: 24, opacity: 0.5 }}
      >
        <rect
          x="12"
          y="20"
          width="56"
          height="44"
          rx="6"
          stroke="var(--text-muted)"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
        <circle cx="40" cy="38" r="8" stroke="var(--text-muted)" strokeWidth="2" />
        <line
          x1="36"
          y1="50"
          x2="44"
          y2="50"
          stroke="var(--text-muted)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M24 56h32"
          stroke="var(--text-muted)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.5"
        />
      </svg>
      <h3
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: "var(--text-primary)",
          marginBottom: 8,
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          style={{
            fontSize: 13,
            color: "var(--text-muted)",
            maxWidth: 320,
            marginBottom: actionLabel ? 24 : 0,
          }}
        >
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button className="btn btn-primary" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
