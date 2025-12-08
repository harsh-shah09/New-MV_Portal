"use client"

import type { Training } from "@/types"

interface TrainingListProps {
  trainings: Training[]
  onSelect: (training: Training) => void
  onEnroll?: (trainingId: string) => void
}

const statusColors = {
  scheduled: "bg-blue-100 text-blue-800",
  ongoing: "bg-amber-100 text-amber-800",
  completed: "bg-green-100 text-green-800",
}

export function TrainingList({ trainings, onSelect, onEnroll }: TrainingListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {trainings.map((training) => (
        <div key={training.id} className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden">
          <div className="p-6">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-lg font-semibold text-gray-900 flex-1">{training.title}</h3>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-2 flex-shrink-0 ${statusColors[training.status]}`}
              >
                {training.status}
              </span>
            </div>

            <p className="text-sm text-gray-600 mb-4">{training.description}</p>

            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Instructor</span>
                <span className="font-medium text-gray-900">{training.instructor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Duration</span>
                <span className="font-medium text-gray-900">{training.duration} hours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Enrolled</span>
                <span className="font-medium text-gray-900">
                  {training.enrolledCount}/{training.maxParticipants}
                </span>
              </div>
            </div>

            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-blue-500"
                style={{ width: `${(training.enrolledCount / training.maxParticipants) * 100}%` }}
              ></div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => onSelect(training)}
                className="flex-1 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition"
              >
                View Details
              </button>
              {onEnroll && (
                <button
                  onClick={() => onEnroll(training.id)}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                >
                  Enroll
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
