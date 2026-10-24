import "server-only";
import { requireAuthorizedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function listPisciculturas() {
  await requireAuthorizedUser();
  return prisma.piscicultura.findMany({
    select: { id: true, nombre: true, codigo: true, orden: true, activa: true, notaCamaras: true },
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
  });
}

export type PisciculturaRow = Awaited<ReturnType<typeof listPisciculturas>>[number];
