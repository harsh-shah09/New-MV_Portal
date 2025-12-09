import { Table, Button, Tag, Space, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DollarOutlined, DeleteOutlined } from '@ant-design/icons';
import type { Payroll } from "@/types"

interface PayrollTableProps {
  payrolls: Payroll[]
  onProcess: (id: string) => void
  onDelete: (id: string) => void
}

export function PayrollTable({ payrolls, onProcess, onDelete }: PayrollTableProps) {
  const columns: ColumnsType<Payroll> = [
    {
      title: 'Employee',
      dataIndex: 'employeeName',
      key: 'employeeName',
      render: (text) => <span className="font-medium">{text}</span>,
    },
    {
      title: 'Month',
      key: 'month',
      render: (_, record) => `${record.month} ${record.year}`,
    },
    {
      title: 'Basic Salary',
      dataIndex: 'basicSalary',
      key: 'basicSalary',
      render: (val) => `$${val.toLocaleString()}`,
    },
    {
        title: 'Allowances',
        dataIndex: 'allowances',
        key: 'allowances',
        render: (val) => <span className="text-green-600">+${val.toLocaleString()}</span>,
    },
    {
        title: 'Deductions',
        dataIndex: 'deductions',
        key: 'deductions',
        render: (val) => <span className="text-red-600">-${val.toLocaleString()}</span>,
    },
    {
        title: 'Net Salary',
        dataIndex: 'netSalary',
        key: 'netSalary',
        render: (val) => <span className="font-bold text-blue-600">${val.toLocaleString()}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = 'default';
        if (status === 'paid') color = 'success';
        if (status === 'processed') color = 'warning';
        if (status === 'draft') color = 'default';
        return <Tag color={color} className="capitalize">{status}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          {record.status === 'draft' && (
             <Tooltip title="Process Payroll">
                <Button 
                    type="text" 
                    icon={<DollarOutlined className="text-blue-600"/>} 
                    onClick={() => onProcess(record.id)}
                >
                    Process
                </Button>
             </Tooltip>
          )}
          <Tooltip title="Delete Record">
             <Button 
                type="text" 
                danger 
                icon={<DeleteOutlined />} 
                onClick={() => onDelete(record.id)} 
             />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <Table 
        columns={columns} 
        dataSource={payrolls} 
        rowKey="id"
        pagination={{ pageSize: 10 }}
        scroll={{ x: 1000 }}
      />
    </div>
  )
}
