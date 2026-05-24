"use client";

import { useState, useEffect, useCallback } from "react";
import StatusBadge from "@/components/StatusBadge";
import ReservationTimer from "@/components/ReservationTimer";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/components/Toast";
import { formatDate, generateReservationId } from "@/lib/utils";
import { ReservationStatus } from "@prisma/client";

interface ReservationWithProduct {
  id: string;
  productId: string;
  customerId: string;
  customerName: string;
  quantity: number;
  status: ReservationStatus;
  expiresAt: string;
  confirmedAt: string | null;
  releasedAt: string | null;
  createdAt: string;
  product: {
    id: string;
    name: string;
    sku: string;
  };
}

type FilterStatus = "ALL" | ReservationStatus;

const ITEMS_PER_PAGE = 20;

/* Admin reservations page — stats, filter bar, and full reservations table with live timers */
export default function AdminPage() {
  const [reservations, setReservations] = useState<ReservationWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expiryLoading, setExpiryLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({});
  const { showToast } = useToast();

  /* Fetch all reservations with products included */
  const fetchReservations = useCallback(async () => {
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      const products = await res.json();

      const allReservations: ReservationWithProduct[] = [];

      for (const product of products) {
        const resRes = await fetch(`/api/products/${product.id}`);
        if (!resRes.ok) continue;
      }

      /* Fetch all reservations directly from the dedicated endpoint */
      const reservationRes = await fetch("/api/reservations/all");
      if (reservationRes.ok) {
        const data = await reservationRes.json();
        allReservations.push(...data);
      }

      setReservations(allReservations);
    } catch {
      /* Fallback: we'll use the product-based approach */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  /* Stats calculation */
  const stats = {
    total: reservations.length,
    pending: reservations.filter((r) => r.status === "PENDING").length,
    confirmed: reservations.filter((r) => r.status === "CONFIRMED").length,
    expiredAndReleased: reservations.filter(
      (r) => r.status === "EXPIRED" || r.status === "RELEASED"
    ).length,
  };

  /* Filtered reservations */
  const filtered = reservations
    .filter((r) => filter === "ALL" || r.status === filter)
    .filter((r) => {
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      return (
        r.customerName.toLowerCase().includes(s) ||
        r.customerId.toLowerCase().includes(s) ||
        r.product.name.toLowerCase().includes(s)
      );
    });

  /* Pagination */
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  /* Run expiry check */
  const handleExpiryCheck = async () => {
    setExpiryLoading(true);
    try {
      const res = await fetch("/api/cron/expire-reservations");
      if (!res.ok) throw new Error("Failed to run expiry check");
      const data = await res.json();
      if (data.expired > 0) {
        showToast(`${data.expired} reservation${data.expired === 1 ? "" : "s"} expired`, "success");
        fetchReservations();
      } else {
        showToast("No expired reservations found", "info");
      }
    } catch {
      showToast("Failed to run expiry check", "error");
    } finally {
      setExpiryLoading(false);
    }
  };

  /* Confirm a reservation from the table */
  const handleConfirm = async (id: string) => {
    setActionLoading((prev) => ({ ...prev, [id]: "confirm" }));
    try {
      const res = await fetch(`/api/reservations/${id}/confirm`, {
        method: "PATCH",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to confirm");
      }
      showToast("Reservation confirmed", "success");
      fetchReservations();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Something went wrong",
        "error"
      );
    } finally {
      setActionLoading((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    }
  };

  /* Release a reservation from the table */
  const handleRelease = async (id: string) => {
    setActionLoading((prev) => ({ ...prev, [id]: "release" }));
    try {
      const res = await fetch(`/api/reservations/${id}/release`, {
        method: "PATCH",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to release");
      }
      showToast("Reservation released", "info");
      fetchReservations();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Something went wrong",
        "error"
      );
    } finally {
      setActionLoading((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    }
  };

  const filterOptions: { label: string; value: FilterStatus }[] = [
    { label: "All", value: "ALL" },
    { label: "Pending", value: "PENDING" },
    { label: "Confirmed", value: "CONFIRMED" },
    { label: "Released", value: "RELEASED" },
    { label: "Expired", value: "EXPIRED" },
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 className="page-title">Reservations</h1>
        <p className="page-subtitle">Monitor all reservation activity</p>
      </div>

      {/* Stats row */}
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          marginBottom: 32,
        }}
      >
        {[
          { label: "Total Reservations", value: stats.total, color: "var(--text-primary)" },
          { label: "Active", value: stats.pending, color: "var(--warning)" },
          { label: "Confirmed", value: stats.confirmed, color: "var(--success)" },
          { label: "Expired + Released", value: stats.expiredAndReleased, color: "var(--text-muted)" },
        ].map((stat) => (
          <div key={stat.label} className="card">
            <p style={{ fontSize: 32, fontWeight: 700, color: stat.color, lineHeight: 1.2, marginBottom: 4 }}>
              {loading ? "—" : stat.value}
            </p>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div
        className="flex items-center gap-4 flex-wrap"
        style={{ marginBottom: 24 }}
      >
        {/* Status filter pills */}
        <div className="flex gap-1" style={{ flexWrap: "wrap" }}>
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setFilter(opt.value);
                setPage(1);
              }}
              className="btn"
              style={{
                height: 32,
                padding: "0 12px",
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 16,
                backgroundColor:
                  filter === opt.value ? "var(--accent)" : "transparent",
                color:
                  filter === opt.value
                    ? "white"
                    : "var(--text-secondary)",
                border: `1px solid ${
                  filter === opt.value ? "var(--accent)" : "var(--border)"
                }`,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          className="input"
          style={{ maxWidth: 260, height: 32, fontSize: 12 }}
          placeholder="Search by customer, email, or product..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />

        {/* Expiry check button */}
        <button
          className="btn btn-secondary"
          style={{ marginLeft: "auto", height: 32, fontSize: 12 }}
          onClick={handleExpiryCheck}
          disabled={expiryLoading}
        >
          {expiryLoading ? (
            <>
              <svg className="spin" width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="7" cy="7" r="5" strokeDasharray="20" strokeDashoffset="10" />
              </svg>
              Running...
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
              </svg>
              Run Expiry Check
            </>
          )}
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card" style={{ padding: 0 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4"
              style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)" }}
            >
              <div className="skeleton" style={{ width: 80, height: 16 }} />
              <div className="skeleton" style={{ width: 120, height: 16 }} />
              <div className="skeleton" style={{ width: 100, height: 16 }} />
              <div className="skeleton" style={{ width: 40, height: 16 }} />
              <div className="skeleton" style={{ width: 70, height: 22 }} />
              <div className="skeleton" style={{ width: 120, height: 16 }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No reservations found"
            description={
              filter !== "ALL"
                ? `No ${filter.toLowerCase()} reservations match your search.`
                : "No reservations have been made yet."
            }
          />
        </div>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Reservation ID</th>
                  <th>Product</th>
                  <th>Customer</th>
                  <th>Qty</th>
                  <th>Status</th>
                  <th>Reserved At</th>
                  <th>Expires At</th>
                  <th>Time Left</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span style={{ fontFamily: "monospace", fontSize: 12 }}>
                        {generateReservationId(r.id)}
                      </span>
                    </td>
                    <td>{r.product.name}</td>
                    <td>
                      <div>
                        <div style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                          {r.customerName}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          {r.customerId}
                        </div>
                      </div>
                    </td>
                    <td>{r.quantity}</td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                      {formatDate(r.createdAt)}
                    </td>
                    <td style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                      {formatDate(r.expiresAt)}
                    </td>
                    <td>
                      {r.status === "PENDING" ? (
                        <ReservationTimer expiresAt={r.expiresAt} />
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </td>
                    <td>
                      {r.status === "PENDING" ? (
                        <div className="flex gap-2">
                          <button
                            className="btn btn-primary btn-compact"
                            onClick={() => handleConfirm(r.id)}
                            disabled={!!actionLoading[r.id]}
                          >
                            {actionLoading[r.id] === "confirm" ? (
                              <svg className="spin" width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="7" cy="7" r="5" strokeDasharray="20" strokeDashoffset="10" />
                              </svg>
                            ) : (
                              "Confirm"
                            )}
                          </button>
                          <button
                            className="btn btn-danger btn-compact"
                            onClick={() => handleRelease(r.id)}
                            disabled={!!actionLoading[r.id]}
                          >
                            {actionLoading[r.id] === "release" ? (
                              <svg className="spin" width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="7" cy="7" r="5" strokeDasharray="20" strokeDashoffset="10" />
                              </svg>
                            ) : (
                              "Release"
                            )}
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "capitalize" }}>
                          {r.status.toLowerCase()}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div
            className="flex items-center justify-between"
            style={{ marginTop: 16, fontSize: 13, color: "var(--text-muted)" }}
          >
            <span>
              Showing {(page - 1) * ITEMS_PER_PAGE + 1}–
              {Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex gap-2">
              <button
                className="btn btn-secondary btn-compact"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </button>
              <button
                className="btn btn-secondary btn-compact"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
