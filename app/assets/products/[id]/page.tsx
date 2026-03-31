import { getProductById, getAssets } from '../../actions';
import { Card, Descriptions, Tag, Button, Tabs, Table } from 'antd';
import { DatabaseOutlined, BarcodeOutlined, UserOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { BackButton } from '@/components/back-button';
import Link from 'next/link';

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
  // Note: Salesforce lookup might return Id or Object. getAssets returns SalesforceAsset[] where AMS_Product__c is the ID.
  const productAssets = allAssets.filter(a => a.AMS_Product__c === id || a.AMS_Product__r?.Id === id);

  const items = [
    {
      key: 'details',
      label: 'Specifications',
      children: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12 p-4">
            <div>
                <label className="text-xs uppercase text-gray-400 font-bold tracking-wider mb-1 block">Category</label>
                <div className="text-lg font-medium text-gray-800 flex items-center gap-2">
                    <DatabaseOutlined className="text-gray-400"/> {product.AMS_Category__c}
                </div>
            </div>
            <div>
                <label className="text-xs uppercase text-gray-400 font-bold tracking-wider mb-1 block">Model Number</label>
                <div className="text-lg font-medium text-gray-800 font-mono tracking-tight bg-gray-50 inline-block px-2 py-1 rounded border border-gray-100">
                    {product.AMS_Model_Number__c}
                </div>
            </div>
            <div className="col-span-full">
                <label className="text-xs uppercase text-gray-400 font-bold tracking-wider mb-2 block">Description</label>
                <div className="text-base text-gray-600 whitespace-pre-wrap leading-relaxed max-w-prose">
                    {product.AMS_Description__c || 'No description provided.'}
                </div>
            </div>
             <div className="col-span-full">
                <label className="text-xs uppercase text-gray-400 font-bold tracking-wider mb-2 block">Technical Specifications</label>
                <div className="text-sm text-gray-600 font-mono bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-wrap">
                    {product.AMS_Specifications__c || 'No technical specifications available.'}
                </div>
            </div>
        </div>
      ),
    },
    {
      key: 'assets',
      label: `Inventory items (${productAssets.length})`,
      children: (
        <div className="pt-2">
            {productAssets.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-gray-100">
                    <table className="w-full text-sm text-left text-gray-600">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold">
                            <tr>
                                <th className="px-6 py-3">Asset ID</th>
                                <th className="px-6 py-3">Serial No</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Assignee</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {productAssets.map(asset => (
                                <tr key={asset.Id} className="bg-white hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">{asset.Name}</td>
                                    <td className="px-6 py-4 font-mono">{asset.AMS_Asset_Serial_Number__c}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            asset.AMS_Status__c === 'Assigned' ? 'bg-blue-100 text-blue-800' :
                                            asset.AMS_Status__c === 'Un-Assigned' ? 'bg-green-100 text-green-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {asset.AMS_Status__c}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {asset.AMS_Assigned_To__r ? (
                                             <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                                    {asset.AMS_Assigned_To__r.Employee_Name__c.charAt(0)}
                                                </div>
                                                {asset.AMS_Assigned_To__r.Employee_Name__c}
                                             </div>
                                        ) : (
                                            <span className="text-gray-400 italic">Unassigned</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    No individual assets found for this product.
                </div>
            )}
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 md:p-8">
        <div className="w-full mx-auto space-y-6">
            <BackButton />

            {/* Header Card */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-transparent rounded-bl-full opacity-60 pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                         <div className="flex items-center gap-3 mb-2">
                            <Tag color="cyan" className="m-0 border-0 bg-cyan-50 text-cyan-700 font-medium px-3 py-1 rounded-full">{product.AMS_Category__c}</Tag>
                            {product.IsActive ? 
                                <Tag icon={<CheckCircleOutlined />} color="success" className="m-0 border-0 px-3 py-1 rounded-full">Active Catalog Item</Tag> : 
                                <Tag icon={<CloseCircleOutlined />} color="error" className="m-0 border-0 px-3 py-1 rounded-full">Archived</Tag>
                            }
                         </div>
                         <h1 className="text-4xl font-bold text-gray-900 tracking-tight">{product.Name}</h1>
                         <div className="mt-2 text-gray-500 flex items-center gap-2">
                            <BarcodeOutlined /> Model: <span className="font-mono text-gray-700">{product.AMS_Model_Number__c}</span>
                         </div>
                    </div>
                    
                    {/* Placeholder for Product Image or Icon */}
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg flex items-center justify-center text-white text-3xl font-bold">
                        {product.Name.charAt(0)}
                    </div>
                </div>
            </div>

            {/* Content Tabs */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                 <Tabs 
                    defaultActiveKey="details" 
                    items={items} 
                    className="p-2"
                    tabBarStyle={{ padding: '0 16px' }}
                />
            </div>
        </div>
    </div>
  )
}
