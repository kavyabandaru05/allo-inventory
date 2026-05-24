"use client";

import { useState, useEffect, useCallback } from "react";
import ProductCard from "@/components/ProductCard";
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

/* Product listing page — displays all products in a responsive grid with an add product drawer */
export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  /* Form state for adding a new product */
  const [form, setForm] = useState({
    name: "",
    sku: "",
    description: "",
    totalStock: "",
    priceInPaise: "",
    warehouse: "Hyderabad-WH1",
    imageUrl: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  /* Fetch all products from the API */
  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setProducts(data);
    } catch {
      showToast("Failed to load products", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  /* Handle form input changes */
  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: "" }));
  };

  /* Validate and submit the add product form */
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!form.name.trim()) errors.name = "Name is required";
    if (!form.sku.trim()) errors.sku = "SKU is required";
    if (!form.description.trim()) errors.description = "Description is required";
    if (!form.totalStock || parseInt(form.totalStock) < 0) errors.totalStock = "Stock must be a non-negative number";
    if (!form.priceInPaise || parseInt(form.priceInPaise) < 0) errors.priceInPaise = "Price must be a non-negative number";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          sku: form.sku.trim(),
          description: form.description.trim(),
          totalStock: parseInt(form.totalStock),
          priceInPaise: parseInt(form.priceInPaise),
          warehouse: form.warehouse,
          imageUrl: form.imageUrl.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.code === "SKU_EXISTS") {
          setFormErrors({ sku: "A product with this SKU already exists" });
          return;
        }
        if (data.details) {
          const fieldErrors: Record<string, string> = {};
          for (const [key, messages] of Object.entries(data.details)) {
            fieldErrors[key] = (messages as string[])[0];
          }
          setFormErrors(fieldErrors);
          return;
        }
        throw new Error(data.error || "Failed to create product");
      }

      showToast("Product created successfully", "success");
      setForm({
        name: "",
        sku: "",
        description: "",
        totalStock: "",
        priceInPaise: "",
        warehouse: "Hyderabad-WH1",
        imageUrl: "",
      });
      setDrawerOpen(false);
      fetchProducts();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Something went wrong. Please try again.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4" style={{ marginBottom: 32 }}>
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">Available inventory across all warehouses</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setDrawerOpen(!drawerOpen)}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="8" y1="3" x2="8" y2="13" />
            <line x1="3" y1="8" x2="13" y2="8" />
          </svg>
          Add Product
        </button>
      </div>

      {/* Add Product Drawer */}
      <div
        style={{
          overflow: "hidden",
          maxHeight: drawerOpen ? 600 : 0,
          opacity: drawerOpen ? 1 : 0,
          transition: "max-height 300ms ease, opacity 200ms ease",
          marginBottom: drawerOpen ? 32 : 0,
        }}
      >
        <form onSubmit={handleAddProduct} className="card" style={{ padding: 24 }}>
          <h3 className="section-title" style={{ marginBottom: 20 }}>
            Add New Product
          </h3>
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            }}
          >
            {/* Name */}
            <div>
              <label className="label" htmlFor="prod-name">Name</label>
              <input
                id="prod-name"
                className="input"
                name="name"
                value={form.name}
                onChange={handleFormChange}
                placeholder="Product name"
              />
              {formErrors.name && <p className="error-text">{formErrors.name}</p>}
            </div>

            {/* SKU */}
            <div>
              <label className="label" htmlFor="prod-sku">SKU</label>
              <input
                id="prod-sku"
                className="input"
                name="sku"
                value={form.sku}
                onChange={handleFormChange}
                placeholder="e.g., IPH15P-256"
              />
              {formErrors.sku && <p className="error-text">{formErrors.sku}</p>}
            </div>

            {/* Total Stock */}
            <div>
              <label className="label" htmlFor="prod-stock">Total Stock</label>
              <input
                id="prod-stock"
                className="input"
                type="number"
                name="totalStock"
                value={form.totalStock}
                onChange={handleFormChange}
                placeholder="0"
                min="0"
              />
              {formErrors.totalStock && <p className="error-text">{formErrors.totalStock}</p>}
            </div>

            {/* Price */}
            <div>
              <label className="label" htmlFor="prod-price">Price (in paise)</label>
              <input
                id="prod-price"
                className="input"
                type="number"
                name="priceInPaise"
                value={form.priceInPaise}
                onChange={handleFormChange}
                placeholder="e.g., 13490000 for ₹1,34,900"
                min="0"
              />
              {formErrors.priceInPaise && <p className="error-text">{formErrors.priceInPaise}</p>}
            </div>

            {/* Warehouse */}
            <div>
              <label className="label" htmlFor="prod-warehouse">Warehouse</label>
              <select
                id="prod-warehouse"
                className="input"
                name="warehouse"
                value={form.warehouse}
                onChange={handleFormChange}
              >
                <option value="Hyderabad-WH1">Hyderabad-WH1</option>
                <option value="Mumbai-WH2">Mumbai-WH2</option>
                <option value="Delhi-WH3">Delhi-WH3</option>
              </select>
            </div>

            {/* Image URL */}
            <div>
              <label className="label" htmlFor="prod-image">Image URL (optional)</label>
              <input
                id="prod-image"
                className="input"
                name="imageUrl"
                value={form.imageUrl}
                onChange={handleFormChange}
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Description (full width) */}
          <div style={{ marginTop: 16 }}>
            <label className="label" htmlFor="prod-desc">Description</label>
            <textarea
              id="prod-desc"
              className="input"
              name="description"
              value={form.description}
              onChange={handleFormChange}
              placeholder="Product description..."
              rows={3}
            />
            {formErrors.description && <p className="error-text">{formErrors.description}</p>}
          </div>

          <div className="flex gap-3" style={{ marginTop: 20 }}>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? (
                <>
                  <svg className="spin" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="7" cy="7" r="5" strokeDasharray="20" strokeDashoffset="10" />
                  </svg>
                  Creating...
                </>
              ) : (
                "Create Product"
              )}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setDrawerOpen(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div
          className="grid gap-6"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card" style={{ padding: 20 }}>
              <div className="skeleton" style={{ width: "100%", height: 180, marginBottom: 16 }} />
              <div className="skeleton" style={{ width: "70%", height: 20, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: "40%", height: 16, marginBottom: 12 }} />
              <div className="skeleton" style={{ width: "50%", height: 24, marginBottom: 16 }} />
              <div className="skeleton" style={{ width: "100%", height: 4, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: "100%", height: 36 }} />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="card">
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
              <rect x="12" y="20" width="56" height="44" rx="6" stroke="var(--text-muted)" strokeWidth="2" strokeDasharray="4 4" />
              <circle cx="40" cy="38" r="8" stroke="var(--text-muted)" strokeWidth="2" />
              <line x1="36" y1="50" x2="44" y2="50" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
              No products yet
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 320 }}>
              Add your first product to start managing inventory.
            </p>
          </div>
        </div>
      ) : (
        <div
          className="grid gap-6"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          }}
        >
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
