"use server";

import { revalidatePath } from "next/cache";
import { requireAuthorizedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validatePiscicultura, type FieldErrors } from "@/lib/pisciculturas/validation";
import { createPiscicultura, updatePiscicultura, setPisciculturaActiva } from "@/lib/pisciculturas/writes";

export type FormState = { ok: boolean | null; message: string; errors: FieldErrors };

function validId(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function savePiscicultura(id: string | null, _state: FormState, form: FormData): Promise<FormState> {
  const user = await requireAuthorizedUser();
  if (id !== null && !validId(id)) return { ok: false, message: "Identificador inválido.", errors: {} };
  const parsed = validatePiscicultura(form);
  if (!parsed.data) return { ok: false, message: "Revisa los campos indicados.", errors: parsed.errors };
  const result = id
    ? await updatePiscicultura(prisma, user.email, id, parsed.data)
    : await createPiscicultura(prisma, user.email, parsed.data);
  if (result.ok && result.changed) revalidatePath("/configuracion");
  return { ok: result.ok, message: result.message,
    errors: !result.ok && result.field ? { [result.field]: result.message } : {} };
}

export async function changePisciculturaState(id: string, activa: boolean) {
  const user = await requireAuthorizedUser();
  if (!validId(id) || typeof activa !== "boolean") return { ok: false, message: "Solicitud inválida." };
  const result = await setPisciculturaActiva(prisma, user.email, id, activa);
  if (result.ok && result.changed) revalidatePath("/configuracion");
  return { ok: result.ok, message: result.message };
}
