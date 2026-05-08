import { getProducts } from '../actions';
import { Package } from 'lucide-react';
import { ProductList } from './product-list'; // Client component for search/table
import { BackLink } from '../components/backlink';  

export default async function ProductsPage() {
  const products = await getProducts(); // Returns SalesforceProduct[]

  return (
    <div className="p-6 md:p-8 w-full mx-auto space-y-6">
        <div className="flex items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <BackLink />
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <Package className="w-6 h-6 text-blue-600" />
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Product Catalog</h1>
                </div>
                <p className="text-gray-500 mt-1 text-sm">Manage standard asset models and specifications.</p>
            </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
             <ProductList products={products} />
        </div>
    </div>
  )
}
