import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { Redis } from "@upstash/redis";

// Set up WebSocket support for Neon in Node.js environment
neonConfig.webSocketConstructor = ws;

// Simple .env file loader for Node.js scripts
function loadEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    content.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const match = trimmed.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = (match[2] || "").trim();
        // Strip leading/trailing single or double quotes
        value = value.replace(/^["']|["']$/g, "");
        process.env[key] = value;
      }
    });
  }
}

function runCommand(command: string): boolean {
  try {
    execSync(command, { stdio: "inherit" });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log("\n=======================================================");
  console.log("      ⚡ Allo Inventory — Production Startup Script ⚡      ");
  console.log("=======================================================\n");

  // 1. Check Node.js Version
  const nodeVersion = process.versions.node;
  const major = parseInt(nodeVersion.split(".")[0], 10);
  if (major < 18) {
    console.error(`❌ [Node version check] Node.js version is ${nodeVersion}. Allo Inventory requires Node.js 18+.\n`);
    process.exit(1);
  }
  console.log(`✅ Node.js version is compatible: ${nodeVersion}`);

  // Load local environment variables from .env
  loadEnv();

  // 2. Validate Environment Variables
  const requiredVars = [
    "DATABASE_URL",
    "DIRECT_URL",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
  ];

  const missingVars = requiredVars.filter((v) => !process.env[v]);

  if (missingVars.length > 0) {
    console.error(`❌ [Env check] Missing environment variables: ${missingVars.join(", ")}`);
    console.log("\n💡 To acquire these settings, please read the README.md instructions:\n");
    console.log("   - Neon DB: https://console.neon.tech/signup");
    console.log("   - Upstash Redis: https://console.upstash.com");
    console.log("\nPlease create a .env file and supply these variables before continuing.\n");
    process.exit(1);
  }
  console.log("✅ All required environment variables are present in .env");

  // 3. Test Neon DB Connection
  console.log("\n🔌 Testing connection to Neon DB...");
  let neonConnected = false;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    const client = await pool.connect();
    await client.query("SELECT 1;");
    client.release();
    console.log("✅ Neon DB connection test passed!");
    neonConnected = true;
  } catch (err: any) {
    console.error(`❌ Neon DB connection failed: ${err.message}`);
    console.error("💡 Check that your DATABASE_URL is correct and has standard credentials.");
  }

  // 4. Test Redis Connection
  console.log("\n🔌 Testing connection to Upstash Redis...");
  let redisConnected = false;
  try {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    const pong = await redis.ping();
    if (pong === "PONG" || pong) {
      console.log("✅ Upstash Redis connection test passed!");
      redisConnected = true;
    }
  } catch (err: any) {
    console.error(`❌ Upstash Redis connection failed: ${err.message}`);
    console.error("💡 Check that UPSTASH_REDIS_REST_URL and token are correct.");
  }

  if (!neonConnected || !redisConnected) {
    console.error("\n❌ [Connectivity Check failed] DB or Redis could not connect. Halting setup.\n");
    await pool.end();
    process.exit(1);
  }

  // 5. Validate Prisma Schema
  console.log("\n🔍 Validating Prisma schema...");
  if (!runCommand("npx prisma validate")) {
    console.error("❌ Prisma schema validation failed.");
    await pool.end();
    process.exit(1);
  }
  console.log("✅ Prisma schema is syntactically correct.");

  // 6. Push Schema to Neon DB
  console.log("\n🚀 Syncing database schema with Neon DB...");
  if (!runCommand("npx prisma db push")) {
    console.error("❌ Database push failed.");
    await pool.end();
    process.exit(1);
  }
  console.log("✅ Database schema is up to date.");

  // 7. Generate Prisma Client
  console.log("\n📦 Generating Prisma Client...");
  if (!runCommand("npx prisma generate")) {
    console.error("❌ Prisma Client generation failed.");
    await pool.end();
    process.exit(1);
  }
  console.log("✅ Prisma Client generated successfully.");

  // 8. Check Database Seed Status
  console.log("\n📊 Verifying seed data in database...");
  const { prisma } = await import("../lib/prisma");

  try {
    const productCount = await prisma.product.count();
    console.log(`📈 Current product count: ${productCount}`);
    
    if (productCount === 0) {
      console.log("⚠️ No products found in the database. Running seed script...");
      if (runCommand("npm run seed")) {
        console.log("✅ Database successfully populated with initial warehouse inventory!");
      } else {
        console.warn("⚠️ Seed command returned an error. Product inventory may not be seeded.");
      }
    } else {
      console.log("✅ Database already has pre-existing seed data.");
    }
  } catch (err: any) {
    console.error(`❌ Error verifying/seeding products: ${err.message}`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }

  console.log("\n=======================================================");
  console.log("  🎉 Allo Inventory system is fully ready to deploy! 🎉 ");
  console.log("  Run 'npm run dev' to start the application.          ");
  console.log("=======================================================\n");
}

main().catch((err) => {
  console.error("Unexpected error running setup script:", err);
  process.exit(1);
});
