"use client";

import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import StockIndicator from "./StockIndicator";

interface ProductData {
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

interface ProductCardProps {
  product: ProductData;
}

/* Gradient color from product name — produces a unique but consistent color per product */
function getGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue1 = Math.abs(hash) % 360;
  const hue2 = (hue1 + 40) % 360;
  return `linear-gradient(135deg, hsl(${hue1}, 60%, 25%) 0%, hsl(${hue2}, 50%, 15%) 100%)`;
}

/* Warehouse dot color based on warehouse name */
function getWarehouseColor(warehouse: string): string {
  if (warehouse.includes("Hyderabad")) return "var(--accent)";
  if (warehouse.includes("Mumbai")) return "var(--success)";
  if (warehouse.includes("Delhi")) return "var(--warning)";
  return "var(--text-muted)";
}

/* Product card displaying image, details, stock level, and reserve button */
export default function ProductCard({ product }: ProductCardProps) {
  const isOutOfStock = product.availableStock === 0;

  return (
    <div className="card card-interactive" style={{ display: "flex", flexDirection: "column" }}>
      {/* Image placeholder */}
      <div
        style={{
          width: "100%",
          height: 180,
          borderRadius: 8,
          background: product.imageUrl || getGradient(product.name),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
          overflow: "hidden",
        }}
      >
        {!product.imageUrl && (
          <span
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: "rgba(255,255,255,0.3)",
              userSelect: "none",
            }}
          >
            {product.name.charAt(0)}
          </span>
        )}
      </div>

      {/* Product name */}
      <h3
        style={{
          fontSize: 16,
          fontWeight: 500,
          color: "var(--text-primary)",
          marginBottom: 8,
          lineHeight: 1.3,
        }}
      >
        {product.name}
      </h3>

      {/* SKU + Warehouse */}
      <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 12 }}>
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
        <span className="flex items-center gap-1" style={{ fontSize: 12, color: "var(--text-muted)" }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: getWarehouseColor(product.warehouse),
              display: "inline-block",
            }}
          />
          {product.warehouse}
        </span>
      </div>

      {/* Price */}
      <p
        style={{
          fontSize: 20,
          fontWeight: 600,
          color: "var(--text-primary)",
          marginBottom: 16,
          letterSpacing: "-0.02em",
        }}
      >
        {formatPrice(product.priceInPaise)}
      </p>

      {/* Stock indicator */}
      <div style={{ marginBottom: 16 }}>
        <StockIndicator available={product.availableStock} total={product.totalStock} />
      </div>

      {/* Reserve button */}
      <div style={{ marginTop: "auto" }}>
        {isOutOfStock ? (
          <button
            className="btn btn-danger"
            disabled
            style={{ width: "100%" }}
          >
            Out of Stock
          </button>
        ) : (
          <Link
            href={`/checkout/${product.id}`}
            className="btn btn-primary"
            style={{ width: "100%", textDecoration: "none", display: "flex" }}
          >
            Reserve Stock
          </Link>
        )}
      </div>
    </div>
  );
}
