"use client"

import type { Training } from "@/types"

interface TrainingDetailProps {
  training: Training
  onClose: () => void
  onEnroll?: (trainingId: string) => void
}

export function TrainingDetail({ training, onClose, onEnroll }: TrainingDetailProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">{training.title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Description</label>
            <p className="text-gray-900">{training.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Category</label>
              <p className="text-lg font-medium text-gray-900">{training.category}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Instructor</label>
              <p className="text-lg font-medium text-gray-900">{training.instructor}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Duration</label>
              <p className="text-lg font-medium text-gray-900">{training.duration} hours</p>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Status</label>
              <p className="text-lg font-medium text-gray-900 capitalize">{training.status}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Start Date</label>
              <p className="text-lg font-medium text-gray-900">{training.startDate}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">End Date</label>
              <p className="text-lg font-medium text-gray-900">{training.endDate}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">Enrollment</label>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${(training.enrolledCount / training.maxParticipants) * 100}%` }}
                  ></div>
                </div>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {training.enrolledCount}/{training.maxParticipants}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
            >
              Close
            </button>
            {onEnroll && (
              <button
                onClick={() => onEnroll(training.id)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
              >
                Enroll Now
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
