export type JsonChange = { field: string; kind: "added" | "removed" | "changed" | "unchanged"; before?: unknown; after?: unknown };

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function equalJson(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((value, index) => equalJson(value, b[index]));
  }
  if (isObject(a) && isObject(b)) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    return aKeys.length === bKeys.length && aKeys.every((key) => Object.hasOwn(b, key) && equalJson(a[key], b[key]));
  }
  return false;
}

export function compareSnapshots(before: unknown, after: unknown): JsonChange[] | null {
  if (!isObject(before) || !isObject(after)) return null;
  const fields = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort((a, b) => a.localeCompare(b, "es"));
  return fields.map((field) => {
    const hadBefore = Object.hasOwn(before, field);
    const hasAfter = Object.hasOwn(after, field);
    const kind = !hadBefore ? "added" : !hasAfter ? "removed" : equalJson(before[field], after[field]) ? "unchanged" : "changed";
    return { field, kind, before: hadBefore ? before[field] : undefined, after: hasAfter ? after[field] : undefined };
  });
}

export function jsonText(value: unknown) {
  return JSON.stringify(value, null, 2) ?? "null";
}
