import { PrismaClient } from "../lib/generated/client/client";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL || "postgresql://localhost:5432";
const pool = new Pool({ connectionString });
const adapter = new PrismaNeon(pool as any);
const prisma = new PrismaClient({ adapter });

/* Seed the database with 8 realistic electronics/lifestyle products */
async function main() {
  const products = [
    {
      name: "iPhone 15 Pro 256GB",
      sku: "IPH15P-256",
      description:
        "Apple iPhone 15 Pro with A17 Pro chip, titanium design, and 48MP camera system. 256GB storage in Natural Titanium.",
      totalStock: 45,
      priceInPaise: 13490000,
      warehouse: "Hyderabad-WH1",
      imageUrl: "",
    },
    {
      name: "Sony WH-1000XM5",
      sku: "SNY-WH1000XM5",
      description:
        "Industry-leading noise cancelling wireless headphones with Auto NC Optimizer, 30-hour battery life, and crystal clear hands-free calling.",
      totalStock: 120,
      priceInPaise: 2699000,
      warehouse: "Mumbai-WH2",
      imageUrl: "",
    },
    {
      name: "MacBook Air M3 8GB",
      sku: "MBA-M3-8GB",
      description:
        "Apple MacBook Air with M3 chip, 13.6-inch Liquid Retina display, 8GB unified memory, and up to 18 hours of battery life.",
      totalStock: 22,
      priceInPaise: 11490000,
      warehouse: "Delhi-WH3",
      imageUrl: "",
    },
    {
      name: 'Samsung 65" QLED TV',
      sku: "SAM-65Q80C",
      description:
        "Samsung 65-inch QLED 4K Smart TV with Neural Quantum Processor, Dolby Atmos, and Object Tracking Sound+.",
      totalStock: 8,
      priceInPaise: 8999000,
      warehouse: "Hyderabad-WH1",
      imageUrl: "",
    },
    {
      name: "iPad Pro 11\" M4",
      sku: "IPD-PRO-M4-11",
      description:
        "Apple iPad Pro 11-inch with M4 chip, Ultra Retina XDR display, and Apple Pencil Pro support. The ultimate iPad experience.",
      totalStock: 37,
      priceInPaise: 9990000,
      warehouse: "Mumbai-WH2",
      imageUrl: "",
    },
    {
      name: "Dyson V15 Detect",
      sku: "DYS-V15-DET",
      description:
        "Dyson V15 Detect cordless vacuum with laser dust detection, piezo sensor, and LCD screen showing real-time particle counts.",
      totalStock: 55,
      priceInPaise: 5290000,
      warehouse: "Delhi-WH3",
      imageUrl: "",
    },
    {
      name: "Apple Watch Ultra 2",
      sku: "APL-WU2-49",
      description:
        "Apple Watch Ultra 2 with S9 SiP, precision dual-frequency GPS, 49mm titanium case, and up to 36 hours of battery life.",
      totalStock: 18,
      priceInPaise: 8990000,
      warehouse: "Hyderabad-WH1",
      imageUrl: "",
    },
    {
      name: "Bose QuietComfort 45",
      sku: "BSE-QC45-BLK",
      description:
        "Bose QuietComfort 45 wireless noise cancelling headphones with high-fidelity audio, 24-hour battery, and TriPort acoustic architecture.",
      totalStock: 2,
      priceInPaise: 2499000,
      warehouse: "Mumbai-WH2",
      imageUrl: "",
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {
        name: product.name,
        description: product.description,
        totalStock: product.totalStock,
        priceInPaise: product.priceInPaise,
        warehouse: product.warehouse,
        imageUrl: product.imageUrl,
      },
      create: product,
    });
  }

  console.log("✅ Seeded 8 products successfully");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Seed error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
