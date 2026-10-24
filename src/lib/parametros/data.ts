import "server-only";
import { requireAuthorizedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { queryParametros } from "./query";

export async function listParametros() {
  await requireAuthorizedUser();
  return queryParametros(prisma);
}

export type ParametroRow = Awaited<ReturnType<typeof listParametros>>[number];
