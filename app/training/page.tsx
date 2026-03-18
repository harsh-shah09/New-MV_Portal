"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { TrainingList } from "./components/training-list"
import { TrainingDetail } from "./components/training-detail"
import { ProgressCard } from "./components/progress-card"
import { useTrainingStore } from "@/store/trainingStore"
import type { Training, TrainingEnrollment } from "@/types"
import { RoleGuard } from "@/components/role-guard"

const mockTrainings: Training[] = [
  {
    id: "1",
    title: "React Advanced Patterns",
    description: "Learn advanced React patterns including hooks, context, and performance optimization",
    category: "Web Development",
    instructor: "Sarah Chen",
    startDate: "2024-08-01",
    endDate: "2024-08-15",
    duration: 20,
    maxParticipants: 30,
    enrolledCount: 24,
    status: "scheduled",
  },
  {
    id: "2",
    title: "Project Management Essentials",
    description: "Master core project management skills and methodologies",
    category: "Management",
    instructor: "Tom Wilson",
    startDate: "2024-07-20",
    endDate: "2024-08-10",
    duration: 16,
    maxParticipants: 25,
    enrolledCount: 22,
    status: "ongoing",
  },
  {
    id: "3",
    title: "Data Analysis with Python",
    description: "Comprehensive guide to data analysis using Python and pandas",
    category: "Data Science",
    instructor: "Emma Davis",
    startDate: "2024-09-01",
    endDate: "2024-09-20",
    duration: 24,
    maxParticipants: 20,
    enrolledCount: 18,
    status: "scheduled",
  },
  {
    id: "4",
    title: "Leadership and Communication",
    description: "Develop leadership skills and improve communication effectiveness",
    category: "Professional Development",
    instructor: "Michael Brown",
    startDate: "2024-06-15",
    endDate: "2024-07-15",
    duration: 12,
    maxParticipants: 35,
    enrolledCount: 35,
    status: "completed",
  },
]

const mockEnrollments: TrainingEnrollment[] = [
  {
    id: "e1",
    trainingId: "4",
    employeeId: "current",
    enrollmentDate: "2024-06-15",
    completionDate: "2024-07-15",
    score: 92,
    status: "completed",
  },
  {
    id: "e2",
    trainingId: "2",
    employeeId: "current",
    enrollmentDate: "2024-07-20",
    status: "enrolled",
  },
]

import { Tabs, message } from 'antd';

// ... (keep logic up to imports)

export default function TrainingPage() {
  const router = useRouter()
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null)
  const { trainings, enrollments, setTrainings, setEnrollments, enrollEmployee } = useTrainingStore()

  const handleEnroll = (trainingId: string) => {
    const newEnrollment: TrainingEnrollment = {
      id: Math.random().toString(36).substr(2, 9),
      trainingId,
      employeeId: "current-user",
      enrollmentDate: new Date().toISOString().split("T")[0],
      status: "enrolled",
    }
    enrollEmployee(newEnrollment)
    setSelectedTraining(null)
  }

  const trainingMap = trainings.reduce(
    (acc, t) => {
      acc[t.id] = t.title
      return acc
    },
    {} as Record<string, string>,
  )

  const myEnrollments = enrollments.filter((e) => e.employeeId === "current-user")

  const items = [
    {
      key: 'available',
      label: 'Available Trainings',
      children: <TrainingList trainings={trainings} onSelect={setSelectedTraining} onEnroll={handleEnroll} />
    },
    {
      key: 'my-trainings',
      label: 'My Trainings',
      children: (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TrainingList
              trainings={trainings.filter((t) => myEnrollments.some((e) => e.trainingId === t.id))}
              onSelect={setSelectedTraining}
            />
          </div>
          <div>
            <ProgressCard enrollments={myEnrollments} trainingMap={trainingMap} />
          </div>
        </div>
      )
    }
  ];

  return (
    <RoleGuard>
      <div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">Training & Development</h1>
            <p className="text-slate-500 text-lg">Enhance your skills with our training programs</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 mb-6 mt-8 p-6">
            <Tabs defaultActiveKey="available" items={items} />
          </div>

          {selectedTraining && (
            <TrainingDetail
              training={selectedTraining}
              onClose={() => setSelectedTraining(null)}
              onEnroll={handleEnroll}
            />
          )}
        </div>
      </div>
    </RoleGuard>
  )
}
