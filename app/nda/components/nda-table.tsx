import { Table, Button, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DownloadOutlined } from '@ant-design/icons';
import type { NDA } from "@/types"
import { formatDate } from "@/lib/utils"

interface NDATableProps {
  ndas: NDA[]
  onDownload: (nda: NDA) => void
}

export function NDATable({ ndas, onDownload }: NDATableProps) {
  const columns: ColumnsType<NDA> = [
    {
      title: 'Employee',
      dataIndex: 'employeeName',
      key: 'employeeName',
      render: (text) => <span className="font-medium">{text}</span>,
    },
    {
      title: 'Signed Date',
      dataIndex: 'signDate',
      key: 'signDate',
      render: (date) => date ? formatDate(date) : '-',
    },
    {
      title: 'Expiry Date',
      dataIndex: 'expiryDate',
      key: 'expiryDate',
      render: (date) => formatDate(date),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = 'default';
        if (status === 'signed') color = 'success';
        if (status === 'pending') color = 'warning';
        if (status === 'expired') color = 'error';
        return <Tag color={color} className="capitalize">{status}</Tag>;
      },
      filters: [
        { text: 'Signed', value: 'signed' },
        { text: 'Pending', value: 'pending' },
        { text: 'Expired', value: 'expired' },
      ],
      onFilter: (value: any, record) => record.status === value,
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center',
      render: (_, record) => (
         <Tooltip title="Download NDA">
            <Button 
                type="text" 
                icon={<DownloadOutlined className="text-blue-600"/>} 
                onClick={() => onDownload(record)}
            >
                Download
            </Button>
         </Tooltip>
      ),
    },
  ];

  return (
    <>
      {/* Desktop View */}
      <div className="hidden md:block bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <Table 
          columns={columns} 
          dataSource={ndas} 
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </div>

      {/* Mobile View */}
      <div className="md:hidden space-y-4">
        {ndas.map((nda) => (
          <div key={nda.id} className="bg-card p-4 rounded-xl shadow-sm border border-border flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-card-foreground">{nda.employeeName}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Signed: {nda.signDate ? formatDate(nda.signDate) : '-'}
                </p>
              </div>
              <Tag 
                color={
                  nda.status === 'signed' ? 'success' : 
                  nda.status === 'pending' ? 'warning' : 'error'
                } 
                className="capitalize m-0"
              >
                {nda.status}
              </Tag>
            </div>
            
            <div className="space-y-2 border-t border-border pt-3">
               <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Expiry Date:</span>
                  <span className="text-card-foreground">{nda.expiryDate ? formatDate(nda.expiryDate) : '-'}</span>
               </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
                <Button 
                    type="default" 
                    icon={<DownloadOutlined className="text-blue-600"/>} 
                    onClick={() => onDownload(nda)}
                    className="w-full sm:w-auto"
                >
                    Download
                </Button>
            </div>
          </div>
        ))}
        {ndas.length === 0 && (
            <div className="text-center py-10 bg-card rounded-xl border border-dashed border-border">
                <p className="text-muted-foreground">No NDAs found</p>
            </div>
        )}
      </div>
    </>
  )
}
