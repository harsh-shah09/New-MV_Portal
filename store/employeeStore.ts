import { create } from "zustand"
import type { Employee } from "@/types"

interface EmployeeStore {
  employees: Employee[]
  selectedEmployee: Employee | null
  loading: boolean
  setEmployees: (employees: Employee[]) => void
  setSelectedEmployee: (employee: Employee | null) => void
  addEmployee: (employee: Employee) => void
  updateEmployee: (employee: Employee) => void
  deleteEmployee: (id: string) => void
  setLoading: (loading: boolean) => void
}

export const useEmployeeStore = create<EmployeeStore>((set) => ({
  employees: [],
  selectedEmployee: null,
  loading: false,
  setEmployees: (employees) => set({ employees }),
  setSelectedEmployee: (employee) => set({ selectedEmployee: employee }),
  addEmployee: (employee) =>
    set((state) => ({
      employees: [...state.employees, employee],
    })),
  updateEmployee: (employee) =>
    set((state) => ({
      employees: state.employees.map((e) => (e.id === employee.id ? employee : e)),
    })),
  deleteEmployee: (id) =>
    set((state) => ({
      employees: state.employees.filter((e) => e.id !== id),
    })),
  setLoading: (loading) => set({ loading }),
}))
