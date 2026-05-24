import { format } from "date-fns";

/* Convert paise (smallest currency unit) to formatted INR string like ₹1,34,900.00 */
export function formatPrice(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/* Format a date into a human-readable string like "24 May 2026, 4:32 PM" */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd MMM yyyy, h:mm a");
}

/* Format seconds into a countdown string like "09:45" */
export function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/* Merge CSS class names, filtering out falsy values */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

/* Generate a short display ID from a CUID — returns first 8 chars uppercased with # prefix */
export function generateReservationId(id: string): string {
  return `#${id.slice(0, 8).toUpperCase()}`;
}
