"use client"

import { useState, useEffect } from "react"
import { Modal, Select, Input, Button, message, Form } from "antd"
import type { PayrollAdjustment } from "@/types"

interface AddAdjustmentModalProps {
  open: boolean
  onClose: () => void
  employeeName: string
  onAdd: (adjustment: PayrollAdjustment) => void
  initialAdjustment?: PayrollAdjustment
}

export function AddAdjustmentModal({ open, onClose, employeeName, onAdd, initialAdjustment }: AddAdjustmentModalProps) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const sanitizeDigits = (value: string) => value.replace(/\D/g, "").slice(0, 6)

  const handleDigitKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const allowedKeys = [
      "Backspace",
      "Delete",
      "Tab",
      "Enter",
      "Escape",
      "ArrowLeft",
      "ArrowRight",
      "Home",
      "End",
    ]

    if (
      allowedKeys.includes(event.key) ||
      (event.ctrlKey || event.metaKey) ||
      /^[0-9]$/.test(event.key)
    ) {
      return
    }

    event.preventDefault()
  }

  useEffect(() => {
    if (open && initialAdjustment) {
      form.setFieldsValue({
        adjustmentType: initialAdjustment.adjustmentType,
        adjustmentAmount: String(initialAdjustment.adjustmentAmount),
        adjustmentDescription: initialAdjustment.adjustmentDescription,
      })
    } else if (open) {
      form.resetFields()
    }
  }, [open, initialAdjustment, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      
      const adjustment: PayrollAdjustment = {
        id: initialAdjustment?.id || `adj-${Date.now()}`,
        adjustmentType: values.adjustmentType,
        adjustmentAmount: values.adjustmentAmount,
        adjustmentDescription: values.adjustmentDescription,
      }

      onAdd(adjustment)
      message.success(initialAdjustment ? "Adjustment updated successfully" : "Adjustment added successfully")
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
      title={`${initialAdjustment ? 'Edit' : 'Add'} Adjustment - ${employeeName}`}
      open={open}
      onCancel={handleClose}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" onClick={handleSubmit} loading={loading}>
          {initialAdjustment ? 'Update' : 'Add'} Adjustment
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
            {
              validator: (_, value) => {
                const normalizedValue = String(value || "")
                if (!/^\d{1,6}$/.test(normalizedValue)) {
                  return Promise.reject(new Error("Enter up to 6 digits only"))
                }
                return Promise.resolve()
              },
            },
          ]}
        >
          <Input
            className="w-full"
            placeholder="Enter amount"
            prefix="₹"
            inputMode="numeric"
            maxLength={6}
            onKeyDown={handleDigitKeyDown}
            onPaste={(event) => {
              event.preventDefault()
              const pastedValue = event.clipboardData.getData("text")
              form.setFieldsValue({ adjustmentAmount: sanitizeDigits(pastedValue) })
            }}
            onChange={(event) => {
              form.setFieldsValue({ adjustmentAmount: sanitizeDigits(event.target.value) })
            }}
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
