import { ModulePlaceholder } from "@/components/layout/module-placeholder";
import { modules } from "@/lib/navigation";

export const metadata = { title: `${modules.camaras.title} | Control Total` };

export default function Page() {
  return <ModulePlaceholder module="camaras" />;
}
