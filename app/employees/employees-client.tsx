"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Skeleton, Card, Space, Result, Button, message } from "antd"

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
            joinDate: record.Joining_Date__c || '',
            status: record.Status__c,
            active: record.Active__c,
            salary: record.Base_Salary__c || 0,
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

  const handleAddEmployee = (data: Employee) => {
    console.log("Add not implemented fully via API yet", data);
    message.info("Add Employee feature coming soon via API");
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
            Base_Salary__c: data.salary,
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

        if (!res.ok) throw new Error('Failed to update');

        message.success({ content: 'Employee updated successfully!', key: 'update' });
        await refetch();
        setEditingEmployee(undefined)
        setShowForm(false)
     } catch (error) {
         console.error("Update failed", error);
         message.error({ content: 'Failed to update employee', key: 'update' });
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <div className="space-y-3 w-full sm:w-auto">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Skeleton.Input 
              active 
              size="large" 
              className="w-full sm:w-[200px] lg:w-[250px]"
              style={{ height: 40 }}
            />
            <Skeleton.Input 
              active 
              size="small" 
              className="w-full sm:w-[150px] lg:w-[180px]"
            />
          </div>
        </div>
        <Skeleton.Button 
          active 
          size="large" 
          shape="default" 
          className="w-full sm:w-[140px] lg:w-[160px] mt-2 sm:mt-0"
        />
      </div>

      {/* Filter section */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8">
        <Skeleton.Input 
          active 
          size="large" 
          className="w-full sm:flex-1 lg:max-w-[300px]"
        />
        <div className="flex gap-3 sm:gap-4">
          <Skeleton.Input 
            active 
            size="large" 
            className="w-1/2 sm:w-[150px] lg:w-[180px]"
          />
          <Skeleton.Input 
            active 
            size="large" 
            className="w-1/2 sm:w-[150px] lg:w-[180px]"
          />
        </div>
      </div>

      {/* Table skeleton */}
      <Card className="shadow-sm border-gray-100 rounded-xl overflow-hidden">
        <div className="divide-y divide-gray-100">
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i} 
              className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0"
            >
              {/* Avatar and text info */}
              <div className="flex items-start sm:items-center gap-3 sm:gap-4 w-full sm:flex-1">
                <Skeleton.Avatar 
                  active 
                  size="large" 
                  shape="circle" 
                  className="flex-shrink-0"
                />
                <div className="space-y-2 min-w-0 flex-1">
                  <Skeleton.Input 
                    active 
                    size="small" 
                    className="w-full max-w-[140px] sm:max-w-none sm:w-[140px]"
                  />
                  <Skeleton.Input 
                    active 
                    size="small" 
                    className="w-full max-w-[180px] sm:max-w-none sm:w-[180px]"
                  />
                </div>
              </div>

              {/* Additional info columns - hidden on small screens */}
              <div className="hidden sm:block sm:flex-1 ml-4">
                <Skeleton.Input 
                  active 
                  size="small" 
                  className="w-full max-w-[120px]"
                />
              </div>
              
              <div className="hidden md:block md:flex-1 ml-4">
                <Skeleton.Input 
                  active 
                  size="small" 
                  className="w-full max-w-[100px]"
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 self-end sm:self-auto sm:ml-4">
                <Skeleton.Button 
                  active 
                  size="small" 
                  shape="circle" 
                  className="flex-shrink-0"
                />
                <Skeleton.Button 
                  active 
                  size="small" 
                  shape="circle" 
                  className="flex-shrink-0"
                />
              </div>

              {/* Mobile view for additional columns */}
              <div className="flex gap-4 sm:hidden w-full pt-2 border-t border-gray-100 mt-2">
                <div className="flex-1">
                  <Skeleton.Input 
                    active 
                    size="small" 
                    className="w-full"
                  />
                </div>
                <div className="flex-1">
                  <Skeleton.Input 
                    active 
                    size="small" 
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
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
            <RefreshButton onClick={refetch} label="" size="large" loading={isFetching}/>

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
