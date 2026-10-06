import { ModulePlaceholder } from "@/components/layout/module-placeholder";
import { modules } from "@/lib/navigation";

export const metadata = { title: `${modules.parametros.title} | Control Total` };

export default function Page() {
  return <ModulePlaceholder module="parametros" />;
}
