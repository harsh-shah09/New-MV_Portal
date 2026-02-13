import { getAssets } from './actions';
import { AssetManager } from './components/AssetManager';

import { PageContainer } from "@/components/page-container"
import { PageHeader } from "@/components/page-header"

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
      <PageHeader 
        title="Asset Management" 
        subtitle="Manage company assets, assignments, and returns."
      />
      <AssetManager initialAssets={assets} />
    </PageContainer>
  )
}
