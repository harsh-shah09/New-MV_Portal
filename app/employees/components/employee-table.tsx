"use client"

import { Table, Button, Tag, Space, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { Employee } from "@/types"
import { formatDate } from "@/lib/utils"
import { useState } from "react";

interface EmployeeTableProps {
  employees: Employee[]
  onEdit?: (employee: Employee) => void
  onDelete?: (id: string) => void
  onView?: (employee: Employee) => void
  loading?: boolean
  isHR?: boolean
}

export function EmployeeTable({ employees, onEdit, onDelete, onView, loading, isHR }: EmployeeTableProps) {
  const [viewingId, setViewingId] = useState<string | null>(null);
  const columns: ColumnsType<Employee> = [
    {
      title: 'Name',
      key: 'name',
      render: (_, record) => (
        <div className="flex items-center gap-3">
          {record.profilePhoto ? (
            <img src={record.profilePhoto} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20">
              {record.firstName.charAt(0)}{record.lastName.charAt(0)}
            </div>
          )}
          <span className="font-medium text-card-foreground">{record.firstName} {record.lastName}</span>
        </div>
      ),
      sorter: (a, b) => a.firstName.localeCompare(b.firstName),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      responsive: ['md'],
    },
    {
    title: 'Job Title',  
    key: 'positionTitle',
    render: (_, record) => (
      <div className="space-y-0.5">
        <div className="font-medium text-card-foreground">
          {record.position}
        </div>
        {record?.title && (
          <div className="text-sm text-muted-foreground">
            {record?.title}
          </div>
        )}
      </div>
    ),
    sorter: (a, b) => (a.position || '').localeCompare(b.position || ''),
    responsive: ['sm'],
  },
    {
      title: 'Join Date',
      dataIndex: 'joinDate',
      key: 'joinDate',
      render: (date) => (date ? formatDate(date) : ''),
      sorter: (a, b) => {
        const left = a.joinDate ? new Date(a.joinDate).getTime() : 0
        const right = b.joinDate ? new Date(b.joinDate).getTime() : 0
        return left - right
      },
      responsive: ['lg'],
    }
  ];

  if (isHR) {
    columns.push({
      title: 'Account Status',
      dataIndex: 'active',
      key: 'active',
      align: 'right',
      render: (active) => {
        return active ? <Tag color='success' className="capitalize">Active</Tag> : <Tag color='error' className="capitalize">Inactive</Tag>
      }
    });
    columns.splice(2, 0, {
      title: 'Employment Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = 'default';
        if (status?.toLowerCase() === 'active') color = 'success';
        if (status?.toLowerCase() === 'on notice') color = 'warning';
        if (status?.toLowerCase() === 'terminated') color = 'error';

        return <Tag color={color} className="capitalize">{status}</Tag>
      }
    })

  }

  if (onView || onEdit || onDelete) {
    columns.push({
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_, record) => (
        <Space size="small">
          {onView && (
            <Tooltip title="View">
              <Button
                type="text"
                icon={<EyeOutlined className="text-blue-600" />}
                disabled={viewingId === record.id}
                onClick={() => {
                  setViewingId(record.id);
                  onView(record);
                }}
              />
            </Tooltip>
          )}
          {onEdit && (
            <Tooltip title="Edit">
              <Button
                type="text"
                icon={<EditOutlined className="text-green-600" />}
                onClick={() => onEdit(record)}
              />
            </Tooltip>
          )}
          {onDelete && (
            <Tooltip title="Delete">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => onDelete(record.id)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    })
  }

  return (
    <>
      {/* Desktop View */}
      <div className="hidden md:block bg-card mt-4 rounded-xl shadow-sm border border-border overflow-hidden">
        <Table
          columns={columns}
          dataSource={employees}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          loading={loading}
          scroll={{ x: 'max-content' }}
          onRow={(record) => ({
            onClick: () => {
              if (onView) {
                onView(record);
              }
            },
          })}
        />
      </div>

      {/* Mobile View - Card List */}
      <div className="md:hidden space-y-4">
        {loading ? (
          // Simple skeleton for mobile
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="bg-card mt-4 p-4 rounded-xl shadow-sm border border-border h-[250px] animate-pulse">
              <div className="flex gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-slate-200"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-32 bg-slate-200 rounded"></div>
                  <div className="h-3 w-24 bg-slate-200 rounded"></div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-3 w-full bg-slate-200 rounded"></div>
                <div className="h-3 w-full bg-slate-200 rounded"></div>
                <div className="h-3 w-full bg-slate-200 rounded"></div>
              </div>
            </div>
          ))
        ) : employees.map((employee) => (
          <div key={employee.id} className="bg-card mt-4 p-4 rounded-xl shadow-sm border border-border flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                {employee.profilePhoto ? (
                  <img src={employee.profilePhoto} alt="" className="w-12 h-12 rounded-full object-cover shadow-sm" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg border border-primary/20">
                    {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-card-foreground">{employee.firstName} {employee.lastName}</h3>
                  <p className="text-sm text-muted-foreground">{employee.position}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Tag color={employee.status?.toLowerCase() === 'active' ? 'success' : 'default'} className="m-0 capitalize">
                  {employee.status}
                </Tag>
              </div>
            </div>

            <div className="space-y-2 border-t border-border pt-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Email:</span>
                <span className="text-card-foreground break-all">{employee.email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Department:</span>
                <span className="text-card-foreground">{employee.department}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Joined:</span>
                <span className="text-card-foreground">{employee.joinDate ? formatDate(employee.joinDate) : ''}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              {onView && (
                <Button size="middle" icon={<EyeOutlined />} disabled={viewingId === employee.id} onClick={() => { setViewingId(employee.id); onView(employee);}}>
                  View
                </Button>
              )}
              {onEdit && (
                <Button size="middle" icon={<EditOutlined />} onClick={() => onEdit(employee)}>
                  Edit
                </Button>
              )}
              {onDelete && (
                <Button size="middle" danger icon={<DeleteOutlined />} onClick={() => onDelete(employee.id)} />
              )}
            </div>
          </div>
        ))}

        {employees.length === 0 && (
          <div className="text-center py-10 bg-card rounded-xl border border-dashed border-border">
            <p className="text-muted-foreground">No employees found</p>
          </div>
        )}
      </div>
    </>
  )
}
