"use client"

import { ReactNode } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  subtitle?: string
  children?: ReactNode // For action buttons
  className?: string
}

export function PageHeader({ title, subtitle, children, className }: PageHeaderProps) {
  return (
    <div className={cn("bg-white border border-gray-100 flex flex-col sm:flex-row gap-4 justify-between mb-3 p-4 rounded-2xl shadow-sm", className)}>
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent dark:from-white dark:to-slate-300">
          {title}
        </h1>
        {subtitle && (
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-base">
            {subtitle}
          </p>
        )}
      </motion.div>
      {children && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-3 items-stretch sm:items-center w-full sm:w-auto justify-end"        >
          {children}
        </motion.div>
      )}
    </div>
  )
}
