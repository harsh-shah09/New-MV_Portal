import { getAssets } from './actions';
import { AssetManager } from './components/AssetManager';
import { PageContainer } from "@/components/page-container"

export const dynamic = 'force-dynamic';

export default async function AssetsPage() {
  let assets: any[] = [];
  try {
    assets = await getAssets();
  } catch (e) {
    console.error("Failed to load assets", e);
  }

  return (
    <PageContainer>
      <div className='bg-white p-3 rounded-xl'>
        <AssetManager initialAssets={assets} />
      </div>
    </PageContainer>
  )
}
