"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Skeleton, Card, Space, Result, Button, message, Spin } from "antd"

import { EmployeeForm } from "./components/employee-form"
import { EmployeeTable } from "./components/employee-table"
import { EmployeeFilters } from "./components/employee-filters"
import { EmployeeDetail } from "./components/employee-detail"
import { useEmployeeStore } from "@/store/employeeStore"
import type { Employee } from "@/types"
import { PageContainer } from "@/components/page-container"
import { PageHeader } from "@/components/page-header"
import { RefreshButton } from "@/components/refresh-button"
import { Plus } from "lucide-react"

interface EmployeesClientProps {
  role: string
}

export default function EmployeesClient({ role }: EmployeesClientProps) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>(undefined)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | undefined>(undefined)
  const [searchTerm, setSearchTerm] = useState("")
  const [department, setDepartment] = useState("")
  const [status, setStatus] = useState("")
  
  const [accountStatus, setAccountStatus] = useState("")
  
  const isHR = role === 'HR' || role === 'Admin';

  const { addEmployee, updateEmployee, deleteEmployee } = useEmployeeStore()

  /* handleUpdateEmployee implementation and queryFn fix */
  const { data: employees = [], isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await fetch('/api/employees');
      if (!res.ok) throw new Error('Failed to fetch employees');
      const rawData = await res.json();
      
      // Map Salesforce data to Employee type
      // Map Salesforce data to Employee type
      return rawData.map((record: any) => {
        // Parse Address
        let addressStr = record.Employee_Current_Address__c || '';
        let street = '', city = '', state = '', zipCode = '', country = '';
        
        try {
            const parsed = JSON.parse(addressStr);
            if (typeof parsed === 'object' && parsed !== null) {
                street = parsed.street || '';
                city = parsed.city || '';
                state = parsed.state || '';
                country = parsed.country || '';
                zipCode = parsed.postalCode || '';
            }
        } catch (e) {
            // Fallback to comma split
            if (addressStr.includes(',')) {
                const parts = addressStr.split(',').map((s: string) => s.trim());
                if (parts.length >= 1) street = parts[0];
                if (parts.length >= 2) city = parts[1];
                if (parts.length >= 3) state = parts[2];
                if (parts.length >= 4) country = parts[3];
                if (parts.length >= 5) zipCode = parts[parts.length - 1];
            } else {
                street = addressStr;
            }
        }

        return {
            id: record.Id,
            firstName: record.Employee_Name__c?.split(' ')[0] || '',
            lastName: record.Employee_Name__c?.split(' ').slice(1).join(' ') || '',
            email: record.Employee_Email__c || '',
            phone: record.Employee_Phone__c || '',
            department: record.Department__c || 'Un-Assigned',
            position: record.Role__c || '',
            title : record.Title__c || '',
            joinDate: record.Joining_Date__c || '',
            status: record.Status__c,
            active: record.Active__c,
            salary: record.Salary_CTC__c || 0,
            profilePhoto: record.Profile_Photo__c,
            personalDetails: {
                address: street,
                city : city,
                state : state,
                zipCode : zipCode,
                nationality : country,
                emergencyContact: record.Emergency_Contact_Name__c,
                emergencyPhone: record.Emergency_Contact_Number__c,
            },
            gender: record.Gender__c,
            experience: record.Experience__c,
            employeeId: record.Name,
            ctc: record.Salary_CTC__c,
        };
      }) as Employee[];
    }
  });


  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.phone && emp.phone.includes(searchTerm))

    const matchesDepartment = !department || emp.department === department
    const matchesStatus = !status || emp.status.toLowerCase() === status.toLowerCase()
    
    // Account Status Filter
    let matchesAccountStatus = true;
    if (accountStatus === 'active') matchesAccountStatus = !!emp.active;
    if (accountStatus === 'inactive') matchesAccountStatus = !emp.active;

    return matchesSearch && matchesDepartment && matchesStatus && matchesAccountStatus
  })

  const handleRefresh = async () => {
    setSearchTerm("")
    setDepartment("")
    setStatus("")
    setAccountStatus("")
    await refetch()
  }

  const handleAddEmployee = (data: Employee) => {
    setShowForm(false)
  }

  const handleUpdateEmployee = async (data: Employee) => {
     try {
        message.loading({ content: 'Updating...', key: 'update' });

        const salesforceData: any = {
            Employee_Name__c: `${data.firstName} ${data.lastName}`,
            Employee_Email__c: data.email,
            Employee_Phone__c: data.phone,
            Department__c: data.department,
            Role__c: data.position,
            Joining_Date__c: data.joinDate,
            Salary_CTC__c: data.salary,
            Status__c: data.status,
            // Store structured address object (API will JSON.stringify it)
            Employee_Current_Address__c: {
                street: data.personalDetails?.address || '',
                city: data.personalDetails?.city || '',
                state: data.personalDetails?.state || '',
                postalCode: data.personalDetails?.zipCode || '',
                country: data.personalDetails?.nationality || ''
            },
            Emergency_Contact_Name__c: data.personalDetails?.emergencyContact,
            Emergency_Contact_Number__c: data.personalDetails?.emergencyPhone,
        };

        const res = await fetch(`/api/employees/${data.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(salesforceData),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody?.error || 'Failed to update');
        }

        message.success({ content: 'Employee updated successfully!', key: 'update' });
        await refetch();
        setEditingEmployee(undefined)
        setShowForm(false)
     } catch (error: any) {
       console.error("Update failed", error);
       const errMsg = error?.message || 'Failed to update employee';
       message.error({ content: errMsg, key: 'update' });
     }
  }

  const handleDeleteEmployee = (id: string) => {
    if (confirm("Are you sure you want to delete this employee?")) {
      // deleteEmployee(id)
       console.log("Delete not implemented fully via API yet", id);
    }
  }

  if (isLoading) {
  return (
   <div className="w-full h-screen flex items-center justify-center">
      <Spin size="large" tip="Loading..." />
    </div>
  )
}

  if (isError) {
    return (
      <div className="flex justify-center items-center min-h-[80vh] bg-background">
        <Result
          status="500"
          title="Failed to Load Employees"
          subTitle="We ran into an issue while fetching the employee directory. Please check your connection and try again."
          extra={[
            <Button type="primary" key="retry" onClick={() => refetch()} size="large">
              Try Again
            </Button>,
            <Button key="home" onClick={() => router.push('/')} size="large">
              Back to Home
            </Button>
          ]}
        />
      </div>
    )
  }

  return (
    <PageContainer>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 bg-white p-3 rounded-xl flex flex-col gap-4">
        <PageHeader title="Employees" subtitle="Manage your workforce">
          <RefreshButton onClick={handleRefresh} label="" size="large" loading={isFetching}/>

            {/* <div>
              <Button type="primary" onClick={() => setShowForm(true)} size="large" icon={<Plus size={16}/>}>
                Add Employee
              </Button>
            </div> */}
        </PageHeader>

        <EmployeeFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          department={department}
          onDepartmentChange={setDepartment}
          status={status}
          onStatusChange={setStatus}
          accountStatus={accountStatus}
          onAccountStatusChange={setAccountStatus}
        />

        <div className="bg-card rounded-xl shadow-sm border border-border p-4 sm:p-6 overflow-hidden">
          <EmployeeTable 
            employees={filteredEmployees}
            onView={(emp) => router.push(`/employees/${emp.id}`)}
            // onEdit={setEditingEmployee}
            // onDelete={handleDeleteEmployee} 
            loading={isFetching}
            isHR={isHR}
          />
        </div>

        {showForm && isHR && (
          <EmployeeForm
            employee={editingEmployee}
            onSubmit={editingEmployee ? handleUpdateEmployee : handleAddEmployee}
            onCancel={() => {
              setShowForm(false)
              setEditingEmployee(undefined)
            }}
          />
        )}


      </div>
    </PageContainer>
  )
}
