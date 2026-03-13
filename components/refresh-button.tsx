"use client"

import { Button } from "antd"
import { RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

interface RefreshButtonProps {
  onClick: () => void
  loading?: boolean
  label?: string
  className?: string
}

export function RefreshButton({
  onClick,
  loading = false,
  label = "Refresh",
  className,
}: RefreshButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={loading}
      icon={<RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />}
      className={className}
    >
      {label}
    </Button>
  )
}
