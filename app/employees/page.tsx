"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { EmployeeForm } from "./components/employee-form"
import { EmployeeTable } from "./components/employee-table"
import { EmployeeFilters } from "./components/employee-filters"
import { EmployeeDetail } from "./components/employee-detail"
import { useEmployeeStore } from "@/store/employeeStore"
import type { Employee } from "@/types"

const mockEmployees: Employee[] = [
  {
    id: "1",
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@company.com",
    phone: "+1-555-0101",
    department: "Engineering",
    position: "Senior Developer",
    joinDate: "2021-03-15",
    status: "active",
    salary: 120000,
  },
  {
    id: "2",
    firstName: "Jane",
    lastName: "Smith",
    email: "jane.smith@company.com",
    phone: "+1-555-0102",
    department: "Sales",
    position: "Sales Manager",
    joinDate: "2020-06-20",
    status: "active",
    salary: 95000,
  },
  {
    id: "3",
    firstName: "Mike",
    lastName: "Johnson",
    email: "mike.johnson@company.com",
    phone: "+1-555-0103",
    department: "HR",
    position: "HR Specialist",
    joinDate: "2022-01-10",
    status: "active",
    salary: 75000,
  },
]

export default function EmployeesPage() {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>(undefined)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | undefined>(undefined)
  const [searchTerm, setSearchTerm] = useState("")
  const [department, setDepartment] = useState("")
  const [status, setStatus] = useState("")

  const { employees, setEmployees, addEmployee, updateEmployee, deleteEmployee } = useEmployeeStore()

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.phone.includes(searchTerm)

    const matchesDepartment = !department || emp.department === department
    const matchesStatus = !status || emp.status === status

    return matchesSearch && matchesDepartment && matchesStatus
  })

  const handleAddEmployee = (data: Employee) => {
    addEmployee(data)
    setShowForm(false)
  }

  const handleUpdateEmployee = (data: Employee) => {
    updateEmployee(data)
    setEditingEmployee(undefined)
    setShowForm(false)
  }

  const handleDeleteEmployee = (id: string) => {
    if (confirm("Are you sure you want to delete this employee?")) {
      deleteEmployee(id)
    }
  }

  return (
    <div>
      <MainNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Employees</h1>
            <p className="text-gray-600 mt-1">Manage your workforce</p>
          </div>
          <button
            onClick={() => {
              setEditingEmployee(undefined)
              setShowForm(true)
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition"
          >
            + Add Employee
          </button>
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
          onEdit={(emp) => {
            setEditingEmployee(emp)
            setShowForm(true)
          }}
          onDelete={handleDeleteEmployee}
          onView={setSelectedEmployee}
        />

        {showForm && (
          <EmployeeForm
            employee={editingEmployee}
            onSubmit={editingEmployee ? handleUpdateEmployee : handleAddEmployee}
            onCancel={() => {
              setShowForm(false)
              setEditingEmployee(undefined)
            }}
          />
        )}

        {selectedEmployee && (
          <EmployeeDetail
            employee={selectedEmployee}
            onClose={() => setSelectedEmployee(undefined)}
            onEdit={(emp) => {
              setSelectedEmployee(undefined)
              setEditingEmployee(emp)
              setShowForm(true)
            }}
          />
        )}
      </div>
    </div>
  )
}
