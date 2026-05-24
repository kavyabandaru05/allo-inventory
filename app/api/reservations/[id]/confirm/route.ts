import { NextRequest, NextResponse } from "next/server";
import { confirmReservation } from "@/lib/reservations";

/* PATCH /api/reservations/[id]/confirm — confirm a pending reservation */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reservation = await confirmReservation(params.id);
    return NextResponse.json(reservation);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.startsWith("RESERVATION_EXPIRED:")) {
      return NextResponse.json(
        {
          error: message.replace("RESERVATION_EXPIRED:", ""),
          code: "RESERVATION_EXPIRED",
        },
        { status: 410 }
      );
    }

    if (message.startsWith("INVALID_STATUS:")) {
      return NextResponse.json(
        {
          error: message.replace("INVALID_STATUS:", ""),
          code: "INVALID_STATUS",
        },
        { status: 409 }
      );
    }

    console.error("PATCH /api/reservations/[id]/confirm error:", error);
    return NextResponse.json(
      { error: "Failed to confirm reservation", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
