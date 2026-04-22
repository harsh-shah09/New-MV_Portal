"use client"

import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button, DatePicker, Form, Input, InputNumber, Modal, Select, Spin, message } from "antd"
import dayjs, { Dayjs } from "dayjs"
import { DollarSign, History } from "lucide-react"

interface EmployeeSalaryHistoryTabProps {
  employeeId: string
  employeeName?: string
  employeeDisplayId?: string
  employeeCode?: string
  currentUserRole: string
}

interface SalaryHistoryRecord {
  Id: string
  Employee__c: string
  Current_Salary__c: number
  Previous_Salary__c: number
  Security_Deposite__c?: number
  Increment_Amount__c: number
  Increment_Percent__c: number
  Effective_Date__c: string
  End_Date__c?: string | null
  Is_Current__c?: boolean
  Change_Type__c?: string
  Description__c?: string
  Basic_Console__c?: number
  CONV__c?: number
  ESI__c?: number
  HRA__c?: number
  PF__c?: number
  PT__c?: number
  SP_All__c?: number
  CreatedDate?: string
}

interface SalaryHistoryApiResponse {
  records: SalaryHistoryRecord[]
  changeTypeOptions: Array<{ label: string; value: string }>
}

interface SalaryHistoryFormValues {
  Current_Salary__c?: number
  Previous_Salary__c?: number
  Security_Deposite__c?: number
  Increment_Amount__c?: number
  Increment_Percent__c?: number
  Effective_Date__c?: Dayjs
  End_Date__c?: Dayjs
  Is_Current__c?: boolean
  Change_Type__c?: string
  Description__c?: string
  Basic_Console__c?: number
  CONV__c?: number
  ESI__c?: number
  HRA__c?: number
  PF__c?: number
  PT__c?: number
  SP_All__c?: number
}

const formatCurrency = (amount?: number | null) => {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "-"
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(amount)
}

