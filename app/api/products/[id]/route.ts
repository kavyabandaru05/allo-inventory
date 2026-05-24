/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAvailableStock } from "@/lib/reservations";
import { cacheGet, cacheSet, CACHE_KEYS } from "@/lib/redis";

/* GET /api/products/[id] — fetch a single product with computed availableStock (cached for 30s) */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cacheKey = CACHE_KEYS.PRODUCT_ITEM(params.id);
    
    // Attempt to load from Redis cache
    const cachedProduct = await cacheGet<any>(cacheKey);
    if (cachedProduct) {
      return NextResponse.json(cachedProduct, {
        headers: { "X-Cache": "HIT" },
      });
    }

    const product = await prisma.product.findUnique({
      where: { id: params.id },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const availableStock = await getAvailableStock(product.id);

    const productData = {
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

    // Save to Redis cache for 30 seconds
    await cacheSet(cacheKey, productData, 30);

    return NextResponse.json(productData, {
      headers: { "X-Cache": "MISS" },
    });
  } catch (error) {
    console.error("GET /api/products/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch product", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
