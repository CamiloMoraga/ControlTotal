import "server-only";
import { requireAuthorizedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { queryCatalog, queryMotivos } from "./query";
import type { CatalogKind } from "./validation";

export async function listCatalog(kind: CatalogKind) {
  await requireAuthorizedUser();
  return queryCatalog(prisma, kind);
}

export async function listMotivosForCatalog() {
  await requireAuthorizedUser();
  return queryMotivos(prisma);
}
