import { NextRequest, NextResponse } from "next/server";
import { releaseReservation } from "@/lib/reservations";

/* PATCH /api/reservations/[id]/release — release a pending reservation back to available stock */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reservation = await releaseReservation(params.id);
    return NextResponse.json(reservation);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.startsWith("INVALID_STATUS:")) {
      return NextResponse.json(
        {
          error: message.replace("INVALID_STATUS:", ""),
          code: "INVALID_STATUS",
        },
        { status: 409 }
      );
    }

    console.error("PATCH /api/reservations/[id]/release error:", error);
    return NextResponse.json(
      { error: "Failed to release reservation", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
