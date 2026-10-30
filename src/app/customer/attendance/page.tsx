import { AttendanceScreen } from '@/components/modules/attendance-screen';
import { gateModule, loadAttendance, readModule } from '@/components/modules/load';
import { ModuleBlocked } from '@/components/modules/module-blocked';

export const instant = false;

export default async function AttendancePage() {
  const gate = await gateModule('geofence_attendance');
  if (!gate.ok) return <ModuleBlocked title="Attendance" body={gate.body} />;
  const loaded = await readModule(() => loadAttendance(gate.actor));
  if (!loaded.data) return <ModuleBlocked title="Attendance" body={loaded.error} />;
  return <AttendanceScreen data={loaded.data} />;
}
