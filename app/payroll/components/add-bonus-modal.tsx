"use client"

import { useState, useEffect } from "react"
import { Modal, InputNumber, Input, Button, message, Form } from "antd"

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

  useEffect(() => {
    if (open && initialBonus) {
      form.setFieldsValue({ bonusAmount: initialBonus })
    } else if (open) {
      form.resetFields()
    }
  }, [open, initialBonus, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      
      onAdd(values.bonusAmount)
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
            { type: "number", min: 0.01, message: "Amount must be greater than 0" },
          ]}
        >
          <InputNumber
            className="w-full"
            placeholder="Enter amount"
            prefix="₹"
            min={0}
            precision={2}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
