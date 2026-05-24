/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAvailableStock } from "@/lib/reservations";
import { z } from "zod";
import { cacheGet, cacheSet, invalidateProductCache, CACHE_KEYS } from "@/lib/redis";

export const dynamic = "force-dynamic";

const CreateProductSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().min(1, "SKU is required"),
  description: z.string().min(1, "Description is required"),
  totalStock: z.number().int().min(0, "Stock must be a non-negative integer"),
  priceInPaise: z.number().int().min(0, "Price must be a non-negative integer"),
  warehouse: z.string().min(1, "Warehouse is required"),
  imageUrl: z.string().optional().default(""),
});

/* GET /api/products — list all products with computed availableStock field (cached for 60s) */
export async function GET() {
  try {
    // Attempt to load from Redis cache
    const cachedProducts = await cacheGet<any[]>(CACHE_KEYS.ALL_PRODUCTS);
    if (cachedProducts) {
      return NextResponse.json(cachedProducts, {
        headers: { "X-Cache": "HIT" },
      });
    }

    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
    });

    const productsWithAvailability = await Promise.all(
      products.map(async (product: any) => {
        const availableStock = await getAvailableStock(product.id);
        return {
          id: product.id,
          name: product.name,
          sku: product.sku,
          description: product.description,
          totalStock: product.totalStock,
          reservedStock: product.reservedStock,
          availableStock,
          priceInPaise: product.priceInPaise,
          warehouse: product.warehouse,
          imageUrl: product.imageUrl,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        };
      })
    );

    // Save to Redis cache for 60 seconds
    await cacheSet(CACHE_KEYS.ALL_PRODUCTS, productsWithAvailability, 60);

    return NextResponse.json(productsWithAvailability, {
      headers: { "X-Cache": "MISS" },
    });
  } catch (error) {
    console.error("GET /api/products error:", error);
    return NextResponse.json(
      { error: "Failed to fetch products", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/* POST /api/products — create a new product with Zod validation (invalidates cache) */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = CreateProductSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const existing = await prisma.product.findUnique({
      where: { sku: result.data.sku },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A product with this SKU already exists", code: "SKU_EXISTS" },
        { status: 409 }
      );
    }

    const product = await prisma.product.create({
      data: result.data,
    });

    // Invalidate products cache
    await invalidateProductCache();

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("POST /api/products error:", error);
    return NextResponse.json(
      { error: "Failed to create product", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
