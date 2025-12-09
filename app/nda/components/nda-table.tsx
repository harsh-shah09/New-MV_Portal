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
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <Table 
        columns={columns} 
        dataSource={ndas} 
        rowKey="id"
        pagination={{ pageSize: 10 }}
        scroll={{ x: 800 }}
      />
    </div>
  )
}
