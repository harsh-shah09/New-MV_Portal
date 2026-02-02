import { getProducts } from '../actions';
import { Card, Table, Tag, Input, Button } from 'antd';
import Link from 'next/link';
import { ProductList } from './product-list'; // Client component for search/table

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const products = await getProducts(); // Returns SalesforceProduct[]

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Product Catalog</h1>
                <p className="text-gray-500 mt-1">Manage standard asset models and specifications.</p>
            </div>
            <Link href="/assets">
                <Button>Back to Assets</Button>
            </Link>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
             <ProductList products={products} />
        </div>
    </div>
  )
}
