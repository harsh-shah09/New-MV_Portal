import type { LeavePolicy } from "@/types"

interface LeavePolicyCardProps {
  policies: LeavePolicy[]
}

export function LeavePolicyCard({ policies }: LeavePolicyCardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {policies.map((policy) => (
        <div key={policy.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{policy.leaveType}</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Annual Days</span>
              <span className="font-medium text-gray-900">{policy.annualDays} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Carry Forward</span>
              <span className="font-medium text-gray-900">{policy.carryForwardDays} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Min Advance Notice</span>
              <span className="font-medium text-gray-900">{policy.minAdvanceNotice} days</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
