"use client"

import { useState } from "react"
import { Modal, Select, InputNumber, Input, Button, message, Form } from "antd"
import type { PayrollAdjustment } from "@/types"

interface AddAdjustmentModalProps {
  open: boolean
  onClose: () => void
  employeeName: string
  onAdd: (adjustment: PayrollAdjustment) => void
}

export function AddAdjustmentModal({ open, onClose, employeeName, onAdd }: AddAdjustmentModalProps) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      
      const adjustment: PayrollAdjustment = {
        id: `adj-${Date.now()}`,
        adjustmentType: values.adjustmentType,
        adjustmentAmount: values.adjustmentAmount,
        adjustmentDescription: values.adjustmentDescription,
      }

      onAdd(adjustment)
      message.success("Adjustment added successfully")
      form.resetFields()
      onClose()
    } catch (error) {
      console.error("Validation failed:", error)
    }
  }

  const handleClose = () => {
    form.resetFields()
    onClose()
  }

  return (
    <Modal
      title={`Add Adjustment - ${employeeName}`}
      open={open}
      onCancel={handleClose}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" onClick={handleSubmit} loading={loading}>
          Add Adjustment
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        className="py-4"
      >
        <Form.Item
          name="adjustmentType"
          label="Adjustment Type"
          rules={[{ required: true, message: "Please select adjustment type" }]}
        >
          <Select
            placeholder="Select adjustment type"
            options={[
              { label: "Addition", value: "Addition" },
              { label: "Deduction", value: "Deduction" },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="adjustmentAmount"
          label="Adjustment Amount"
          rules={[
            { required: true, message: "Please enter adjustment amount" },
            { type: "number", min: 0.01, message: "Amount must be greater than 0" },
          ]}
        >
          <InputNumber
            className="w-full"
            placeholder="Enter amount"
            prefix="$"
            min={0}
            precision={2}
          />
        </Form.Item>

        <Form.Item
          name="adjustmentDescription"
          label="Description"
          rules={[{ required: true, message: "Please enter description" }]}
        >
          <Input.TextArea
            placeholder="Enter reason for adjustment"
            rows={3}
            maxLength={500}
            showCount
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
