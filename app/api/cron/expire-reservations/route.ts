import { NextRequest, NextResponse } from "next/server";
import { expireStaleReservations } from "@/lib/reservations";

export const dynamic = "force-dynamic";

/* GET /api/cron/expire-reservations — expire all overdue PENDING reservations, optionally protected by CRON_SECRET header */
export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const headerSecret = request.headers.get("x-cron-secret");
      if (headerSecret !== cronSecret) {
        return NextResponse.json(
          { error: "Unauthorized", code: "UNAUTHORIZED" },
          { status: 401 }
        );
      }
    }

    const expiredCount = await expireStaleReservations();

    return NextResponse.json({
      expired: expiredCount,
      message:
        expiredCount > 0
          ? `${expiredCount} reservation${expiredCount === 1 ? "" : "s"} expired`
          : "No expired reservations found",
    });
  } catch (error) {
    console.error("GET /api/cron/expire-reservations error:", error);
    return NextResponse.json(
      { error: "Failed to expire reservations", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
