import { WalletScreen } from '@/components/modules/wallet-screen';
import { gateModule, loadWallet, readModule } from '@/components/modules/load';
import { ModuleBlocked } from '@/components/modules/module-blocked';

export const instant = false;

export default async function WalletPage() {
  const gate = await gateModule('wallet');
  if (!gate.ok) return <ModuleBlocked title="Wallet" body={gate.body} />;
  const loaded = await readModule(() => loadWallet(gate.actor));
  if (!loaded.data) return <ModuleBlocked title="Wallet" body={loaded.error} />;
  return <WalletScreen data={loaded.data} />;
}
