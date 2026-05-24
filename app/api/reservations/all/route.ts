import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/* GET /api/reservations/all — fetch all reservations with their associated products */
export async function GET() {
  try {
    const reservations = await prisma.reservation.findMany({
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(reservations);
  } catch (error) {
    console.error("GET /api/reservations/all error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reservations", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
