import { create } from "zustand"
import type { Payroll } from "@/types"

interface PayrollStore {
  payrolls: Payroll[]
  loading: boolean
  setPayrolls: (payrolls: Payroll[]) => void
  addPayroll: (payroll: Payroll) => void
  updatePayroll: (payroll: Payroll) => void
  setLoading: (loading: boolean) => void
}

export const usePayrollStore = create<PayrollStore>((set) => ({
  payrolls: [],
  loading: false,
  setPayrolls: (payrolls) => set({ payrolls }),
  addPayroll: (payroll) =>
    set((state) => ({
      payrolls: [...state.payrolls, payroll],
    })),
  updatePayroll: (payroll) =>
    set((state) => ({
      payrolls: state.payrolls.map((p) => (p.id === payroll.id ? payroll : p)),
    })),
  setLoading: (loading) => set({ loading }),
}))
