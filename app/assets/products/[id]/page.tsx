import { getProductById, getAssets } from '../../actions';
import { ProductDetailClient } from './ProductDetailClient';

export const dynamic = 'force-dynamic';

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  if (!id) return <div className="p-10 text-center">Product not found</div>;
  
  const [product, allAssets] = await Promise.all([
    getProductById(id),
    getAssets()
  ]);

  if (!product) {
       return <div className="p-10 text-center">Product not found</div>;
  }

  // Filter assets for this product
  const productAssets = allAssets.filter(a => a.AMS_Product__c === id || a.AMS_Product__r?.Id === id);

  return <ProductDetailClient product={product} productAssets={productAssets} />;
}
