"use client"

import { useState } from "react"
import { Card, Statistic, Row, Col, Tooltip, Drawer, Badge, Tag, Spin, Empty, Button } from "antd"
import { TeamOutlined, InfoCircleOutlined, FileTextOutlined, CloseOutlined } from "@ant-design/icons"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import { FileText, Clock, Upload, ExternalLink } from "lucide-react"

interface EmployeeStatsProps {
  stats: {
    totalEmployees: number
    onLeaveToday: number
    newJoinersThisMonth: number
    pendingDocuments: number
  }
}

interface PendingDoc {
  Id: string
  Name: string
  Document_Type__c: string
  Document_Category__c?: string
  Status__c: string
  CreatedDate: string
  Employee__c: string
  Employee__r?: {
    Employee_Name__c?: string
    Role__c?: string
  }
}

const STATUS_CONFIG: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  Pending: { color: "orange", icon: Clock, label: "Pending" },
  Uploaded: { color: "blue", icon: Upload, label: "Uploaded – Needs Review" },
}

export function EmployeeStats({ stats }: EmployeeStatsProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { data: docsData, isLoading } = useQuery<PendingDoc[]>({
    queryKey: ["pending-documents-list"],
    queryFn: async () => {
      const res = await fetch("/api/documents/pending")
      if (!res.ok) throw new Error("Failed to fetch")
      const json = await res.json()
      // The endpoint returns the raw Salesforce records array
      return Array.isArray(json) ? json : (json.documents ?? [])
    },
    enabled: drawerOpen,
    refetchOnWindowFocus: false,
  })

  const pendingDocs = docsData ?? []

  // Group by employee name for a cleaner view
  const grouped = pendingDocs.reduce<Record<string, PendingDoc[]>>((acc, doc) => {
    const name = doc.Employee__r?.Employee_Name__c || "Unknown"
    if (!acc[name]) acc[name] = []
    acc[name].push(doc)
    return acc
  }, {})

  const getEmployeeId = (doc: PendingDoc): string => doc.Employee__c || ""

  const renderTooltipTitle = (label: string, message: string) => (
    <span className="inline-flex items-center gap-1">
      <span>{label}</span>
      <Tooltip title={message} placement="top">
        <InfoCircleOutlined className="text-slate-400 hover:text-slate-600" />
      </Tooltip>
    </span>
  )

  return (
    <>
      <Card
        title={
          <span className="flex items-center gap-2">
            <TeamOutlined />
            Employee Stats
          </span>
        }
        className="h-full"
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <Card className="bg-blue-50 border-blue-200">
              <Statistic
                title={renderTooltipTitle("Today's Attendance", "Employees currently active and not on leave are shown here.")}
                value={stats.totalEmployees - stats.onLeaveToday}
                styles={{ content: { color: '#3b82f6', fontSize: '20px' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12}>
            <Card className="bg-green-50 border-green-200">
              <Statistic
                title={renderTooltipTitle("New Joiners (Month)", "Employees joined in the current month are shown here.")}
                value={stats.newJoinersThisMonth}
                styles={{ content: { color: '#10b981', fontSize: '20px' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12}>
            {/* Clickable Pending Documents card */}
            <Tooltip title="Click to view which documents are pending" placement="top">
              <Card
                className="bg-orange-50 border-orange-200 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setDrawerOpen(true)}
              >
                <Statistic
                  title={
                    <span className="inline-flex items-center gap-1 text-orange-700">
                      <FileTextOutlined />
                      <span>Pending Documents</span>
                      <InfoCircleOutlined className="text-orange-400 hover:text-orange-600 ml-1" />
                    </span>
                  }
                  value={stats.pendingDocuments}
                  styles={{ content: { color: '#f59e0b', fontSize: '20px' } }}
                />
              </Card>
            </Tooltip>
          </Col>
          <Col xs={24} sm={12}>
            <Card className="bg-purple-50 border-purple-200">
              <Statistic
                title={renderTooltipTitle("On Leave", "Employees with approved leave today are shown here.")}
                value={stats.onLeaveToday}
                styles={{ content: { color: '#8b5cf6', fontSize: '20px' } }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Pending Documents Drawer */}
      <Drawer
        title={
          <div className="flex items-center gap-2">
            <FileTextOutlined className="text-orange-500" />
            <span>Pending Documents</span>
            <Badge count={stats.pendingDocuments} color="orange" />
          </div>
        }
        placement="right"
        width={480}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        closable={false}
        extra={
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={() => setDrawerOpen(false)}
          />
        }
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <Spin size="large" />
            <p className="text-slate-500 text-sm">Loading pending documents…</p>
          </div>
        ) : pendingDocs.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span className="text-slate-500">
                No pending documents found 🎉
              </span>
            }
          />
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              {pendingDocs.length} document{pendingDocs.length !== 1 ? "s" : ""} awaiting review across{" "}
              {Object.keys(grouped).length} employee{Object.keys(grouped).length !== 1 ? "s" : ""}.
            </p>

            {Object.entries(grouped).map(([employeeName, docs]) => {
              const employeeId = getEmployeeId(docs[0])
              return (
                <div key={employeeName} className="rounded-xl border border-slate-200 overflow-hidden">
                  {/* Employee header */}
                  <div className="flex items-center justify-between bg-slate-50 px-4 py-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-semibold text-sm">
                        {employeeName.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-800 text-sm">{employeeName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge count={docs.length} color="orange" />
                      {employeeId && (
                        <Tooltip title="View employee profile">
                          <button
                            onClick={() => window.open(`/employees/${employeeId}?tab=documents`, "_blank")}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            <ExternalLink size={12} />
                            Review
                          </button>
                        </Tooltip>
                      )}
                    </div>
                  </div>

                  {/* Document rows */}
                  <div className="divide-y divide-slate-100">
                    {docs.map((doc) => {
                      const config = STATUS_CONFIG[doc.Status__c] ?? { color: "default", icon: FileText, label: doc.Status__c }
                      const Icon = config.icon
                      const submittedDate = doc.CreatedDate
                        ? format(new Date(doc.CreatedDate), "dd MMM yyyy")
                        : "—"

                      return (
                        <div key={doc.Id} className="flex items-center justify-between px-4 py-3 hover:bg-orange-50/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <Icon size={14} className="text-slate-400 shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-slate-800">
                                {doc.Document_Type__c || doc.Name || "Document"}
                              </p>
                              <p className="text-xs text-slate-400">Submitted {submittedDate}</p>
                            </div>
                          </div>
                          <Tag color={config.color} className="shrink-0 text-xs">
                            {config.label}
                          </Tag>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Drawer>
    </>
  )
}
