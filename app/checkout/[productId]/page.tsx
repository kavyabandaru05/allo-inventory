"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatPrice, generateReservationId } from "@/lib/utils";
import { useReservationTimer } from "@/components/ReservationTimer";
import StockIndicator from "@/components/StockIndicator";
import { useToast } from "@/components/Toast";

interface Product {
  id: string;
  name: string;
  sku: string;
  description: string;
  totalStock: number;
  reservedStock: number;
  availableStock: number;
  priceInPaise: number;
  warehouse: string;
  imageUrl: string;
}

interface Reservation {
  id: string;
  productId: string;
  customerId: string;
  customerName: string;
  quantity: number;
  status: string;
  expiresAt: string;
  confirmedAt: string | null;
  releasedAt: string | null;
  product: Product;
}

type PageStatus = "idle" | "reserved" | "confirmed" | "cancelled" | "expired";

/* Gradient color from product name */
function getGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue1 = Math.abs(hash) % 360;
  const hue2 = (hue1 + 40) % 360;
  return `linear-gradient(135deg, hsl(${hue1}, 60%, 25%) 0%, hsl(${hue2}, 50%, 15%) 100%)`;
}

/* Checkout page — two-phase flow: reservation form → timer countdown with confirm/cancel */
export default function CheckoutPage() {
  const params = useParams();
  const productId = params.productId as string;
  const { showToast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [status, setStatus] = useState<PageStatus>("idle");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  /* Form state */
  const [form, setForm] = useState({
    customerName: "",
    customerId: "",
    quantity: "1",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [stockError, setStockError] = useState("");

  /* Polling ref for server sync */
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  /* Fetch product data on mount */
  const fetchProduct = useCallback(async () => {
    try {
      const res = await fetch(`/api/products/${productId}`);
      if (!res.ok) throw new Error("Product not found");
      const data = await res.json();
      setProduct(data);
    } catch {
      showToast("Failed to load product", "error");
    } finally {
      setLoading(false);
    }
  }, [productId, showToast]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  /* Poll reservation status every 30 seconds when reserved */
  useEffect(() => {
    if (status === "reserved" && reservation) {
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/reservations/${reservation.id}`);
          if (res.ok) {
            const data = await res.json();
            if (data.status === "EXPIRED") {
              setStatus("expired");
              showToast("Reservation has expired", "error");
            } else if (data.status === "CONFIRMED") {
              setStatus("confirmed");
            }
            setReservation(data);
          }
        } catch {
          /* silent fail on polling */
        }
      }, 30000);

      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }
  }, [status, reservation, showToast]);

  /* Handle form submission — create reservation */
  const handleReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    setStockError("");
    const errors: Record<string, string> = {};

    if (!form.customerName.trim()) errors.customerName = "Name is required";
    if (!form.customerId.trim()) errors.customerId = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customerId))
      errors.customerId = "Please enter a valid email";
    const qty = parseInt(form.quantity);
    if (!qty || qty < 1) errors.quantity = "Quantity must be at least 1";
    else if (product && qty > product.availableStock)
      errors.quantity = `Maximum ${product.availableStock} units available`;

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          customerId: form.customerId.trim(),
          customerName: form.customerName.trim(),
          quantity: qty,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.code === "INSUFFICIENT_STOCK") {
          setStockError(data.error);
          return;
        }
        throw new Error(data.error || "Failed to create reservation");
      }

      const data = await res.json();
      setReservation(data);
      setStatus("reserved");
      showToast("Reservation created successfully!", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Something went wrong. Please try again.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* Confirm the reservation (payment) */
  const handleConfirm = async () => {
    if (!reservation) return;
    setConfirmLoading(true);
    try {
      const res = await fetch(`/api/reservations/${reservation.id}/confirm`, {
        method: "PATCH",
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.code === "RESERVATION_EXPIRED") {
          setStatus("expired");
          showToast("Reservation has expired", "error");
          return;
        }
        throw new Error(data.error || "Failed to confirm");
      }

      const data = await res.json();
      setReservation(data);
      setStatus("confirmed");
      showToast("Payment confirmed! Stock permanently reserved.", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Something went wrong. Please try again.",
        "error"
      );
    } finally {
      setConfirmLoading(false);
    }
  };

  /* Cancel/release the reservation */
  const handleCancel = async () => {
    if (!reservation) return;
    setCancelLoading(true);
    try {
      const res = await fetch(`/api/reservations/${reservation.id}/release`, {
        method: "PATCH",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to release");
      }

      setStatus("cancelled");
      showToast("Reservation released", "info");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Something went wrong. Please try again.",
        "error"
      );
    } finally {
      setCancelLoading(false);
    }
  };

  /* Handle timer expiry */
  const handleExpire = useCallback(async () => {
    if (status !== "reserved" || !reservation) return;
    try {
      await fetch(`/api/reservations/${reservation.id}/release`, {
        method: "PATCH",
      });
    } catch {
      /* silent fail — server will clean up via cron */
    }
    setStatus("expired");
    showToast("Reservation has expired", "error");
  }, [status, reservation, showToast]);

  /* Loading skeleton */
  if (loading) {
    return (
      <div className="page-container">
        <div className="grid gap-8" style={{ gridTemplateColumns: "1fr" }}>
          <div className="card">
            <div className="skeleton" style={{ width: "100%", height: 200, marginBottom: 16 }} />
            <div className="skeleton" style={{ width: "60%", height: 24, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: "40%", height: 20, marginBottom: 16 }} />
            <div className="skeleton" style={{ width: "30%", height: 32 }} />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="page-container">
        <div className="card" style={{ textAlign: "center", padding: 64 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Product Not Found</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>
            The product you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link href="/products" className="btn btn-primary" style={{ textDecoration: "none" }}>
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  /* PHASE 1 — Reservation form */
  if (status === "idle") {
    return (
      <div className="page-container">
        <div
          className="grid gap-8"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}
        >
          {/* Left — Product details */}
          <div className="card">
            <div
              style={{
                width: "100%",
                height: 200,
                borderRadius: 8,
                background: product.imageUrl || getGradient(product.name),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
              }}
            >
              {!product.imageUrl && (
                <span style={{ fontSize: 64, fontWeight: 700, color: "rgba(255,255,255,0.2)" }}>
                  {product.name.charAt(0)}
                </span>
              )}
            </div>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                lineHeight: 1.3,
                marginBottom: 12,
              }}
            >
              {product.name}
            </h1>
            <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 16 }}>
              <span
                style={{
                  fontSize: 11,
                  fontFamily: "monospace",
                  color: "var(--text-muted)",
                  backgroundColor: "var(--bg-elevated)",
                  padding: "2px 8px",
                  borderRadius: 4,
                }}
              >
                {product.sku}
              </span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {product.warehouse}
              </span>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.6 }}>
              {product.description}
            </p>
            <p
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "-0.02em",
                marginBottom: 20,
              }}
            >
              {formatPrice(product.priceInPaise)}
            </p>
            <StockIndicator available={product.availableStock} total={product.totalStock} />
          </div>

          {/* Right — Reserve form */}
          <div className="card">
            <h2 className="section-title" style={{ marginBottom: 24 }}>
              Reserve This Item
            </h2>
            <form onSubmit={handleReserve}>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="label" htmlFor="checkout-name">Your Name</label>
                  <input
                    id="checkout-name"
                    className="input"
                    name="customerName"
                    value={form.customerName}
                    onChange={(e) => {
                      setForm((p) => ({ ...p, customerName: e.target.value }));
                      setFormErrors((p) => ({ ...p, customerName: "" }));
                    }}
                    placeholder="John Doe"
                  />
                  {formErrors.customerName && <p className="error-text">{formErrors.customerName}</p>}
                </div>
                <div>
                  <label className="label" htmlFor="checkout-email">Your Email</label>
                  <input
                    id="checkout-email"
                    className="input"
                    type="email"
                    name="customerId"
                    value={form.customerId}
                    onChange={(e) => {
                      setForm((p) => ({ ...p, customerId: e.target.value }));
                      setFormErrors((p) => ({ ...p, customerId: "" }));
                    }}
                    placeholder="john@example.com"
                  />
                  {formErrors.customerId && <p className="error-text">{formErrors.customerId}</p>}
                </div>
                <div>
                  <label className="label" htmlFor="checkout-qty">Quantity</label>
                  <input
                    id="checkout-qty"
                    className="input"
                    type="number"
                    name="quantity"
                    value={form.quantity}
                    onChange={(e) => {
                      setForm((p) => ({ ...p, quantity: e.target.value }));
                      setFormErrors((p) => ({ ...p, quantity: "" }));
                    }}
                    min="1"
                    max={product.availableStock}
                  />
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                    Max {product.availableStock} units
                  </p>
                  {formErrors.quantity && <p className="error-text">{formErrors.quantity}</p>}
                </div>
              </div>

              {stockError && (
                <div
                  style={{
                    marginTop: 16,
                    padding: "12px 16px",
                    backgroundColor: "var(--danger-subtle)",
                    border: "1px solid var(--danger)",
                    borderRadius: 8,
                    color: "var(--danger)",
                    fontSize: 13,
                  }}
                >
                  {stockError}
                </div>
              )}

              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginTop: 20,
                  marginBottom: 20,
                  lineHeight: 1.6,
                }}
              >
                This item will be held for 10 minutes after you reserve it. Complete your payment within the hold period.
              </p>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: "100%" }}
                disabled={submitting || product.availableStock === 0}
              >
                {submitting ? (
                  <>
                    <svg className="spin" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="7" cy="7" r="5" strokeDasharray="20" strokeDashoffset="10" />
                    </svg>
                    Reserving...
                  </>
                ) : (
                  "Reserve & Proceed to Payment"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  /* PHASE 2 — Post-reservation states */

  /* Confirmed state */
  if (status === "confirmed") {
    return (
      <div className="page-container">
        <div className="card" style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", padding: 48 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              backgroundColor: "var(--success-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 8 }}>
            Payment Confirmed!
          </h1>
          <p style={{ color: "var(--text-secondary)", marginBottom: 24, fontSize: 14 }}>
            Stock permanently reserved. Your order is being processed.
          </p>
          {reservation && (
            <div
              style={{
                backgroundColor: "var(--bg-elevated)",
                borderRadius: 8,
                padding: 20,
                marginBottom: 32,
                textAlign: "left",
              }}
            >
              <div className="grid gap-3" style={{ gridTemplateColumns: "auto 1fr", fontSize: 13 }}>
                <span style={{ color: "var(--text-muted)" }}>Reservation ID</span>
                <span style={{ fontFamily: "monospace", color: "var(--text-primary)" }}>
                  {generateReservationId(reservation.id)}
                </span>
                <span style={{ color: "var(--text-muted)" }}>Product</span>
                <span style={{ color: "var(--text-primary)" }}>{reservation.product.name}</span>
                <span style={{ color: "var(--text-muted)" }}>Quantity</span>
                <span style={{ color: "var(--text-primary)" }}>{reservation.quantity}</span>
                <span style={{ color: "var(--text-muted)" }}>Customer</span>
                <span style={{ color: "var(--text-primary)" }}>{reservation.customerName}</span>
              </div>
            </div>
          )}
          <Link href="/products" className="btn btn-primary" style={{ textDecoration: "none" }}>
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  /* Cancelled state */
  if (status === "cancelled") {
    return (
      <div className="page-container">
        <div className="card" style={{ maxWidth: 500, margin: "0 auto", textAlign: "center", padding: 48 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              backgroundColor: "var(--bg-elevated)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Reservation Released</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: 32, fontSize: 14 }}>
            Your reservation has been cancelled and the stock has been released.
          </p>
          <Link href="/products" className="btn btn-secondary" style={{ textDecoration: "none" }}>
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  /* Expired state */
  if (status === "expired") {
    return (
      <div className="page-container">
        <div className="card" style={{ maxWidth: 500, margin: "0 auto", textAlign: "center", padding: 48 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              backgroundColor: "var(--danger-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: "var(--danger)" }}>
            Reservation Expired
          </h2>
          <p style={{ color: "var(--text-muted)", marginBottom: 32, fontSize: 14 }}>
            Your reservation has expired. The stock has been released back to inventory.
          </p>
          <Link href="/products" className="btn btn-primary" style={{ textDecoration: "none" }}>
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  /* Reserved state — timer countdown */
  return (
    <ReservedView
      reservation={reservation!}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      onExpire={handleExpire}
      confirmLoading={confirmLoading}
      cancelLoading={cancelLoading}
    />
  );
}

/* Separated reserved view to use the timer hook properly at the top level */
function ReservedView({
  reservation,
  onConfirm,
  onCancel,
  onExpire,
  confirmLoading,
  cancelLoading,
}: {
  reservation: Reservation;
  onConfirm: () => void;
  onCancel: () => void;
  onExpire: () => void;
  confirmLoading: boolean;
  cancelLoading: boolean;
}) {
  const { formattedTime, percentRemaining, urgency } = useReservationTimer(
    reservation.expiresAt,
    600,
    onExpire
  );

  const timerColor =
    urgency === "danger"
      ? "var(--danger)"
      : urgency === "warning"
        ? "var(--warning)"
        : "var(--success)";

  const progressBarColor =
    urgency === "danger"
      ? "var(--danger)"
      : urgency === "warning"
        ? "var(--warning)"
        : "var(--accent)";

  return (
    <div className="page-container">
      {/* Success indicator */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            backgroundColor: "var(--success-subtle)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="page-title">Reservation Created</h1>
        <p style={{ fontFamily: "monospace", color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
          {generateReservationId(reservation.id)}
        </p>
      </div>

      {/* Timer card */}
      <div className="card" style={{ maxWidth: 500, margin: "0 auto 32px", textAlign: "center", padding: 48 }}>
        <p
          className={urgency === "danger" ? "danger-pulse" : ""}
          style={{
            fontSize: 64,
            fontWeight: 700,
            fontFamily: "monospace",
            color: timerColor,
            letterSpacing: "0.05em",
            lineHeight: 1,
            marginBottom: 24,
            transition: "color 300ms ease",
          }}
        >
          {formattedTime}
        </p>

        {/* Progress bar */}
        <div
          style={{
            width: "100%",
            height: 6,
            backgroundColor: "var(--bg-elevated)",
            borderRadius: 3,
            overflow: "hidden",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: `${percentRemaining}%`,
              height: "100%",
              backgroundColor: progressBarColor,
              borderRadius: 3,
              transition: "width 1s linear, background-color 300ms ease",
            }}
          />
        </div>

        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Complete your payment before the timer runs out
        </p>
      </div>

      {/* Action buttons */}
      <div
        className="flex gap-4 justify-center flex-wrap"
        style={{ maxWidth: 500, margin: "0 auto" }}
      >
        <button
          className="btn btn-primary"
          onClick={onConfirm}
          disabled={confirmLoading || cancelLoading}
          style={{ flex: 1, minWidth: 180 }}
        >
          {confirmLoading ? (
            <>
              <svg className="spin" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="7" cy="7" r="5" strokeDasharray="20" strokeDashoffset="10" />
              </svg>
              Processing...
            </>
          ) : (
            "Confirm Payment"
          )}
        </button>
        <button
          className="btn btn-danger"
          onClick={onCancel}
          disabled={confirmLoading || cancelLoading}
          style={{ flex: 1, minWidth: 180 }}
        >
          {cancelLoading ? (
            <>
              <svg className="spin" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="7" cy="7" r="5" strokeDasharray="20" strokeDashoffset="10" />
              </svg>
              Cancelling...
            </>
          ) : (
            "Cancel Reservation"
          )}
        </button>
      </div>
    </div>
  );
}