export function EmployeeSalaryHistoryTab({ employeeId, employeeName, employeeDisplayId, employeeCode, currentUserRole }: EmployeeSalaryHistoryTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<SalaryHistoryRecord | null>(null)
  const [form] = Form.useForm<SalaryHistoryFormValues>()

  // Set default values for PT and PF when opening the modal for a new record
  useEffect(() => {
    if (isModalOpen && !selectedRecord) {
      form.setFieldsValue({
        PT__c: 200,
        PF__c: 12,
      })
    }
  }, [isModalOpen, selectedRecord, form])
  const queryClient = useQueryClient()
  const selectedEmployeeName = employeeName?.trim() || "Not set"
  const selectedEmployeeId = employeeDisplayId?.trim() || employeeCode?.trim() || "Not set"

  const formatDate = (value?: string | null) => (value ? dayjs(value).format("DD MMM YYYY") : "-")
  const formatPercent = (value?: number | null) => {
    if (value === null || value === undefined || Number.isNaN(value)) return "-"
    return `${Number(value).toFixed(2)}%`
  }

  const handleRecordClick = (record: SalaryHistoryRecord) => {
    setSelectedRecord(record)
    setIsDetailsModalOpen(true)
  }

  const previousSalary = Form.useWatch("Previous_Salary__c", form)
  const currentSalary = Form.useWatch("Current_Salary__c", form)

  const computedValues = useMemo(() => {
    if (typeof previousSalary !== "number" || typeof currentSalary !== "number") {
      return { incrementAmount: undefined, incrementPercent: undefined }
    }

    const incrementAmount = Number((currentSalary - previousSalary).toFixed(2))
    const incrementPercent = previousSalary === 0
      ? 0
      : Number((((currentSalary - previousSalary) / previousSalary) * 100).toFixed(2))

    return { incrementAmount, incrementPercent }
  }, [currentSalary, previousSalary])

  useEffect(() => {
    form.setFieldsValue({
      Increment_Amount__c: computedValues.incrementAmount,
      Increment_Percent__c: computedValues.incrementPercent
    })
  }, [computedValues.incrementAmount, computedValues.incrementPercent, form])

  const { data, isLoading } = useQuery<SalaryHistoryApiResponse>({
    queryKey: ["salary-history", employeeId],
    queryFn: async () => {
      const res = await fetch(`/api/employees/${employeeId}/salary-history`)
      if (!res.ok) {
        throw new Error("Failed to fetch salary history")
      }
      return res.json()
    }
  })

  const createMutation = useMutation({
    mutationFn: async (values: SalaryHistoryFormValues) => {
      const payload = {
        Current_Salary__c: values.Current_Salary__c,
        Previous_Salary__c: values.Previous_Salary__c,
        Security_Deposite__c: values.Security_Deposite__c,
        Effective_Date__c: values.Effective_Date__c?.format("YYYY-MM-DD"),
        End_Date__c: values.End_Date__c?.format("YYYY-MM-DD"),
        Is_Current__c: values.Is_Current__c ?? false,
        Change_Type__c: values.Change_Type__c,
        Description__c: values.Description__c,
        Basic_Console__c: values.Basic_Console__c,
        CONV__c: values.CONV__c,
        ESI__c: values.ESI__c,
        HRA__c: values.HRA__c,
        PF__c: values.PF__c,
        PT__c: values.PT__c,
        SP_All__c: values.SP_All__c
      }

      const res = await fetch(`/api/employees/${employeeId}/salary-history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      const body = await res.json()
      if (!res.ok) {
        throw new Error(body.error || "Failed to create salary history record")
      }

      return body
    },
    onSuccess: () => {
      message.success("Salary history record added")
      setIsModalOpen(false)
      form.resetFields()
      // Set default values after reset for new record
      if (!selectedRecord) {
        form.setFieldsValue({
          PT__c: 200,
          PF__c: 12,
        })
      }
      queryClient.invalidateQueries({ queryKey: ["salary-history", employeeId] })
    },
    onError: (error: Error) => {
      message.error(error.message || "Failed to add salary history record")
    }
  })

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 m-0">
          <History className="w-5 h-5 text-emerald-600" /> Increment History
        </h2>

        {currentUserRole === "Admin" && (
          <Button
            type="primary"
            onClick={() => setIsModalOpen(true)}
            className="!bg-emerald-600 !hover:bg-emerald-700 !border-emerald-600"
          >
            Add Increment Record
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="py-16 flex justify-center">
          <Spin size="large" />
        </div>
      ) : data?.records?.length ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Effective Date</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">End Date</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Change Type</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">Previous Salary</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">Current Salary</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">Security Deposit</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">Increment</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">Increment</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700">Current</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.records.map((record) => (
                <tr
                  key={record.Id}
                  className="hover:bg-slate-50 transition cursor-pointer"
                  onClick={() => handleRecordClick(record)}
                >
                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                    {formatDate(record.Effective_Date__c)}
                  </td>
                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                    {formatDate(record.End_Date__c)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{record.Change_Type__c || "-"}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(record.Previous_Salary__c)}</td>
                  <td className="px-4 py-3 text-right text-slate-800 font-semibold">{formatCurrency(record.Current_Salary__c)}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(record.Security_Deposite__c)}</td>
                  <td className="px-4 py-3 text-right text-emerald-700">{formatCurrency(record.Increment_Amount__c)}</td>
                  <td className="px-4 py-3 text-right text-emerald-700">{formatPercent(record.Increment_Percent__c)}</td>
                  <td className="px-4 py-3 text-center">
                    {record.Is_Current__c ? (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">Yes</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">No</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-50 rounded-xl border-dashed border-2 border-slate-200">
          <DollarSign className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">No salary history records found.</p>
        </div>
      )}

      {data?.records?.length ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-700 font-medium mb-1">Latest Salary</p>
          <p className="text-lg font-semibold text-slate-900">
            {formatCurrency(data.records[0]?.Current_Salary__c)}
          </p>
        </div>
      ) : null}

      <Modal
        title="Increment Record Details"
        open={isDetailsModalOpen}
        width={860}
        centered
        styles={{
          body: {
            maxHeight: "70vh",
            overflowY: "auto",
            overscrollBehavior: "contain",
            paddingRight: 8
          }
        }}
        onCancel={() => {
          setIsDetailsModalOpen(false)
          setSelectedRecord(null)
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setIsDetailsModalOpen(false)
              setSelectedRecord(null)
            }}
          >
            Close
          </Button>
        ]}
        destroyOnHidden
      >
        {selectedRecord ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500 mb-1">Record ID</p>
              <p className="text-sm font-medium text-slate-800 break-all">{selectedRecord.Id || "-"}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500 mb-1">Employee ID</p>
              <p className="text-sm font-medium text-slate-800 break-all">{selectedRecord.Employee__c || "-"}</p>
            </div>

            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500 mb-1">Current Salary</p>
              <p className="text-sm font-medium text-slate-800">{formatCurrency(selectedRecord.Current_Salary__c)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500 mb-1">Previous Salary</p>
              <p className="text-sm font-medium text-slate-800">{formatCurrency(selectedRecord.Previous_Salary__c)}</p>
            </div>

            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500 mb-1">Security Deposit</p>
              <p className="text-sm font-medium text-slate-800">{formatCurrency(selectedRecord.Security_Deposite__c)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500 mb-1">Increment Amount</p>
              <p className="text-sm font-medium text-slate-800">{formatCurrency(selectedRecord.Increment_Amount__c)}</p>
            </div>

            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500 mb-1">Increment Percent</p>
              <p className="text-sm font-medium text-slate-800">{formatPercent(selectedRecord.Increment_Percent__c)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500 mb-1">Current Salary Record</p>
              <p className="text-sm font-medium text-slate-800">{selectedRecord.Is_Current__c ? "Yes" : "No"}</p>
            </div>

            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500 mb-1">Effective Date</p>
              <p className="text-sm font-medium text-slate-800">{formatDate(selectedRecord.Effective_Date__c)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500 mb-1">End Date</p>
              <p className="text-sm font-medium text-slate-800">{formatDate(selectedRecord.End_Date__c)}</p>
            </div>

            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500 mb-1">Change Type</p>
              <p className="text-sm font-medium text-slate-800">{selectedRecord.Change_Type__c || "-"}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500 mb-1">Created Date</p>
              <p className="text-sm font-medium text-slate-800">{formatDate(selectedRecord.CreatedDate)}</p>
            </div>

            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500 mb-1">Basic Console (%)</p>
              <p className="text-sm font-medium text-slate-800">{formatPercent(selectedRecord.Basic_Console__c)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500 mb-1">CONV (%)</p>
              <p className="text-sm font-medium text-slate-800">{formatPercent(selectedRecord.CONV__c)}</p>
            </div>

            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500 mb-1">ESI (%)</p>
              <p className="text-sm font-medium text-slate-800">{formatPercent(selectedRecord.ESI__c)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500 mb-1">HRA (%)</p>
              <p className="text-sm font-medium text-slate-800">{formatPercent(selectedRecord.HRA__c)}</p>
            </div>

            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500 mb-1">PF (%)</p>
              <p className="text-sm font-medium text-slate-800">{formatPercent(selectedRecord.PF__c)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500 mb-1">PT</p>
              <p className="text-sm font-medium text-slate-800">{selectedRecord.PT__c ?? "-"}</p>
            </div>

            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500 mb-1">SP All (%)</p>
              <p className="text-sm font-medium text-slate-800">{formatPercent(selectedRecord.SP_All__c)}</p>
            </div>

            <div className="rounded-lg border border-slate-200 p-3 md:col-span-2">
              <p className="text-xs text-slate-500 mb-1">Description</p>
              <p className="text-sm font-medium text-slate-800 whitespace-pre-wrap">{selectedRecord.Description__c || "-"}</p>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        title="Add Increment History"
        open={isModalOpen}
        width={820}
        centered
        styles={{
          body: {
            maxHeight: "70vh",
            overflowY: "auto",
            overscrollBehavior: "contain",
            paddingRight: 8
          }
        }}
        onCancel={() => {
          setIsModalOpen(false)
          form.resetFields()
        }}
        onOk={() => form.submit()}
        okText="Save Record"
        confirmLoading={createMutation.isPending}
        destroyOnHidden
      >
        <Form<SalaryHistoryFormValues>
          layout="vertical"
          form={form}
          initialValues={{}}
          onFinish={(values) => createMutation.mutate(values)}
          className="space-y-5"
        >
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Selected Employee</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Form.Item label="Employee Name" tooltip="Selected employee is picked automatically from this profile." className="!mb-0">
                <Input value={selectedEmployeeName} disabled className="!font-medium" />
              </Form.Item>

              <Form.Item label="Employee ID" tooltip="This shows the employee's ID, not the record id." className="!mb-0">
                <Input value={selectedEmployeeId} disabled className="!font-medium" />
              </Form.Item>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-4">
            <h4 className="text-sm font-semibold text-emerald-800 mb-3">Salary Inputs</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Form.Item
                label="Current Salary (After Increment)"
                name="Current_Salary__c"
                rules={[{ required: true, message: "Current salary is required" }]}
                className="!mb-2"
              >
                <InputNumber className="!w-full" min={0} step={0.01} placeholder="Enter current salary" />
              </Form.Item>

              <Form.Item
                label="Previous Salary (Before Increment)"
                name="Previous_Salary__c"
                rules={[{ required: true, message: "Previous salary is required" }]}
                className="!mb-2"
              >
                <InputNumber className="!w-full" min={0} step={0.01} placeholder="Enter previous salary" />
              </Form.Item>

              <Form.Item
                label="Security Deposit"
                name="Security_Deposite__c"
                rules={[{ required: true, message: "Security deposit is required" }]}
                className="!mb-2"
                // className="!mb-2 md:col-span-2"
              >
                <InputNumber className="!w-full" min={0} step={0.01} placeholder="Enter security deposit" />
              </Form.Item>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              <Form.Item label="Increment Amount (Auto Calculated)" name="Increment_Amount__c" className="!mb-0">
                <InputNumber className="!w-full" disabled />
              </Form.Item>

              <Form.Item label="Increment Percent (Auto Calculated)" name="Increment_Percent__c" className="!mb-0">
                <InputNumber className="!w-full" disabled />
              </Form.Item>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Salary Change Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Form.Item
                label="Salary Effective From"
                name="Effective_Date__c"
                rules={[{ required: true, message: "Effective date is required" }]}
                className="!mb-2"
              >
                <DatePicker className="!w-full" format="DD/MM/YYYY" />
              </Form.Item>

              <Form.Item
                label="Salary Effective Until"
                name="End_Date__c"
                tooltip="This date is auto-calculated when a new increment record is added."
                className="!mb-2"
              >
                <DatePicker
                  className="!w-full"
                  format="DD/MM/YYYY"
                  disabled
                  placeholder="Auto-calculated"
                />
              </Form.Item>

              <Form.Item
                label="Reason for Salary Increment"
                name="Change_Type__c"
                rules={[{ required: true, message: "Reason for increment is required" }]}
                className="!mb-2"
              >
                <Select
                  placeholder="Select change type"
                  options={data?.changeTypeOptions || []}
                  allowClear
                />
              </Form.Item>

              <Form.Item
                label="Mark as Current Salary"
                name="Is_Current__c"
                rules={[{ required: true, message: "Current salary status is required" }]}
                className="!mb-2"
              >
                <Select
                  options={[
                    { label: "Yes", value: true },
                    { label: "No", value: false }
                  ]}
                  placeholder="Select current salary status"
                />
              </Form.Item>
            </div>

            <Form.Item label="Description" name="Description__c" className="!mb-0">
              <Input.TextArea
                rows={3}
                placeholder="Optional note for this salary change"
                showCount
                maxLength={500}
              />
            </Form.Item>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Salary Components</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Form.Item
                label="Basic Console(%)"
                name="Basic_Console__c"
                rules={[{ required: true, message: "Basic Console is required" }]}
                className="!mb-2"
              >
                <InputNumber className="!w-full" min={0} step={0.01} placeholder="Enter basic console" />
              </Form.Item>

              <Form.Item
                label="Conveyance (CONV)(%)"
                name="CONV__c"
                rules={[{ required: true, message: "Conveyance is required" }]}
                className="!mb-2"
              >
                <InputNumber className="!w-full" min={0} step={0.01} placeholder="Enter conveyance" />
              </Form.Item>

              <Form.Item
                label="ESI(%)"
                name="ESI__c"
                rules={[{ required: true, message: "ESI is required" }]}
                className="!mb-2"
              >
                <InputNumber className="!w-full" min={0} step={0.01} placeholder="Enter ESI" />
              </Form.Item>

              <Form.Item
                label="HRA(%)"
                name="HRA__c"
                rules={[{ required: true, message: "HRA is required" }]}
                className="!mb-2"
              >
                <InputNumber className="!w-full" min={0} step={0.01} placeholder="Enter HRA" />
              </Form.Item>

              <Form.Item
                label="PF(%)"
                name="PF__c"
                rules={[{ required: true, message: "PF is required" }]}
                className="!mb-2"
              >
                <InputNumber className="!w-full" min={0} step={0.01} placeholder="Enter PF" />
              </Form.Item>

              <Form.Item
                label="PT(%)"
                name="PT__c"
                rules={[{ required: true, message: "PT is required" }]}
                className="!mb-2"
              >
                <InputNumber className="!w-full" min={0} step={0.01} placeholder="Enter PT" />
              </Form.Item>

              <Form.Item
                label="SP All(%)"
                name="SP_All__c"
                rules={[{ required: true, message: "SP All is required" }]}
                className="!mb-0 md:col-span-2"
              >
                <InputNumber className="!w-full" min={0} step={0.01} placeholder="Enter special allowance" />
              </Form.Item>
            </div>
          </div>
        </Form>
      </Modal>
    </div>
  )
}
