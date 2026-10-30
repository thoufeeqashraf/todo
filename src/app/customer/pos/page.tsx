import { PosScreen } from '@/components/modules/pos-screen';
import { gateModule, loadOrders, readModule } from '@/components/modules/load';
import { ModuleBlocked } from '@/components/modules/module-blocked';

export const instant = false;

export default async function PosPage() {
  const gate = await gateModule('pos');
  if (!gate.ok) return <ModuleBlocked title="POS" body={gate.body} />;
  const loaded = await readModule(() => loadOrders(gate.actor));
  if (!loaded.data) return <ModuleBlocked title="POS" body={loaded.error} />;
  return <PosScreen data={loaded.data} />;
}
