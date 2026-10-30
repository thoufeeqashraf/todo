import { IncidentsScreen } from '@/components/modules/incidents-screen';
import { gateModule, loadIncidents, readModule } from '@/components/modules/load';
import { ModuleBlocked } from '@/components/modules/module-blocked';

export const instant = false;

export default async function IncidentsPage() {
  const gate = await gateModule('incidents');
  if (!gate.ok) return <ModuleBlocked title="Incidents" body={gate.body} />;
  const loaded = await readModule(() => loadIncidents(gate.actor));
  if (!loaded.data) return <ModuleBlocked title="Incidents" body={loaded.error} />;
  return <IncidentsScreen data={loaded.data} />;
}
