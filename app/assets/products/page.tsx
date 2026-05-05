import { getProducts } from '../actions';
import { Button } from 'antd';
import Link from 'next/link';
import { ArrowLeft, Package } from 'lucide-react';
import { ProductList } from './product-list'; // Client component for search/table

export default async function ProductsPage() {
  const products = await getProducts(); // Returns SalesforceProduct[]

  return (
    <div className="p-6 md:p-8 w-full mx-auto space-y-6">
        <div className="flex items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <Link href="/assets">
                <Button 
                    icon={<ArrowLeft className="w-4 h-4" />} 
                    className="flex items-center justify-center h-10 w-10 rounded-xl border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 shadow-sm transition-all"
                />
            </Link>
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
