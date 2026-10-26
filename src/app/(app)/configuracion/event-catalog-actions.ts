"use server";

import { revalidatePath } from "next/cache";
import { requireAuthorizedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createCatalog, updateCatalog, setCatalogState } from "@/lib/event-catalogs/writes";
import { validKind, validateCatalog, UUID_PATTERN, type FieldErrors } from "@/lib/event-catalogs/validation";

export type CatalogFormState = { ok: boolean | null; message: string; errors: FieldErrors };

export async function saveEventCatalog(kind: string, id: string | null, _state: CatalogFormState, form: FormData): Promise<CatalogFormState> {
  const user = await requireAuthorizedUser();
  if (!validKind(kind) || (id !== null && !UUID_PATTERN.test(id))) return { ok: false, message: "Solicitud inválida.", errors: {} };
  const parsed = validateCatalog(kind, form);
  if (!parsed.data) return { ok: false, message: "Revisa los campos indicados.", errors: parsed.errors };
  const result = id ? await updateCatalog(prisma, user.email, kind, id, parsed.data)
    : await createCatalog(prisma, user.email, kind, parsed.data);
  if (result.ok && result.changed) { revalidatePath("/configuracion"); revalidatePath("/auditoria"); }
  return { ok: result.ok, message: result.message, errors: !result.ok && result.field ? { [result.field]: result.message } : {} };
}

export async function changeEventCatalogState(kind: string, id: string, active: boolean) {
  const user = await requireAuthorizedUser();
  if (!validKind(kind) || !UUID_PATTERN.test(id) || typeof active !== "boolean") return { ok: false, message: "Solicitud inválida." };
  const result = await setCatalogState(prisma, user.email, kind, id, active);
  if (result.ok && result.changed) { revalidatePath("/configuracion"); revalidatePath("/auditoria"); }
  return { ok: result.ok, message: result.message };
}
