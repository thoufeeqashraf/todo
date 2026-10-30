import { FindStaffScreen } from '@/components/modules/find-staff-screen';
import { gateModule, loadFindStaff, readModule } from '@/components/modules/load';
import { ModuleBlocked } from '@/components/modules/module-blocked';

export const instant = false;

export default async function FindMyStaffPage() {
  const gate = await gateModule('find_my_staff');
  if (!gate.ok) return <ModuleBlocked title="Find My Staff" body={gate.body} />;
  const loaded = await readModule(() => loadFindStaff(gate.actor));
  if (!loaded.data) return <ModuleBlocked title="Find My Staff" body={loaded.error} />;
  return <FindStaffScreen data={loaded.data} />;
}
