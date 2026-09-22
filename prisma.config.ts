import "dotenv/config";
import { defineConfig } from "prisma/config";

// Migrations use the DIRECT connection (port 5432). Runtime uses the pooled DATABASE_URL via the pg adapter.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  datasource: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "postgresql://placeholder:placeholder@localhost:5432/placeholder" },
});
