import { CctvScreen } from '@/components/modules/cctv-screen';
import { gateModule, loadCameras, readModule } from '@/components/modules/load';
import { ModuleBlocked } from '@/components/modules/module-blocked';

export const instant = false;

export default async function CctvPage() {
  const gate = await gateModule('cctv');
  if (!gate.ok) return <ModuleBlocked title="CCTV" body={gate.body} />;
  const loaded = await readModule(() => loadCameras(gate.actor));
  if (!loaded.data) return <ModuleBlocked title="CCTV" body={loaded.error} />;
  return <CctvScreen data={loaded.data} />;
}
