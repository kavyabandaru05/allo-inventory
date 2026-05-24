import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/* GET /api/reservations/[id] — fetch a single reservation with product and computed secondsRemaining */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: params.id },
      include: { product: true },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const secondsRemaining = Math.max(
      0,
      Math.floor((reservation.expiresAt.getTime() - Date.now()) / 1000)
    );

    return NextResponse.json({
      ...reservation,
      secondsRemaining,
    });
  } catch (error) {
    console.error("GET /api/reservations/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reservation", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
