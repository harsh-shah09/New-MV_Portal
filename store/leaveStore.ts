import { create } from "zustand"
import type { LeaveRequest } from "@/types"

interface LeaveStore {
  leaves: LeaveRequest[]
  pendingApprovals: LeaveRequest[]
  loading: boolean
  setLeaves: (leaves: LeaveRequest[]) => void
  setPendingApprovals: (leaves: LeaveRequest[]) => void
  addLeave: (leave: LeaveRequest) => void
  updateLeave: (leave: LeaveRequest) => void
  setLoading: (loading: boolean) => void
}

export const useLeaveStore = create<LeaveStore>((set) => ({
  leaves: [],
  pendingApprovals: [],
  loading: false,
  setLeaves: (leaves) => set({ leaves }),
  setPendingApprovals: (leaves) => set({ pendingApprovals: leaves }),
  addLeave: (leave) =>
    set((state) => ({
      leaves: [...state.leaves, leave],
    })),
  updateLeave: (leave) =>
    set((state) => ({
      leaves: state.leaves.map((l) => (l.id === leave.id ? leave : l)),
    })),
  setLoading: (loading) => set({ loading }),
}))
