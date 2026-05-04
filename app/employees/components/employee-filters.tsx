"use client"

import { Input, Select, Card, Row, Col } from 'antd'
import { SearchOutlined, FilterOutlined } from '@ant-design/icons'


interface EmployeeFiltersProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  department: string
  onDepartmentChange: (value: string) => void
  status: string
  onStatusChange: (value: string) => void
  accountStatus: string
  onAccountStatusChange: (value: string) => void
}

const { Option } = Select

export function EmployeeFilters({
  searchTerm,
  onSearchChange,
  department,
  onDepartmentChange,
  status,
  onStatusChange,
  accountStatus,
  onAccountStatusChange
}: EmployeeFiltersProps) {
  return (
    <Card className="rounded-xl shadow-sm border-border bg-card text-card-foreground mb-6" styles={{body : { padding: '16px' }}}>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">
            Search
          </label>
          <Input
            prefix={<SearchOutlined className="text-muted-foreground" />}
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            allowClear
            size="large"
            className="rounded-lg"
          />
        </Col>

        {/* <Col xs={24} md={6}>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">
            Department
          </label>
          <Select
            value={department || undefined}
            onChange={onDepartmentChange}
            placeholder="All"
            allowClear
            style={{ width: '100%' }}
            size="large"
            className="rounded-lg"
          >
            <Option value="">All Departments</Option>
            <Option value="IT">IT</Option>
            <Option value="Admin">Admin</Option>
            <Option value="HR">HR</Option>
            <Option value="Marketing">Marketing</Option>
            <Option value="Finance">Finance</Option>
          </Select>
        </Col> */}

        <Col xs={24} md={8}>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">
            Employment Status
          </label>
          <Select
            value={status || ""}
            onChange={onStatusChange}
            placeholder="All"
            allowClear
            style={{ width: '100%' }}
            size="large"
            className="rounded-lg"
          >
            <Option value="">All Statuses</Option>
            <Option value="active">Active</Option>
            <Option value="On Notice">On Notice</Option>
            <Option value="Resigned">Resigned</Option>
            <Option value="Terminated">Terminated</Option>
          </Select>
        </Col>
        
        <Col xs={24} md={8}>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">
            Account Status
          </label>
          <Select
            value={accountStatus || ""}
            onChange={onAccountStatusChange}
            placeholder="All"
            allowClear
            style={{ width: '100%' }}
            size="large"
            className="rounded-lg"
          >
            <Option value="">All</Option>
            <Option value="active">Active Users</Option>
            <Option value="inactive">Inactive Users</Option>
          </Select>
        </Col>
      </Row>
    </Card>
  )
}
