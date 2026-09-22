import { conflict } from "@/lib/api/errors";
import { getDb } from "@/lib/db";
import type { FuelTypeRepo, FuelTypeRow } from "@/types/stations";

const select = { id: true, slug: true, nameEn: true, nameAm: true, icon: true, isActive: true, displayOrder: true } as const;

const isUniqueViolation = (e: unknown) => typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";

export const fuelTypeRepository: FuelTypeRepo = {
  async list({ includeInactive }) {
    return getDb().fuelType.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ displayOrder: "asc" }, { nameEn: "asc" }],
      select,
    });
  },

  async findById(id) {
    return getDb().fuelType.findUnique({ where: { id }, select });
  },

  async create(data: Omit<FuelTypeRow, "id">) {
    try {
      return await getDb().fuelType.create({ data, select });
    } catch (e) {
      if (isUniqueViolation(e)) throw conflict(`A fuel type with slug "${data.slug}" already exists`);
      throw e;
    }
  },

  async update(id, data) {
    try {
      return await getDb().fuelType.update({ where: { id }, data, select });
    } catch (e) {
      if (isUniqueViolation(e)) throw conflict("That slug is already in use");
      if (typeof e === "object" && e !== null && (e as { code?: string }).code === "P2025") return null;
      throw e;
    }
  },
};
