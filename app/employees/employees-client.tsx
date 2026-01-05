"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"

import { EmployeeForm } from "./components/employee-form"
import { EmployeeTable } from "./components/employee-table"
import { EmployeeFilters } from "./components/employee-filters"
import { EmployeeDetail } from "./components/employee-detail"
import { useEmployeeStore } from "@/store/employeeStore"
import type { Employee } from "@/types"

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
  
  const isHR = role === 'HR';

  const { addEmployee, updateEmployee, deleteEmployee } = useEmployeeStore()

  const { data: employees = [], isLoading, isError } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await fetch('/api/employees');
      if (!res.ok) throw new Error('Failed to fetch employees');
      const rawData = await res.json();
      
      // Map Salesforce data to Employee type
      return rawData.map((record: any) => ({
        id: record.Id,
        firstName: record.Contact__r?.FirstName || '',
        lastName: record.Contact__r?.LastName || '',
        email: record.Contact__r?.Email || '',
        phone: record.Contact__r?.Phone || '',
        department: record.Contact__r?.Department__c || 'Unassigned',
        position: record.Contact__r?.Employee_Role__c || '',
        joinDate: record.Joining_Date__c || '',
        status: record.Status__c || 'inactive',
        salary: record.Base_Salary__c || 0,
        // Add other fields as needed for detail view if Employee type supports them
        // or extends the type. For now mapping core fields.
        profilePhoto: record.Profile_Photo__c,
        emergencyContact: record.Contact__r?.Emergency_Contact_Name__c,
        emergencyPhone: record.Contact__r?.Emergency_Contact_Number__c,
        address: record.Contact__r?.MailingAddress,
        city : record.Contact__r.MailingCity,
        state : record.Contact__r.MailingState || 'State',
        zipCode : record.Contact__r.MailingPostalCode ,
        nationality : record.Contact__r.MailingCountry,
        gender: record.Contact__r?.GenderIdentity,
        experience: record.Contact__r?.Experience__c,
        employeeId: record.Employee_ID__c,
        ctc: record.Salary_CTC__c,
      })) as Employee[];
    }
  });


  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.phone && emp.phone.includes(searchTerm))

    const matchesDepartment = !department || emp.department === department
    const matchesStatus = !status || emp.status === status

    return matchesSearch && matchesDepartment && matchesStatus
  })

  const handleAddEmployee = (data: Employee) => {
    // In a real app, this should call API
    // addEmployee(data) 
    // For now keeping store update but usually we refill query
    console.log("Add not implemented fully via API yet", data);
    setShowForm(false)
  }

  const handleUpdateEmployee = (data: Employee) => {
     // In a real app, this should call API
    // updateEmployee(data)
     console.log("Update not implemented fully via API yet", data);
    setEditingEmployee(undefined)
    setShowForm(false)
  }

  const handleDeleteEmployee = (id: string) => {
    if (confirm("Are you sure you want to delete this employee?")) {
      // deleteEmployee(id)
       console.log("Delete not implemented fully via API yet", id);
    }
  }

  if (isLoading) return <div className="flex justify-center items-center h-screen">Loading...</div>
  if (isError) return <div className="flex justify-center items-center h-screen">Error loading employees</div>

  return (
    <div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Employees</h1>
            <p className="text-gray-600 mt-1">Manage your workforce</p>
          </div>
          {isHR && (
            <button
                onClick={() => {
                setEditingEmployee(undefined)
                setShowForm(true)
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition"
            >
                + Add Employee
            </button>
          )}
        </div>

        <EmployeeFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          department={department}
          onDepartmentChange={setDepartment}
          status={status}
          onStatusChange={setStatus}
        />

        <EmployeeTable
          employees={filteredEmployees}
          onEdit={isHR ? (emp) => {
            setEditingEmployee(emp)
            setShowForm(true)
          } : undefined}
          onDelete={isHR ? handleDeleteEmployee : undefined}
          onView={isHR ? (emp) => router.push(`/employees/${emp.id}`) : undefined}
        />

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
    </div>
  )
}
