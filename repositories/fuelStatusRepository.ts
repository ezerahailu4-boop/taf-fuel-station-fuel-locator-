import { notFound } from "@/lib/api/errors";
import { getDb } from "@/lib/db";
import { planUpdate } from "@/lib/fuel/plan";
import type { Prisma } from "@/generated/prisma/client";
import type { FuelStatusRepo } from "@/types/stations";

const json = (v: unknown) => v as Prisma.InputJsonValue;

export const fuelStatusRepository: FuelStatusRepo = {
  async applyUpdate(input) {
    return getDb().$transaction(async (tx) => {
      // Serialize concurrent updates to the same station so `old_status` in history is always correct.
      await tx.$queryRaw`SELECT id FROM stations WHERE id = ${input.stationId}::uuid FOR UPDATE`;

      const station = await tx.station.findUnique({
        where: { id: input.stationId },
        select: { id: true, isActive: true, status: true },
      });
      if (!station) throw notFound("Station not found");

      const fuelIds = input.fuels.map((f) => f.fuelTypeId);
      const [fuelTypes, currentRows] = await Promise.all([
        tx.fuelType.findMany({ where: { id: { in: fuelIds } }, select: { id: true, slug: true, isActive: true } }),
        tx.stationFuelStatus.findMany({ where: { stationId: input.stationId, fuelTypeId: { in: fuelIds } } }),
      ]);

      const plan = planUpdate({
        station,
        fuelTypes: new Map(fuelTypes.map((f) => [f.id, { slug: f.slug, isActive: f.isActive }])),
        current: new Map(currentRows.map((r) => [r.fuelTypeId, { status: r.status, note: r.note }])),
        desired: { stationStatus: input.stationStatus, fuels: input.fuels },
      });

      for (const c of plan.fuelChanges) {
        await tx.stationFuelStatus.upsert({
          where: { stationId_fuelTypeId: { stationId: input.stationId, fuelTypeId: c.fuelTypeId } },
          create: {
            stationId: input.stationId,
            fuelTypeId: c.fuelTypeId,
            status: c.newStatus,
            note: c.newNote,
            lastUpdated: input.at,
            lastConfirmedAt: input.at,
            updatedById: input.actorId,
          },
          update: {
            status: c.newStatus,
            note: c.newNote,
            lastUpdated: input.at,
            lastConfirmedAt: input.at,
            updatedById: input.actorId,
          },
        });

        if (c.statusChanged) {
          await tx.stationFuelStatusHistory.create({
            data: {
              stationId: input.stationId,
              fuelTypeId: c.fuelTypeId,
              oldStatus: c.oldStatus,
              newStatus: c.newStatus,
              changedById: input.actorId,
              changedAt: input.at,
            },
          });
        }

        await tx.activityLog.create({
          data: {
            actorUserId: input.actorId,
            stationId: input.stationId,
            action: c.statusChanged ? "FUEL_STATUS_CHANGED" : "FUEL_NOTE_CHANGED",
            entity: "station_fuel_status",
            oldValue: json({ fuel: c.slug, fuelTypeId: c.fuelTypeId, status: c.oldStatus, note: c.oldNote }),
            newValue: json({ fuel: c.slug, fuelTypeId: c.fuelTypeId, status: c.newStatus, note: c.newNote }),
            ip: input.ip,
            createdAt: input.at,
          },
        });
      }

      if (plan.stationStatusChange) {
        await tx.station.update({ where: { id: input.stationId }, data: { status: plan.stationStatusChange.new } });
        await tx.activityLog.create({
          data: {
            actorUserId: input.actorId,
            stationId: input.stationId,
            action: "STATION_STATUS_CHANGED",
            entity: "station",
            oldValue: json({ status: plan.stationStatusChange.old }),
            newValue: json({ status: plan.stationStatusChange.new }),
            ip: input.ip,
            createdAt: input.at,
          },
        });
      }

      return plan;
    });
  },

  async confirm({ stationId, actorId, at, ip }) {
    return getDb().$transaction(async (tx) => {
      const station = await tx.station.findUnique({ where: { id: stationId }, select: { id: true } });
      if (!station) throw notFound("Station not found");

      const res = await tx.stationFuelStatus.updateMany({
        where: { stationId, status: { not: "UNKNOWN" }, fuelType: { isActive: true } },
        data: { lastConfirmedAt: at },
      });
      await tx.activityLog.create({
        data: {
          actorUserId: actorId,
          stationId,
          action: "AVAILABILITY_CONFIRMED",
          entity: "station_fuel_status",
          newValue: json({ confirmedFuels: res.count }),
          ip,
          createdAt: at,
        },
      });
      return res.count;
    });
  },
};
