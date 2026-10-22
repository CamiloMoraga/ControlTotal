import { ModulePlaceholder } from "@/components/layout/module-placeholder";
import { requireAuthorizedUser } from "@/lib/auth";
import { modules } from "@/lib/navigation";

export const metadata = { title: `${modules.diario.title} | Control Total` };

export default async function Page() {
  await requireAuthorizedUser();
  return <ModulePlaceholder module="diario" />;
}
