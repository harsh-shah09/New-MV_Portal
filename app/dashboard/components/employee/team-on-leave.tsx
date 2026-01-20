"use client"

import { Card, Avatar, Empty, Tag } from "antd"
import { UserOutlined, TeamOutlined } from "@ant-design/icons"

interface TeamMembersProps {
  teamMembers: any[]
}

export function TeamOnLeave({ teamMembers }: TeamMembersProps) {
  return (
    <Card 
      title={
        <span className="flex items-center gap-2">
          <TeamOutlined />
          Team Members ({teamMembers.length})
        </span>
      }
      className="h-full"
    >
      {teamMembers.length > 0 ? (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {teamMembers.map((member: any) => (
            <div 
              key={member.id} 
              className="p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <Avatar 
                  size={40} 
                  icon={<UserOutlined />} 
                  className="bg-blue-500 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate">
                    {member.name}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                    <span>{member.email}</span>
                  </div>
                  {member.title && (
                    <div className="mt-1">
                      <Tag color="blue" className="text-xs">
                        {member.title}
                      </Tag>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No team members found"
          className="py-8"
        />
      )}
    </Card>
  )
}
