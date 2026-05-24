import { NextResponse } from "next/server";
import { expireStaleReservations } from "@/lib/reservations";

export const dynamic = "force-dynamic";

/* POST /api/admin/expire — admin action to manually trigger stale reservation cleanup */
export async function POST() {
  try {
    const expiredCount = await expireStaleReservations();
    return NextResponse.json({
      expired: expiredCount,
      message:
        expiredCount > 0
          ? `${expiredCount} reservation${expiredCount === 1 ? "" : "s"} expired`
          : "No expired reservations found",
    });
  } catch (error) {
    console.error("POST /api/admin/expire error:", error);
    return NextResponse.json(
      { error: "Failed to expire reservations", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
