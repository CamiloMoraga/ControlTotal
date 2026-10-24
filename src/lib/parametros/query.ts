import type { prisma } from "@/lib/prisma";

export function queryParametros(db: Pick<typeof prisma, "parametro">) {
  return db.parametro.findMany({
    select: { id: true, codigo: true, nombre: true, unidad: true, orden: true, activo: true },
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
  });
}
