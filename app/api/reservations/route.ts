import { NextRequest, NextResponse } from "next/server";
import { createReservation } from "@/lib/reservations";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CreateReservationSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  customerId: z.string().email("A valid email is required"),
  customerName: z.string().min(1, "Customer name is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
});

/* POST /api/reservations — create a new stock reservation with validation */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = CreateReservationSchema.safeParse(body);

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

    const reservation = await createReservation(result.data);

    return NextResponse.json(reservation, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.startsWith("INSUFFICIENT_STOCK:")) {
      return NextResponse.json(
        {
          error: message.replace("INSUFFICIENT_STOCK:", ""),
          code: "INSUFFICIENT_STOCK",
        },
        { status: 409 }
      );
    }

    console.error("POST /api/reservations error:", error);
    return NextResponse.json(
      { error: "Failed to create reservation", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
