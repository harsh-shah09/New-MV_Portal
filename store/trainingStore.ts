import { create } from "zustand"
import type { Training, TrainingEnrollment } from "@/types"

interface TrainingStore {
  trainings: Training[]
  enrollments: TrainingEnrollment[]
  loading: boolean
  setTrainings: (trainings: Training[]) => void
  setEnrollments: (enrollments: TrainingEnrollment[]) => void
  addTraining: (training: Training) => void
  updateTraining: (training: Training) => void
  enrollEmployee: (enrollment: TrainingEnrollment) => void
  setLoading: (loading: boolean) => void
}

export const useTrainingStore = create<TrainingStore>((set) => ({
  trainings: [],
  enrollments: [],
  loading: false,
  setTrainings: (trainings) => set({ trainings }),
  setEnrollments: (enrollments) => set({ enrollments }),
  addTraining: (training) =>
    set((state) => ({
      trainings: [...state.trainings, training],
    })),
  updateTraining: (training) =>
    set((state) => ({
      trainings: state.trainings.map((t) => (t.id === training.id ? training : t)),
    })),
  enrollEmployee: (enrollment) =>
    set((state) => ({
      enrollments: [...state.enrollments, enrollment],
    })),
  setLoading: (loading) => set({ loading }),
}))
