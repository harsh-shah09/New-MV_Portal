"use client"

import { Card, Badge, Row, Col } from "antd"
import { CalendarOutlined } from "@ant-design/icons"
import dayjs from "dayjs"

interface UpcomingLeavesHolidaysProps {
  upcomingLeaves: any[]
  holidays: any[]
}

export function UpcomingLeavesHolidays({ upcomingLeaves, holidays }: UpcomingLeavesHolidaysProps) {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={12}>
        <Card 
          title={
            <span className="flex items-center gap-2">
              <CalendarOutlined />
              Upcoming Leaves
            </span>
          }
          className="h-full"
        >
          {upcomingLeaves.length > 0 ? (
            <div className="space-y-3">
              {upcomingLeaves.slice(0, 3).map((leave: any) => (
                <div key={leave.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-gray-900">{leave.leaveType || leave.leaveCategory}</div>
                      <div className="text-sm text-gray-600">
                        {dayjs(leave.startDate).format('MMM DD')} - {dayjs(leave.endDate).format('MMM DD, YYYY')}
                      </div>
                    </div>
                    <Badge status="success" text={`${leave.duration} day(s)`} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CalendarOutlined style={{ fontSize: 48, opacity: 0.3 }} />
              <p className="mt-2">No upcoming leaves</p>
            </div>
          )}
        </Card>
      </Col>

      <Col xs={24} lg={12}>
        <Card 
          title={
            <span className="flex items-center gap-2">
              <CalendarOutlined />
              Upcoming Holidays
            </span>
          }
          className="h-full"
        >
          {holidays.length > 0 ? (
            <div className="space-y-3">
              {holidays.slice(0, 3).map((holiday: any, index: number) => (
                <div key={index} className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-gray-900">{holiday.name}</div>
                      <div className="text-sm text-gray-600">
                        {dayjs(holiday.date).format('MMM DD, YYYY')} • {holiday.day}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CalendarOutlined style={{ fontSize: 48, opacity: 0.3 }} />
              <p className="mt-2">No upcoming holidays</p>
            </div>
          )}
        </Card>
      </Col>
    </Row>
  )
}
