"use client"

import { Card } from "antd"

interface LeaveUtilizationSummaryProps {
  leaveBalanceData: {
    annualLeaveRemaining: number
    earnedLeaveBalance: number
  }
  totalLeavesTaken: number
  totalAllowance: number
}

export function LeaveUtilizationSummary({ 
  leaveBalanceData, 
  totalLeavesTaken, 
  totalAllowance
}: LeaveUtilizationSummaryProps) {
  return (
    <Card title="Leave Summary">
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-base">Total Allowance:</span>
            <span className="font-semibold text-lg">{totalAllowance} days</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-base">Used:</span>
            <span className="font-semibold text-lg">{totalLeavesTaken} days</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-base">Remaining:</span>
            <span className="font-semibold text-lg text-blue-600">{leaveBalanceData.annualLeaveRemaining} days</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-base">Earned Balance:</span>
            <span className="font-semibold text-lg text-green-600">{leaveBalanceData.earnedLeaveBalance} days</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
