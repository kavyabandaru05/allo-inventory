import { PrismaClient } from "./generated/client/client";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";

// Set up WebSocket support for Neon in Node.js (needed for local development and CLI scripts)
if (typeof window === "undefined" && typeof globalThis.WebSocket === "undefined") {
  const ws = eval('require("ws")');
  neonConfig.webSocketConstructor = ws;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Lazy initializer for Prisma Client. 
 * Prevents connection strings from being evaluated statically at import-time 
 * before environment variables are loaded.
 */
export function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    let connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL is not defined in your environment variables. Please check your .env file."
      );
    }
    
    // Clean any leading/trailing quotes (some environment parsers like Next.js dev server preserve quotes)
    connectionString = connectionString.trim().replace(/^["']|["']$/g, "");
    
    // Overwrite the global process.env keys with the clean, quote-stripped strings.
    process.env.DATABASE_URL = connectionString;
    if (process.env.DIRECT_URL) {
      process.env.DIRECT_URL = process.env.DIRECT_URL.trim().replace(/^["']|["']$/g, "");
    }
    
    console.log("DEBUG [lib/prisma.ts]: connectionString =", JSON.stringify(connectionString));
    
    const adapter = new PrismaNeon({ connectionString });
    globalForPrisma.prisma = new PrismaClient({ adapter });
  }
  return globalForPrisma.prisma;
}

/**
 * Proxy wrapper around the Prisma Client singleton.
 * Intercepts all property accesses and routes them to the lazily initialized client.
 * This guarantees the database pool is only created on demand at runtime when a query is executed.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, receiver);
    // If the retrieved property is a function (e.g. $transaction, $connect), bind it to the client
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

export { ReservationStatus } from "./generated/client/client";
