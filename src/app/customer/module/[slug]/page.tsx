import { loadModule } from '../../actions';
import { ModuleScreen } from './screen';

export const instant = false;

export default async function CustomerModulePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const initial = await loadModule(slug);
  return <ModuleScreen slug={slug} initial={initial} />;
}
