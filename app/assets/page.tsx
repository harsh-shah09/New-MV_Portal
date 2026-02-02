import { getAssets } from './actions';
import { AssetManager } from './components/AssetManager';

export const dynamic = 'force-dynamic';

export default async function AssetsPage() {
  let assets: any[] = [];
  try {
     assets = await getAssets();
  } catch (e) {
     console.error("Failed to load assets", e);
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Asset Management</h1>
        <p className="text-gray-500 mt-2">Manage company assets, assignments, and returns.</p>
      </div>
      <AssetManager initialAssets={assets} />
    </div>
  )
}
