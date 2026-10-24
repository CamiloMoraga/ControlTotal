import "server-only";
import { requireAuthorizedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { queryAuditDetail, queryAuditPage } from "./query";
import type { AuditSearch } from "./search";

export async function listAuditRecords(search: AuditSearch) {
  await requireAuthorizedUser();
  return queryAuditPage(prisma, search);
}

export async function getAuditDetail(id: string) {
  await requireAuthorizedUser();
  return queryAuditDetail(prisma, id);
}
