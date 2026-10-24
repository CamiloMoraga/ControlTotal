"use server";

import { revalidatePath } from "next/cache";
import { requireAuthorizedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateParametro, type FieldErrors } from "@/lib/parametros/validation";
import { createParametro, updateParametro, setParametroActivo } from "@/lib/parametros/writes";

export type ParametroFormState = { ok: boolean | null; message: string; errors: FieldErrors };

function validId(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function saveParametro(id: string | null, _state: ParametroFormState, form: FormData): Promise<ParametroFormState> {
  const user = await requireAuthorizedUser();
  if (id !== null && !validId(id)) return { ok: false, message: "Identificador inválido.", errors: {} };
  const parsed = validateParametro(form);
  if (!parsed.data) return { ok: false, message: "Revisa los campos indicados.", errors: parsed.errors };
  const result = id
    ? await updateParametro(prisma, user.email, id, parsed.data)
    : await createParametro(prisma, user.email, parsed.data);
  if (result.ok && result.changed) {
    revalidatePath("/configuracion");
    revalidatePath("/auditoria");
  }
  return { ok: result.ok, message: result.message,
    errors: !result.ok && result.field ? { [result.field]: result.message } : {} };
}

export async function changeParametroState(id: string, activo: boolean) {
  const user = await requireAuthorizedUser();
  if (!validId(id) || typeof activo !== "boolean") return { ok: false, message: "Solicitud inválida." };
  const result = await setParametroActivo(prisma, user.email, id, activo);
  if (result.ok && result.changed) {
    revalidatePath("/configuracion");
    revalidatePath("/auditoria");
  }
  return { ok: result.ok, message: result.message };
}
