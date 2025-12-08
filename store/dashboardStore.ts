import { create } from "zustand"
import type { DashboardStats } from "@/types"

interface DashboardStore {
  stats: DashboardStats | null
  loading: boolean
  setStats: (stats: DashboardStats) => void
  setLoading: (loading: boolean) => void
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  stats: null,
  loading: false,
  setStats: (stats) => set({ stats }),
  setLoading: (loading) => set({ loading }),
}))
