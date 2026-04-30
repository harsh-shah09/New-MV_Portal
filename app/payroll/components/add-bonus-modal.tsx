"use client"

import { useState, useEffect } from "react"
import { Modal, Input, Button, message, Form } from "antd"

interface AddBonusModalProps {
  open: boolean
  onClose: () => void
  employeeName: string
  onAdd: (bonusAmount: number) => void
  initialBonus?: number
}

export function AddBonusModal({ open, onClose, employeeName, onAdd, initialBonus }: AddBonusModalProps) {
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
    if (open && initialBonus) {
      form.setFieldsValue({ bonusAmount: String(initialBonus) })
    } else if (open) {
      form.resetFields()
    }
  }, [open, initialBonus, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      
      onAdd(Number(values.bonusAmount))
      message.success(initialBonus ? "Bonus updated successfully" : "Bonus added successfully")
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
      title={`${initialBonus ? 'Edit' : 'Add'} Bonus - ${employeeName}`}
      open={open}
      onCancel={handleClose}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" onClick={handleSubmit} loading={loading}>
          {initialBonus ? 'Update' : 'Add'} Bonus
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        className="py-4"
      >
        <Form.Item
          name="bonusAmount"
          label="Bonus Amount"
          rules={[
            { required: true, message: "Please enter bonus amount" },
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
              form.setFieldsValue({ bonusAmount: sanitizeDigits(pastedValue) })
            }}
            onChange={(event) => {
              form.setFieldsValue({ bonusAmount: sanitizeDigits(event.target.value) })
            }}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
