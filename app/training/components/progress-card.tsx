import type { TrainingEnrollment } from "@/types"

interface ProgressCardProps {
  enrollments: TrainingEnrollment[]
  trainingMap: Record<string, string>
}

export function ProgressCard({ enrollments, trainingMap }: ProgressCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Training Progress</h3>
      <div className="space-y-4">
        {enrollments.map((enrollment) => (
          <div key={enrollment.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-medium text-gray-900">{trainingMap[enrollment.trainingId]}</h4>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  enrollment.status === "completed"
                    ? "bg-green-100 text-green-800"
                    : enrollment.status === "enrolled"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-800"
                }`}
              >
                {enrollment.status}
              </span>
            </div>

            {enrollment.status === "completed" && enrollment.score && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Score</span>
                <span className="text-lg font-medium text-gray-900">{enrollment.score}%</span>
              </div>
            )}

            {enrollment.status === "enrolled" && (
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 animate-pulse" style={{ width: "45%" }}></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
