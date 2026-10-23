import "server-only";
import { createPrismaClient } from "@/lib/prisma-client";

const globalForPrisma = globalThis as unknown as {
  controlTotalPrisma?: ReturnType<typeof createPrismaClient>;
};

// One pool per server process; Next hot reload reuses it in development.
export const prisma = globalForPrisma.controlTotalPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.controlTotalPrisma = prisma;
}
