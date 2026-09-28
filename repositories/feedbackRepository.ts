import { getDb } from "@/lib/db";
import type { FeedbackStatus } from "@/generated/prisma/client";

export interface CreateFeedbackInput {
  userId?: string | null;
  name?: string | null;
  contact?: string | null;
  message: string;
  stationId?: string | null;
}

export interface FeedbackFilter {
  status?: FeedbackStatus | "all";
  stationId?: string;
  limit?: number;
  offset?: number;
}

export const feedbackRepository = {
  async create(input: CreateFeedbackInput) {
    const db = getDb();
    return db.feedback.create({
      data: {
        userId: input.userId ?? null,
        name: input.name ? input.name.trim() : null,
        contact: input.contact ? input.contact.trim() : null,
        message: input.message.trim(),
        stationId: input.stationId ?? null,
        status: "NEW",
      },
      include: {
        station: {
          select: { id: true, name: true, branchName: true, city: true, area: true },
        },
      },
    });
  },

  async list(filter: FeedbackFilter = {}) {
    const db = getDb();
    const where: any = {};

    if (filter.status && filter.status !== "all") {
      where.status = filter.status;
    }
    if (filter.stationId) {
      where.stationId = filter.stationId;
    }

    const [items, total, newCount] = await Promise.all([
      db.feedback.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: filter.limit ?? 50,
        skip: filter.offset ?? 0,
        include: {
          station: {
            select: { id: true, name: true, branchName: true, city: true, area: true },
          },
          user: {
            select: { id: true, firstName: true, lastName: true, username: true, role: true },
          },
        },
      }),
      db.feedback.count({ where }),
      db.feedback.count({ where: { status: "NEW" } }),
    ]);

    return { items, total, newCount };
  },

  async getById(id: string) {
    const db = getDb();
    return db.feedback.findUnique({
      where: { id },
      include: {
        station: true,
        user: true,
      },
    });
  },

  async update(id: string, data: { status?: FeedbackStatus; adminNotes?: string | null }) {
    const db = getDb();
    return db.feedback.update({
      where: { id },
      data: {
        ...(data.status ? { status: data.status } : {}),
        ...(data.adminNotes !== undefined ? { adminNotes: data.adminNotes } : {}),
      },
      include: {
        station: {
          select: { id: true, name: true, branchName: true, city: true, area: true },
        },
      },
    });
  },

  async delete(id: string) {
    const db = getDb();
    return db.feedback.delete({ where: { id } });
  },

  async getStats() {
    const db = getDb();
    const [total, newCount, resolvedCount] = await Promise.all([
      db.feedback.count(),
      db.feedback.count({ where: { status: "NEW" } }),
      db.feedback.count({ where: { status: "RESOLVED" } }),
    ]);
    return { total, newCount, resolvedCount };
  },
};
