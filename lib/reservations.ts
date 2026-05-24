/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma, ReservationStatus } from "./prisma";
import { invalidateProductCache } from "./redis";

interface CreateReservationInput {
  productId: string;
  customerId: string;
  customerName: string;
  quantity: number;
}

/* Create a new reservation, atomically checking stock and holding units for 10 minutes */
export async function createReservation(input: CreateReservationInput) {
  const { productId, customerId, customerName, quantity } = input;

  const reservation = await prisma.$transaction(async (tx: any) => {
    const product = await tx.product.findUniqueOrThrow({
      where: { id: productId },
    });

    const available = product.totalStock - product.reservedStock;

    if (available < quantity) {
      throw new Error(
        `INSUFFICIENT_STOCK:Not enough stock available. Only ${available} units left.`
      );
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const res = await tx.reservation.create({
      data: {
        productId,
        customerId,
        customerName,
        quantity,
        expiresAt,
      },
      include: { product: true },
    });

    await tx.product.update({
      where: { id: productId },
      data: { reservedStock: { increment: quantity } },
    });

    return res;
  });

  // Invalidate product cache in Redis after database transaction succeeds
  await invalidateProductCache(productId);

  return reservation;
}

/* Confirm a pending reservation — permanently deducts stock and marks as confirmed */
export async function confirmReservation(reservationId: string) {
  const updated = await prisma.$transaction(async (tx: any) => {
    const reservation = await tx.reservation.findUniqueOrThrow({
      where: { id: reservationId },
      include: { product: true },
    });

    if (reservation.status !== ReservationStatus.PENDING) {
      throw new Error(
        `INVALID_STATUS:Reservation is already ${reservation.status.toLowerCase()}.`
      );
    }

    if (reservation.expiresAt < new Date()) {
      await tx.reservation.update({
        where: { id: reservationId },
        data: { status: ReservationStatus.EXPIRED },
      });
      await tx.product.update({
        where: { id: reservation.productId },
        data: { reservedStock: { decrement: reservation.quantity } },
      });
      throw new Error("RESERVATION_EXPIRED:This reservation has expired.");
    }

    const res = await tx.reservation.update({
      where: { id: reservationId },
      data: {
        status: ReservationStatus.CONFIRMED,
        confirmedAt: new Date(),
      },
      include: { product: true },
    });

    await tx.product.update({
      where: { id: reservation.productId },
      data: {
        totalStock: { decrement: reservation.quantity },
        reservedStock: { decrement: reservation.quantity },
      },
    });

    return res;
  });

  // Invalidate product cache in Redis after database transaction succeeds
  await invalidateProductCache(updated.productId);

  return updated;
}

/* Release a pending reservation — returns held stock back to available pool */
export async function releaseReservation(reservationId: string) {
  const updated = await prisma.$transaction(async (tx: any) => {
    const reservation = await tx.reservation.findUniqueOrThrow({
      where: { id: reservationId },
      include: { product: true },
    });

    if (reservation.status !== ReservationStatus.PENDING) {
      throw new Error(
        `INVALID_STATUS:Reservation is already ${reservation.status.toLowerCase()}.`
      );
    }

    const res = await tx.reservation.update({
      where: { id: reservationId },
      data: {
        status: ReservationStatus.RELEASED,
        releasedAt: new Date(),
      },
      include: { product: true },
    });

    await tx.product.update({
      where: { id: reservation.productId },
      data: { reservedStock: { decrement: reservation.quantity } },
    });

    return res;
  });

  // Invalidate product cache in Redis after database transaction succeeds
  await invalidateProductCache(updated.productId);

  return updated;
}

/* Expire all overdue PENDING reservations and release their held stock */
export async function expireStaleReservations(): Promise<number> {
  const staleReservations = await prisma.reservation.findMany({
    where: {
      status: ReservationStatus.PENDING,
      expiresAt: { lt: new Date() },
    },
  });

  let expiredCount = 0;
  const productIdsToInvalidate: string[] = [];

  for (const reservation of staleReservations) {
    await prisma.$transaction(async (tx: any) => {
      await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: ReservationStatus.EXPIRED },
      });

      await tx.product.update({
        where: { id: reservation.productId },
        data: { reservedStock: { decrement: reservation.quantity } },
      });
    });
    if (!productIdsToInvalidate.includes(reservation.productId)) {
      productIdsToInvalidate.push(reservation.productId);
    }
    expiredCount++;
  }

  // Bulk invalidate Redis caches for all affected products
  if (expiredCount > 0) {
    for (const productId of productIdsToInvalidate) {
      await invalidateProductCache(productId);
    }
  }

  return expiredCount;
}

/* Calculate available stock for a product, excluding expired-but-not-cleaned reservations */
export async function getAvailableStock(productId: string): Promise<number> {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
  });

  const expiredButNotCleaned = await prisma.reservation.aggregate({
    where: {
      productId,
      status: ReservationStatus.PENDING,
      expiresAt: { lt: new Date() },
    },
    _sum: { quantity: true },
  });

  const expiredQuantity = expiredButNotCleaned._sum.quantity ?? 0;
  const effectiveReserved = product.reservedStock - expiredQuantity;

  return product.totalStock - effectiveReserved;
}
