/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from "./generated/client/client";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";

// Set up WebSocket support for Neon in Node.js (needed for local development and CLI scripts)
if (typeof window === "undefined" && typeof global !== "undefined") {
  neonConfig.webSocketConstructor = ws;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Default connection string to allow compiling and startup health-check connection tests
const connectionString = process.env.DATABASE_URL || "postgresql://localhost:5432";
const pool = new Pool({ connectionString });
const adapter = new PrismaNeon(pool as any);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export { ReservationStatus } from "./generated/client/client";
