import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Scripts and tests own this client and must call $disconnect() in finally.
export function createPrismaClient() {
  if (typeof window !== "undefined") {
    throw new Error("Prisma sólo puede ejecutarse en el servidor Node.js");
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL es obligatoria para conectar Prisma a PostgreSQL local");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}
