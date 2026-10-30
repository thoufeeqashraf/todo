import { HealthScreen } from '@/components/modules/health-screen';
import { gateModule, loadHealth, readModule } from '@/components/modules/load';
import { ModuleBlocked } from '@/components/modules/module-blocked';

export const instant = false;

export default async function HealthPage() {
  const gate = await gateModule('staff_health');
  if (!gate.ok) return <ModuleBlocked title="Staff health" body={gate.body} />;
  const loaded = await readModule(() => loadHealth(gate.actor));
  if (!loaded.data) return <ModuleBlocked title="Staff health" body={loaded.error} />;
  return <HealthScreen data={loaded.data} />;
}
